using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Serialization;
using UnityEngine.UI;

// 宴席看板：Canvas 上有固定的座位，每個座位 = 一張料理圖 + 一張姓名圓弧圖（位置各自擺）
//   1. 所有料理（含隱藏料理）共用同一組座位
//   2. 有空位先放空位；沒空位就取代「放置最久」的那個座位
//   3. 每張至少完整顯示 minShowSeconds 秒才能被取代；還沒到就排隊等
//   4. 收到的姓名圖都存到 persistentDataPath/WorldBanquetImages，重開時把最新的放回座位
//      檔名：Image_時間_code料理代碼_流水號.png；按 U 開啟資料夾
public class WorldBanquetBoard : MonoBehaviour
{
    [Serializable]
    public class Slot
    {
        public RawImage dishImage;
        public RawImage nameImage;

        [NonSerialized] public Texture2D nameTexture;
        [NonSerialized] public bool hasImage;
        [NonSerialized] public float readyAt;   // 這個時間之後才能被取代（空位 = 0，所以一定最先被選到）
    }

    private class Job
    {
        public Texture dish;
        public byte[] namePng;
    }

    [Header("料理圖片")]
    [Tooltip("依料理代碼排列：Element 0 = 代碼 1（日式炸豬排）… Element 9 = 代碼 10（法式紅酒燉豬肉）")]
    public List<Texture2D> dishImages = new List<Texture2D>();

    [Header("座位（料理圖、姓名圖各拉一個 RawImage）")]
    [FormerlySerializedAs("normalSlots")]
    public Slot[] slots = new Slot[8];

    [Header("節奏")]
    [Tooltip("每張至少完整顯示幾秒才能被取代")]
    public float minShowSeconds = 10f;
    [Tooltip("換圖時淡出、淡入各幾秒，0 = 直接換")]
    public float fadeSeconds = 0.5f;

    [Header("存檔")]
    [Tooltip("勾選：開啟時把資料夾裡最新的圖放回座位（活動前記得清掉測試用的圖）")]
    public bool restoreOnStart = true;

    private static readonly Regex SavedFileName = new Regex(@"^Image_.*_code(\d+)_\d+\.png$", RegexOptions.IgnoreCase);

    private readonly Queue<Job> queue = new Queue<Job>();
    private string saveFolder;
    private int saveCounter = 0;

