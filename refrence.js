function setVh() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVh();
window.addEventListener('resize', () => {

  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
});
/* ============================================================
   ⭐ 字型統一管理（Canvas 專用）
   ============================================================ */
const FONT_WEIGHT_CSS = 500;
const FONT_PX_CSS = 50;
// Canvas 的 font 字串（家族名稱一律用雙引號，iOS Safari 解析最穩）
const FONT_STACK = `"Noto Serif", "Noto Serif TC", serif`;
const CANVAS_FONT = `${FONT_WEIGHT_CSS} ${FONT_PX_CSS}px ${FONT_STACK}`;
// 需要個別確認是否下載完成的家族
const FONT_FAMILIES = [`"Noto Serif TC"`, `"Noto Serif"`];

// 隱藏用的探針元素：某些瀏覽器（尤其 iOS Safari）只有在 DOM 真的用到
// 某個字元時，才會去下載對應的 Google Fonts unicode-range 子集
let fontProbeEl = null;
function getFontProbe() {
  if (fontProbeEl) return fontProbeEl;
  fontProbeEl = document.createElement("span");
  fontProbeEl.setAttribute("aria-hidden", "true");
  fontProbeEl.style.cssText =
    `position:absolute;left:-99999px;top:0;white-space:pre;` +
    `font:${CANVAS_FONT};`;
  document.body.appendChild(fontProbeEl);
  return fontProbeEl;
}

/**
 * 確保「這段文字」用到的字型子集真的載入完成。
 * 注意：document.fonts.ready / fonts.load() 不帶文字時，
 * 只會載入預設測試字串（BESbswy，純英文）所屬的子集，
 * 中文子集不會被載入 → Canvas 就會掉回系統黑體。
 */
async function ensureFontsFor(text) {
  if (!document.fonts || !text) return;

  // 1) 先讓 DOM 真正「用到」這些字，觸發子集下載
  getFontProbe().textContent = text;

  // 2) 明確要求載入包含這些字的子集
  try {
    await Promise.all(
      FONT_FAMILIES.map(fam =>
        document.fonts.load(`${FONT_WEIGHT_CSS} ${FONT_PX_CSS}px ${fam}`, text)
      )
    );
  } catch (e) {
    console.warn("字型載入警告:", e);
  }

  // 3) 保險：若仍未就緒，短暫輪詢等待（最多約 1.5 秒）
  const spec = `${FONT_WEIGHT_CSS} ${FONT_PX_CSS}px ${FONT_FAMILIES[0]}`;
  for (let i = 0; i < 15; i++) {
    try {
      if (document.fonts.check(spec, text)) break;
    } catch (e) { break; }
    await new Promise(r => setTimeout(r, 100));
  }
}

/* ============================================================
   風格設定（字體 / 顏色 / 描邊 / 特效）
   ============================================================ */
const STYLE_CONFIG = {
  classic: {
    font: CANVAS_FONT,
    textColor: "#FFFFFF",

    randomAngle: false,
    randomScale: false,
    rectBg: null,
    customScale: 0.82,
  },

  snow: {
    font: CANVAS_FONT,
    textColor: "#000000",
    outline: [],
    randomAngle: true,
    randomScale: false,
    customScale: 0.75,
  },

  gold: {
    font: CANVAS_FONT,
    textColor: "#000000",
    outline: [],
    randomAngle: false,
    randomScale: false,
    rectBg: null,
    customScale: 0.82,
  },

  pastel: {
    font: CANVAS_FONT,
    textColor: "#FF3FB6",

    randomAngle: false,
    randomScale: false,
    rectBg: null,
    customScale: 0.82,
  }
};
/* ============================================================
   四個 Style 對應的底圖
   ============================================================ */

const STYLE_BG = {
  classic: "/icon/bgpreview_1.png",
  snow: "/icon/bgpreview_2.png",
  gold: "/icon/bgpreview_3.png",
  pastel: "/icon/bgpreview_4.png"
};
/* =====================================================================
   main.js — 主流程、Canvas繪圖、事件處理、WebSocket
   注意：需要 config.js 先載入，以取得 STYLE_CONFIG / STYLE_BG
   ===================================================================== */

