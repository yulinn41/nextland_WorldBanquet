using System;
using System.Collections.Concurrent;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UI;

// 連線流程：
//   連上後送 {"type":"UNITY_REGISTER"}
//   收到 {"type":"BANNER_DATA","id":…,"dishCode":…} → 下一則 Binary 就是姓名圓弧 PNG
//   排進看板後回報 {"type":"ETA_UPDATE","id":…,"etaSec":…}，手機就會開始倒數
public class WorldBanquetWS : MonoBehaviour
{
    [SerializeField] private string wsUrl = "wss://nextland-worldbanquet.onrender.com";
    [SerializeField] private WorldBanquetBoard board;

    [Header("UI 顯示（選填）")]
    [SerializeField] private Text statusText;

    private const int BUFFER_SIZE = 1024 * 64;
    private const int HEARTBEAT_MS = 30000;
    private const int CONNECT_TIMEOUT_MS = 15000;
    private const int MAX_RETRY_MS = 30000;

    [Serializable]
    private class ServerMessage
    {
        public string type;
        public string id;
        public int dishCode;
    }

    [Serializable]
    private class EtaMessage
    {
        public string type = "ETA_UPDATE";
        public string id;
        public int etaSec;
    }

    private class Incoming
    {
        public string id;
        public int dishCode;
        public byte[] png;
    }

    // 背景執行緒收資料，主執行緒才能碰 Texture，所以中間用佇列交接
    private readonly ConcurrentQueue<Incoming> incoming = new ConcurrentQueue<Incoming>();

    // ClientWebSocket 不能同時送兩則訊息（心跳和回報秒數可能撞在一起），送出前要排隊
    private readonly SemaphoreSlim sendLock = new SemaphoreSlim(1, 1);
    private readonly CancellationTokenSource quit = new CancellationTokenSource();

    private volatile ClientWebSocket ws;
    private volatile string status = "尚未連線";

    void Start()
    {
        if (board == null) board = FindObjectOfType<WorldBanquetBoard>();
        if (board == null) Debug.LogError("[WorldBanquetWS] 場景裡找不到 WorldBanquetBoard！");

        _ = Task.Run(() => ConnectLoop(quit.Token));
    }

    void Update()
    {
        while (incoming.TryDequeue(out Incoming item))
        {
            if (board == null) continue;

            float eta = board.Enqueue(item.dishCode, item.png);
            if (eta < 0f) continue;

            string json = JsonUtility.ToJson(new EtaMessage { id = item.id, etaSec = Mathf.CeilToInt(eta) });
            _ = SendTextAsync(ws, json);
        }

        if (statusText != null) statusText.text = $"WebSocket 狀態：{status}";
    }

    // ---------------------------------------------------------------------
    //  連線（斷線自動重連，等待時間 1、2、4… 秒，最多 30 秒）
    // ---------------------------------------------------------------------

    private async Task ConnectLoop(CancellationToken ct)
    {
        int retryMs = 1000;

        while (!ct.IsCancellationRequested)
        {
            ClientWebSocket socket = new ClientWebSocket();
            ws = socket;
            try
            {
                status = "連線中";
                using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct))
                {
                    timeout.CancelAfter(CONNECT_TIMEOUT_MS);
                    await socket.ConnectAsync(new Uri(wsUrl), timeout.Token);
                }

                await SendTextAsync(socket, "{\"type\":\"UNITY_REGISTER\"}");
                status = "已連線";
                retryMs = 1000;
                Debug.Log("[WorldBanquetWS] 已連線並註冊");

                _ = HeartbeatLoop(socket, ct);
                await ReceiveLoop(socket, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[WorldBanquetWS] 連線中斷：" + ex.Message);
            }
            finally
            {
                socket.Dispose();
            }

            if (ct.IsCancellationRequested) break;

            status = "連線中斷，重新連線中";
            try { await Task.Delay(retryMs, ct); }
            catch (OperationCanceledException) { break; }
            retryMs = Math.Min(retryMs * 2, MAX_RETRY_MS);
        }
    }

    private async Task ReceiveLoop(ClientWebSocket socket, CancellationToken ct)
    {
        byte[] buffer = new byte[BUFFER_SIZE];
        ServerMessage pending = null;   // 收到 BANNER_DATA 後，等下一則 Binary

        while (socket.State == WebSocketState.Open)
        {
            var (msgType, payload) = await ReceiveOneMessageAsync(socket, buffer, ct);

            if (msgType == WebSocketMessageType.Close)
            {
                Debug.Log("[WorldBanquetWS] 伺服器關閉連線");
                return;
            }

            if (msgType == WebSocketMessageType.Text)
            {
                ServerMessage msg = ParseMessage(Encoding.UTF8.GetString(payload));
                if (msg != null && msg.type == "BANNER_DATA") pending = msg;
                continue;
            }

            if (pending == null)
            {
                Debug.LogWarning("[WorldBanquetWS] 收到沒有 BANNER_DATA 的圖片，略過");
                continue;
            }

            incoming.Enqueue(new Incoming { id = pending.id, dishCode = pending.dishCode, png = payload });
            pending = null;
        }
    }

    private ServerMessage ParseMessage(string json)
    {
        try
        {
            return JsonUtility.FromJson<ServerMessage>(json);
        }
        catch (Exception)
        {
            Debug.LogWarning("[WorldBanquetWS] 看不懂的訊息：" + json);
            return null;
        }
    }

    private async Task HeartbeatLoop(ClientWebSocket socket, CancellationToken ct)
    {
        try
        {
            while (socket.State == WebSocketState.Open)
            {
                await Task.Delay(HEARTBEAT_MS, ct);
                await SendTextAsync(socket, "{\"type\":\"PING\"}");
            }
        }
        catch (OperationCanceledException) { }
    }

    private async Task SendTextAsync(ClientWebSocket socket, string text)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(text);
        await sendLock.WaitAsync();
        try
        {
            if (socket == null || socket.State != WebSocketState.Open) return;
            await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
        }
        catch (Exception ex)
        {
            Debug.LogWarning("[WorldBanquetWS] 傳送失敗：" + ex.Message);
        }
        finally
        {
            sendLock.Release();
        }
    }

    private static async Task<(WebSocketMessageType, byte[])> ReceiveOneMessageAsync(
        ClientWebSocket socket,
        byte[] buffer,
        CancellationToken ct)
    {
        using var ms = new MemoryStream(BUFFER_SIZE);
        WebSocketReceiveResult result;
        do
        {
            result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                return (WebSocketMessageType.Close, Array.Empty<byte>());
            }
            ms.Write(buffer, 0, result.Count);
        } while (!result.EndOfMessage);

        return (result.MessageType, ms.ToArray());
    }

    private void OnDestroy()
    {
        // 停止 Play 時一定要停掉背景連線，不然 Editor 裡舊連線還會佔著 Unity 的位子
        quit.Cancel();
    }
}