    void Awake()
    {
        foreach (Slot slot in slots)
        {
            if (slot.dishImage == null || slot.nameImage == null)
            {
                Debug.LogError("[WorldBanquetBoard] 有座位沒有拉 RawImage！");
                continue;
            }
            slot.nameTexture = new Texture2D(2, 2, TextureFormat.RGBA32, true);
            slot.nameTexture.wrapMode = TextureWrapMode.Clamp;
            slot.nameImage.texture = slot.nameTexture;
            SetAlpha(slot, 0f);
        }

        saveFolder = Path.Combine(Application.persistentDataPath, "WorldBanquetImages");
        try
        {
            Directory.CreateDirectory(saveFolder);
            if (restoreOnStart) RestoreSaved();
        }
        catch (Exception ex)
        {
            Debug.LogError("[WorldBanquetBoard] 存檔資料夾無法使用：" + ex.Message);
        }
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.U))
        {
            Application.OpenURL(saveFolder); // 開啟資料夾
        }

        Process();
    }

    // ---------------------------------------------------------------------
    //  收到新圖片（WorldBanquetWS 在主執行緒呼叫）
    // ---------------------------------------------------------------------

    /// <summary>排進佇列，回傳預計幾秒後出現；料理代碼不對或沒有座位時回傳 -1</summary>
    public float Enqueue(int dishCode, byte[] namePng)
    {
        Texture dish = DishTexture(dishCode);
        if (dish == null)
        {
            Debug.LogError($"[WorldBanquetBoard] 料理代碼 {dishCode} 在 dishImages 裡沒有圖片");
            return -1f;
        }

        if (slots.Length == 0)
        {
            Debug.LogError("[WorldBanquetBoard] 沒有座位");
            return -1f;
        }

        if (!IsPng(namePng))
        {
            Debug.LogWarning("[WorldBanquetBoard] 收到的不是 PNG，略過");
            return -1f;
        }

        SaveImage(dishCode, namePng);

        float eta = EstimateSeconds();
        queue.Enqueue(new Job { dish = dish, namePng = namePng });
        Debug.Log($"[WorldBanquetBoard] 代碼 {dishCode} 排進佇列，前面 {queue.Count - 1} 張，約 {eta:F1} 秒後出現");
        return eta;
    }

    private Texture DishTexture(int dishCode)
    {
        int index = dishCode - 1;
        return index >= 0 && index < dishImages.Count ? dishImages[index] : null;
    }

    private static bool IsPng(byte[] data)
    {
        return data != null && data.Length > 8
            && data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47;
    }

    // ---------------------------------------------------------------------
    //  存檔 / 重開還原
    // ---------------------------------------------------------------------

    private void SaveImage(int dishCode, byte[] png)
    {
        try
        {
            saveCounter++;
            string fileName = $"Image_{DateTime.Now:yyyyMMdd_HHmmss_fff}_code{dishCode:D2}_{saveCounter:D4}.png";
            File.WriteAllBytes(Path.Combine(saveFolder, fileName), png);
        }
        catch (Exception ex)
        {
            Debug.LogError("[WorldBanquetBoard] 圖片保存錯誤：" + ex.Message);   // 存不了也照樣上座位
        }
    }

    // 從最新的往回找，只取座位數量的張數，再依舊到新排回去：之後會先換掉最舊的
    private void RestoreSaved()
    {
        string[] files = Directory.GetFiles(saveFolder, "Image_*.png");
        Array.Sort(files, StringComparer.Ordinal);   // 檔名開頭是時間，排序 = 時間先後

        var picked = new Stack<Job>();

        for (int i = files.Length - 1; i >= 0 && picked.Count < slots.Length; i--)
        {
            Match match = SavedFileName.Match(Path.GetFileName(files[i]));
            if (!match.Success || !int.TryParse(match.Groups[1].Value, out int dishCode)) continue;

            Texture dish = DishTexture(dishCode);
            if (dish == null) continue;

            try
            {
                byte[] png = File.ReadAllBytes(files[i]);
                if (IsPng(png)) picked.Push(new Job { dish = dish, namePng = png });
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[WorldBanquetBoard] 讀不到 {files[i]}：{ex.Message}");
            }
        }

        while (picked.Count > 0) queue.Enqueue(picked.Pop());
        Debug.Log($"[WorldBanquetBoard] 還原 {queue.Count} 張");
    }

    // ---------------------------------------------------------------------
    //  輪替
    // ---------------------------------------------------------------------

    private void Process()
    {
        float now = Time.unscaledTime;
        while (queue.Count > 0)
        {
            Slot slot = OldestSlot();
            if (slot.readyAt > now) return;   // 最久的那張都還沒滿秒數

            Job job = queue.Dequeue();
            float fadeOut = slot.hasImage ? fadeSeconds : 0f;
            slot.readyAt = now + fadeOut + fadeSeconds + minShowSeconds;
            slot.hasImage = true;
            StartCoroutine(Swap(slot, job, fadeOut));
        }
    }

    // readyAt 最小 = 空位，或放置最久的座位
    private Slot OldestSlot()
    {
        Slot oldest = slots[0];
        foreach (Slot slot in slots)
        {
            if (slot.readyAt < oldest.readyAt) oldest = slot;
        }
        return oldest;
    }

    // 模擬排在前面的圖片一張張放上去，算出新的一張什麼時候出現
    private float EstimateSeconds()
    {
        float now = Time.unscaledTime;
        int count = slots.Length;
        float[] ready = new float[count];
        bool[] occupied = new bool[count];
        for (int i = 0; i < count; i++)
        {
            ready[i] = slots[i].readyAt;
            occupied[i] = slots[i].hasImage;
        }

        for (int ahead = queue.Count; ; ahead--)
        {
            int k = 0;
            for (int i = 1; i < count; i++)
            {
                if (ready[i] < ready[k]) k = i;
            }

            float placeAt = Mathf.Max(now, ready[k]);
            float fadeOut = occupied[k] ? fadeSeconds : 0f;
            if (ahead == 0) return placeAt + fadeOut - now;

            ready[k] = placeAt + fadeOut + fadeSeconds + minShowSeconds;
            occupied[k] = true;
        }
    }

    private IEnumerator Swap(Slot slot, Job job, float fadeOut)
    {
        if (fadeOut > 0f) yield return Fade(slot, 1f, 0f, fadeOut);

        slot.dishImage.texture = job.dish;
        bool nameOk = slot.nameTexture.LoadImage(job.namePng);
        if (!nameOk) Debug.LogWarning("[WorldBanquetBoard] 姓名圖片讀取失敗，這張只顯示料理");
        slot.nameImage.enabled = nameOk;

        if (fadeSeconds > 0f) yield return Fade(slot, 0f, 1f, fadeSeconds);
        SetAlpha(slot, 1f);
    }

    private IEnumerator Fade(Slot slot, float from, float to, float duration)
    {
        float t = 0f;
        while (t < duration)
        {
            t += Time.unscaledDeltaTime;
            SetAlpha(slot, Mathf.Lerp(from, to, t / duration));
            yield return null;
        }
    }

    private void SetAlpha(Slot slot, float a)
    {
        Color c = slot.dishImage.color;
        c.a = a;
        slot.dishImage.color = c;

        c = slot.nameImage.color;
        c.a = a;
        slot.nameImage.color = c;
    }

    private void OnDestroy()
    {
        foreach (Slot slot in slots)
        {
            if (slot.nameTexture != null) Destroy(slot.nameTexture);
        }
    }
}