/* 全域狀態 */
let currentStyle = "classic";
let currentBg = STYLE_BG["classic"];
let angles = [];
let rectColor = "#1900ff";

/* =====================================================================
   DOM 初始化
   ===================================================================== */
document.addEventListener("DOMContentLoaded", () => {
      window.scrollTo(0, 0)
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.has("admin"); // 網址加 ?admin 才能看到真正頁面
    const now = new Date();
    const hour = now.getHours();


  if (!isAdmin  && (hour < 18 || hour >= 24)) {
    const overlay = document.createElement("div");

    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0,0,0,0.9)";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "999999";
    overlay.style.color = "#fff";
    overlay.style.fontFamily = "Noto Sans TC, sans-serif";
    overlay.style.textAlign = "center";

    overlay.innerHTML = `
            <h1 style="font-size:2rem; ">2026</h1>
             <h1 style="font-size:2rem; margin-bottom:1rem;">嘉義美賣圖鑑</h1>
            <p style="font-size:1.2rem; margin-bottom:1.5rem;">目前尚未開放使用</p>
            <p style="font-size:1rem;">開放時間：晚間 18:00–24:00</p>
        `;

    document.body.appendChild(overlay);
    return;
  }
});
// 重整後強制在最上方
window.addEventListener("load", () => {
  window.scrollTo(0, 0);
});

/* =====================================================================
   UI 控制
   ===================================================================== */
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const page3 = document.getElementById("page3");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const footer = document.querySelector(".footer-credit");
let doneCountdownTimer = null;
let donePageReady = false;

// ===============================
// Done Page 顯示（完成頁）
// ===============================
function showDonePage(blob) {
  const donePage = document.getElementById("donePage");
  const etaSecEl = document.getElementById("etaSec");
  const doneText = document.getElementById("doneText");
  const loading = document.getElementById("doneLoading");
  const success = document.getElementById("doneSuccess");

  if (!donePage || !etaSecEl || !doneText || !loading) {
    console.error("❌ Done Page DOM 不完整");
    return;
  }

  page1.style.display = "none";
  page2.style.display = "none";
  page3.style.display = "none";

  donePage.style.display = "flex";
      window.scrollTo(0,0  );

  etaSecEl.textContent = "--";

  const prefix = document.querySelector("#doneText .done-prefix");
  const suffix = document.querySelector("#doneText .done-suffix");
  if (prefix) prefix.textContent = "正在排程中，請稍候…";
  if (suffix) suffix.textContent = "";

  loading.style.display = "block";
  if (success) success.style.display = "none";

  donePageReady = true;
}
function startDoneCountdown(secFromServer) {
  if (!donePageReady) {
    setTimeout(() => startDoneCountdown(secFromServer), 100);
    return;
  }

  const etaSecEl = document.getElementById("etaSec");
  const doneText = document.getElementById("doneText");
  const loading = document.getElementById("doneLoading");
  const success = document.getElementById("doneSuccess");

  if (!etaSecEl || !doneText || !loading) {
    console.error("❌ Done Page DOM 尚未完整，取消倒數");
    return;
  }

  if (doneCountdownTimer) {
    clearInterval(doneCountdownTimer);
    doneCountdownTimer = null;
  }

  let sec = Math.max(0, Math.floor(secFromServer));

  const prefix = document.querySelector("#doneText .done-prefix");
  const suffix = document.querySelector("#doneText .done-suffix");

  // ⭐ ETA = 0 → 直接成功
  if (sec === 0) {
    if (prefix) prefix.textContent = "你的無聲廣播即將開始進行";
    if (suffix) suffix.textContent = "";
    etaSecEl.textContent = "";

    loading.style.display = "none";
    if (success) success.style.display = "block";
    return;
  }

  // 正常倒數
  etaSecEl.textContent = sec;

  doneCountdownTimer = setInterval(() => {
    sec--;

    if (sec > 0) {
      etaSecEl.textContent = sec;
    } else {
      clearInterval(doneCountdownTimer);
      doneCountdownTimer = null;

      if (prefix) prefix.textContent = "你的無聲廣播已開始進行";
      if (suffix) suffix.textContent = "";
      etaSecEl.textContent = "";

      loading.style.display = "none";
      if (success) success.style.display = "block";
    }
  }, 1000);
}
// ===============================
// 初始化頁面狀態
// ===============================
function initPageState() {
  page1.style.display = "flex";
  page2.style.display = "none";
  page3.style.display = "none";
  document.body.style.overflow = "hidden";
  window.scrollTo(0, 0);
}



// ===============================
// 回到首頁
// ===============================
const backHomeBtn = document.getElementById("backHomeBtn");

backHomeBtn.onclick = () => {
 window.location.reload();
};
// ⭐ 同時綁定手機版與電腦版的所有開始按鈕
document.querySelectorAll(".start-trigger").forEach(btn => {
  btn.onclick = () => {
    page2.style.display = "flex";
    document.body.style.overflow ="auto";
    setTimeout(() => {
      step1.classList.add("step-visible");
      window.scrollTo({
        top: page2.offsetTop,
        behavior: "smooth"
      });
    }, 100);
  };
});
/* =====================================================================
   Style 選擇
   ===================================================================== */

// Step1 → 點風格後，展開 Page3 + Step2 + Footer
document.querySelectorAll(".style-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".style-item")
      .forEach(i => i.classList.remove("selected"));
    item.classList.add("selected");

    // 切換風格
    const style = item.dataset.style;
    currentStyle = style;
    currentBg = STYLE_BG[style];

    drawPreview();

    page3.style.display = "flex";
    setTimeout(() => {
      step2.classList.add("step-visible");
      footer.classList.add("footer-visible");
          window.scrollTo({
        top: page3.offsetTop,
        behavior: "smooth"
      });
    }, 100);
  });
});
/* ============================================================
   隨機角度重算
   ============================================================ */
function recalcAngles(text) {
  // 如果 angles 長度與字串相同 → 不重算（保持原角度）
  if (angles.length === text.length) return;

  // 定義最小差異（弧度制）：例如希望相鄰字至少差 10 度
  const MIN_DIFF_RAD = 8 * Math.PI / 180; 

  // 如果新字變多 → 補上新的角度
  while (angles.length < text.length) {
    let lastAngle = angles.length > 0 ? angles[angles.length - 1] : null;
    let newAngle;
    let attempts = 0;

    // 嘗試產生一個與前一字差異夠大的角度
    do {
      newAngle = (Math.random() * 2 - 1) * FIXED_ANGLE * Math.PI / 180;
      attempts++;
      // 如果是第一個字，或差異大於門檻，或嘗試超過 10 次（避免死循環），就接受這個角度
    } while (
      lastAngle !== null && 
      Math.abs(newAngle - lastAngle) < MIN_DIFF_RAD && 
      attempts < 10
    );

    angles.push(newAngle);
  }

  // 如果字變短 → 截掉多的角度
  if (angles.length > text.length) {
    angles = angles.slice(0, text.length);
  }
}
/* 背景圖快取，避免每次輸入都重新載入 */
const bgCache = {};
function loadBg(src) {
  if (bgCache[src]) return bgCache[src];
  bgCache[src] = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  return bgCache[src];
}

/* 繪圖序號：避免慢的非同步繪製蓋掉新的繪製結果 */
let drawSeq = 0;

async function drawPreview() {
  const mySeq = ++drawSeq;
  const text = inputText.value.trim();
  const cfg = STYLE_CONFIG[currentStyle];

  let bgImg;
  try {
    bgImg = await loadBg(currentBg);
  } catch (e) {
    console.warn("背景圖載入失敗:", currentBg);
    return;
  }

  // ⭐ 關鍵：等「這段文字」的字型子集真的下載完成再畫
  await ensureFontsFor(text);

  // 若期間又有新的輸入，放棄這次繪製
  if (mySeq !== drawSeq) return;

  {
    // 1️⃣ 清空
    pctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

    // 2️⃣ 背景
    pctx.drawImage(bgImg, 0, 0, PREVIEW_W, PREVIEW_H);

    if (!text) return;

    // 3️⃣ 字體設定（若字串無法解析，ctx.font 會被靜默忽略 → 這裡做驗證）
    pctx.font = cfg.font;
    if (!pctx.font || pctx.font.indexOf("Noto") === -1) {
      console.warn("⚠️ Canvas font 設定失敗，實際值:", pctx.font);
      pctx.font = CANVAS_FONT;
    }
    pctx.textBaseline = "middle";

    let spacing = 10;
    let widths = [];
    let totalWidth = 0;

    for (let c of text) {
      const w = pctx.measureText(c).width;
      widths.push(w);
      totalWidth += w + spacing;
    }

    let x = (PREVIEW_W - totalWidth) / 2;
    const y = PREVIEW_H / 2+4;

    const rectBg = cfg.rectBg ?? null;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const w = widths[i];

      const angle = cfg.randomAngle ? angles[i] : 0;
      const scale = cfg.randomScale
        ? (1 + (Math.random() * 0.2 - 0.1))
        : 1;

      pctx.save();
      pctx.translate(x, y);
      pctx.rotate(angle);
      pctx.scale(scale, scale);

      if (rectBg) {
        const rectW = w + 16;
        const rectH = 62;
        pctx.fillStyle = rectBg;
        pctx.fillRect(-8, -rectH / 2, rectW, rectH);
      }

      if (cfg.outline && cfg.outline.length > 0) {
        cfg.outline.forEach(out => {
          pctx.lineWidth = out.width;
          pctx.strokeStyle = out.color;
          pctx.strokeText(c, 0, 0);
        });
      }

      pctx.fillStyle = cfg.textColor;
      pctx.fillText(c, 0, 0);

      pctx.restore();
      x += w + spacing;
    }
  }
}



/* ============================================================
   中文輸入 + 中英混合字數限制(8) + 不雅字過濾（完整整合）
   ============================================================ */
const badWords = [
  "幹", "幹你", "幹你娘", "幹林", "幹爆", "幹勒", "靠北", "靠杯", "靠腰",
  "媽的", "他媽的", "媽啦", "機掰", "雞掰", "雞巴", "雞八", "雞歪", "靠邀", "王八蛋", "王八", "雜種", "畜生", "垃圾",
  "智障", "白癡", "87", "八七", "低能", "低能兒", "腦殘", "死白癡",
  "靠夭", "白目", "王八羔子", "混帳", "混蛋", "死胖子", "死老頭", "臭三八", "臭八婆", "臭男生", "婊子", "婊",
  "賤人", "賤貨", "爛人", "爛貨", "腦包", "乾你娘", "乾你", "乾你爸", "去死", "噁心", "死變態", "娘炮",
  "臭甲", "破麻", "死賤貨", "乞丐", "肥宅", "腦死", "腦殘廢物", "臭雞掰", "雞雞", "幹你娘勒"
];

function containsBadWord(text) {
  return badWords.some(w => text.includes(w));
}
let isComposing = false;
const MAX_LEN = 8;
// 計算中英文混合字數：中文=1，英文=0.5
function calcMixedLength(str) {
  let length = 0;

  for (let ch of str) {
    if (/[^\x00-\x7F]/.test(ch)) {
      length += 1;   // 中文
    } else {
      length += 0.5; // 英文
    }
  }
  return length;
}
// 將輸入字串截斷到混合字數 <= MAX_LEN
function trimToLimit(str, limit = MAX_LEN) {
  let length = 0;
  let result = "";

  for (let ch of str) {
    let add = /[^\x00-\x7F]/.test(ch) ? 1 : 0.5;

    if (length + add > limit) break;

    length += add;
    result += ch;
  }
  return result;
}



/* ============================================================
   Canvas 初始化
   ============================================================ */
const previewCanvas = document.getElementById("previewCanvas");

//Canvas 的真實繪圖解析度
previewCanvas.width = 800;
previewCanvas.height = 100;

// ⭐ 現在才能安全取得正確尺寸
const PREVIEW_W = previewCanvas.width;
const PREVIEW_H = previewCanvas.height;
/* ---------------- 預覽 Canvas ---------------- */
const pctx = previewCanvas.getContext("2d");

const inputText = document.getElementById("inputText");
const countHint = document.getElementById("countHint");
const downloadBtn = document.getElementById("downloadBtn");
const wsBtn = document.getElementById("wsBtn");

const OUTPUT_W = 780;   // ⭐ 你要的固定寬度
const OUTPUT_H = 52;     // ⭐ 固定高度
// PNG 輸出高度
const PREVIEW_FONT_SIZE = 50;     // 大字預覽（固定）
const FIXED_FONT_WEIGHT = 700;
const FIXED_PADDING = 9;
const FIXED_ANGLE = 15;
const FIXED_VARIATION = 0.5;
const FIXED_TEXT_COLOR = "#000000";




/* ============================================================
   處理輸入
   ============================================================ */
function handleInput(text) {

  /* ---------- 不雅字過濾 ---------- */
  if (containsBadWord(text)) {
    alert("請不要輸入不雅文字！");
    text = text.replace(new RegExp(badWords.join("|"), "g"), "＊");
    inputText.value = text;
  }

  /* ---------- 計算混合長度（中1 / 英0.5） ---------- */
  let len = calcMixedLength(text);

  /* ---------- 若超過10字，動態截斷 ---------- */
  if (len > MAX_LEN) {
    countHint.classList.add("over");

    text = trimToLimit(text, MAX_LEN);
    inputText.value = text;
    len = calcMixedLength(text);
  }
  else {
    countHint.classList.remove("over");
  }

  /* ---------- 更新字數提示 ---------- */
  countHint.textContent = `${len} / ${MAX_LEN}`;

  /* ---------- 更新畫面 ---------- */
  recalcAngles(text);
  drawPreview();
}
/* ---------------- INPUT 即時更新 ---------------- */
// ----------------- 中文注音輸入開始 -----------------
inputText.addEventListener("compositionstart", () => {
  isComposing = true;
});

// ----------------- 中文選字完成 -----------------
inputText.addEventListener("compositionend", (e) => {
  isComposing = false;
  handleInput(e.target.value);
});

// ----------------- 英文 / 數字 / 已完成中文字 -----------------
inputText.addEventListener("input", (e) => {
  if (!isComposing) {
    handleInput(e.target.value);
  }
});
/* ---------------- 下載 PNG ---------------- */
if (downloadBtn) {
downloadBtn.onclick = async () => {
  const data = await exportPNG();  // ⭐ 這裡要 await！
  const a = document.createElement("a");
  a.href = data;
  a.download = "output.png";
  a.click();
};
}
/* --- WebSocket Connection Setup (at the beginning of the file) ------------------------------ */
let ws;
let unityConnected = false;

function connectWebSocket() {
  ws = new WebSocket("wss://lostandfound-chiayi2026.onrender.com");
  ws.binaryType = "arraybuffer"; // Ensure browser uses Binary

  ws.onopen = () => console.log("已連接伺服器");
  ws.onclose = () => { console.log("斷線，1 秒後重連"); setTimeout(connectWebSocket, 1000); };
  ws.onerror = err => console.error("WS 錯誤:", err);
  ws.onmessage = ev => {
    if (typeof ev.data !== "string") return;

    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      console.log("📨 非 JSON 訊息:", ev.data);
      return;
    }

    /* ===============================
       Unity 連線狀態
       =============================== */
    if (msg.type === "UNITY_STATUS") {
      unityConnected = msg.connected;
      console.log("LED 連線狀態:", unityConnected);
      return;
    }
if (msg.type === "ETA_UPDATE") {

  // ⭐ 只處理自己的 ETA
  if (msg.id !== clientId) return;

  console.log("📥 ETA for ME:", msg.etaSec);



  startDoneCountdown(msg.etaSec);
}

    console.log("📨 Server 訊息:", msg);
  };

}
connectWebSocket();
const clientId = crypto.randomUUID();


// wsBtn.onclick = () => {

//   // 1️⃣ 沒有輸入內容 → 不可送出
//   const text = inputText.value.trim();
//   if (!text) {
//     alert("請先輸入內容後再傳送");
//     return;
//   }

//   /* 🛠️ 【測試用】暫時略過 LED 裝置斷線檢查
//   if (!ws || ws.readyState !== WebSocket.OPEN || !unityConnected) {
//     alert("LED 裝置斷線中，請稍後再試！");
//     return;
//   }
//   */

//   // 2️⃣ 正常送出（並加入防呆，如果 WS 沒開就直接秀 Done Page 測試畫面）
//   exportPNGblob().then(async blob => {
//     try {
//       const buffer = await blob.arrayBuffer();

//       const header = {
//         type: "HEADER",
//         id: clientId,
//         meta: {
//           style: currentStyle
//         }
//       };

//       // 只有在 WebSocket 有連上時才送出，避免報錯
//       if (ws && ws.readyState === WebSocket.OPEN) {
//         ws.send(JSON.stringify(header));
//         ws.send(buffer);
//       } else {
//         console.warn("⚠️ WebSocket 尚未連線，目前為純前端介面測試模式");
//       }

//       // 🔹 顯示 Done Page
//       showDonePage(blob);
      
//       // 🛠️ 測試用：因為沒有後台回傳 ETA，手動模擬 5 秒後顯示完成動畫
//       startDoneCountdown(5);

//       console.log("📤 [測試模式] 已模擬送出圖片", header);

//     } catch (err) {
//       console.error("❌ 圖片傳送失敗:", err);
//       alert("圖片傳送失敗，請再試一次");
//     }
//   });
// };
/* ============================================================
   WebSocket 傳送（JSON Header + Binary Image）
   ============================================================ */
wsBtn.onclick = () => {

  // ❌ 1️⃣ 沒有輸入內容 → 不可送出
  const text = inputText.value.trim();
  if (!text) {
    alert("請先輸入內容後再傳送");
    return;
  }

  // ❌ 2️⃣ WebSocket / Unity 未就緒
  if (!ws || ws.readyState !== WebSocket.OPEN || !unityConnected) {
    alert("LED 裝置斷線中，請稍後再試！");
    return;
  }

  // ✅ 3️⃣ 正常送出
  exportPNGblob().then(async blob => {
    try {
      const buffer = await blob.arrayBuffer();

      const header = {
        type: "HEADER",
        id: clientId,
        meta: {
          style: currentStyle
        }
      };

      ws.send(JSON.stringify(header));
      ws.send(buffer);


      // 🔹 顯示 Done Page（不影響 WS 流程）
      showDonePage(blob);

      console.log("📤 已送出圖片", header);

    } catch (err) {
      console.error("❌ 圖片傳送失敗:", err);
      alert("圖片傳送失敗，請再試一次");
    }
  });
};

// ===============================
// 52px LED 專用參數
// ===============================
// ===============================
// 52px LED 專用參數（穩定版）
// ===============================
const TARGET_TEXT_SCALE = 0.82; // 字大小（0.78 ~ 0.88）
const BASELINE_FIX = 2;         // 垂直微調（-2 ~ +6）
const RECT_PADDING = 10;        // 矩形左右 padding（16~28）

function renderLedCanvas(ctx, opts) {
  const { text, style, width, height, angles } = opts;
  if (!text) return;

  const cfg = STYLE_CONFIG[style];
  const scale = cfg.customScale || TARGET_TEXT_SCALE;

  // 清空
  ctx.clearRect(0, 0, width, height);

  // 基本文字設定（驗證 font 是否成功套用）
  ctx.font = cfg.font;
  if (!ctx.font || ctx.font.indexOf("Noto") === -1) {
    console.warn("⚠️ LED Canvas font 設定失敗，實際值:", ctx.font);
    ctx.font = CANVAS_FONT;
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const rectBg = cfg.rectBg ?? cfg.rectBG ?? cfg.rectBgColor ?? null;

  // 計算字寬（未 scale）
  const spacing = 10;
  const widths = [];
  let totalWidth = 0;

  for (let c of text) {
    const w = ctx.measureText(c).width;
    widths.push(w);
    totalWidth += w + spacing;
  }


  const scaledTotalW = totalWidth * scale;
  const startX = (width - scaledTotalW) / 2;
  const centerY = height / 2 + BASELINE_FIX;

  // 單側繪製
  function drawBlock(baseX) {
    let x = baseX;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const angle = cfg.randomAngle ? angles[i] : 0;

      ctx.save();
      ctx.translate(x, centerY);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      // ⭐ LED 安全矩形高度（一定 <= 52px）
      // 字體高度（從 font 50px 抓）
      const FONT_PX = PREVIEW_FONT_SIZE; // 50

      // 矩形高度 = 字高 + 上下 padding（與 preview 比例一致）
      const LED_RECT_H = Math.min(
        FONT_PX + 3,           // ⭐ 與 preview 的 62px 對齊感
        height / scale - 2      // ⭐ LED 安全上限
      );

      // 背景矩形（與文字同座標系）
      if (rectBg) {
        ctx.fillStyle = rectBg;
        ctx.fillRect(
          -RECT_PADDING / 2,
          -LED_RECT_H / 2,
          widths[i] + RECT_PADDING,
          LED_RECT_H
        );
      }

      // 外框
      if (cfg.outline && cfg.outline.length > 0) {
        cfg.outline.forEach(out => {
          ctx.lineWidth = out.width;
          ctx.strokeStyle = out.color;
          ctx.strokeText(c, 0, 0);
        });
      }

      // 文字
      ctx.fillStyle = cfg.textColor;
      ctx.fillText(c, 0, 0);

      ctx.restore();

      // 前進 x（只在外層乘 scale）
      x += (widths[i] + spacing) * scale;
    }
  }

  // 左 / 右各畫一次
  drawBlock(startX);

}

async function exportPNG() {
  const outText = inputText.value.trim();
  await ensureFontsFor(outText);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_W;
  canvas.height = OUTPUT_H;

  const ctx = canvas.getContext("2d");

  renderLedCanvas(ctx, {
    text: outText,
    style: currentStyle,
    width: OUTPUT_W,
    height: OUTPUT_H,
    angles
  });

  return canvas.toDataURL("image/png");
}
async function exportPNGblob() {
  // ⭐ 送出前再確認一次字型，避免傳給 LED 的 PNG 是系統黑體
  const outText = inputText.value.trim();
  await ensureFontsFor(outText);

  return new Promise(resolve => {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;

    const ctx = canvas.getContext("2d");

    renderLedCanvas(ctx, {
      text: outText,
      style: currentStyle,
      width: OUTPUT_W,
      height: OUTPUT_H,
      angles
    });

    canvas.toBlob(blob => resolve(blob), "image/png");
  });
}

initPageState();
/* 初始化 */
// 確保字型完全載入後再進行首次繪製
if (document.fonts) {
  // 預熱常用中文字（讓多數子集先下載起來）
  ensureFontsFor("嘉義美賣圖鑑無聲廣播").then(() => drawPreview());

  // ⭐ Canvas 不像 DOM 文字會在字型到達後自動重繪，
  //    所以只要有新的字型子集載入完成，就重畫一次。
  document.fonts.addEventListener("loadingdone", () => {
    drawPreview();
  });
} else {
  // 舊版瀏覽器向下相容
  window.addEventListener("load", () => {
    drawPreview();
  });
}

// 從背景切回前景時（iOS 常見）補畫一次
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) drawPreview();
});