/* =========================================================
   A. 圖片素材（全部放在 assets/ 資料夾）
      圖片還沒放進去時，畫面會顯示檔名色塊，放進去就自動出現
   ========================================================= */
const DIR = 'assets/';
const ASSETS = {
  // 全站
  logo:'logo.png',
  btnHome:'btn-home.png', btnReturn:'btn-return.png',
  bgHome:'bg-home.png',       // 背景 1：首頁
  bgChoose:'bg-choose.png',   // 背景 2：環繞菜色、STEP1 選菜
  bgStep:'bg-step.png',       // 背景 3：STEP2 ～ 結果頁
  // ① 首頁
  homeTitle:'title-home.png', homeTable:'ill-home-table.png', btnStart:'btn-start.png',
  // ② 環繞菜色
  introCenter:'intro-center.png', btnChoose:'btn-choose.png',
  // ③ STEP1
  head1:'title-step-1.png', lineBanner:'banner-line-unlock.png', vipCard:'card-vip-cover.png', lockImg:'icon-lock-vip.png',
  // ④ STEP2
  head2:'title-step-2.png', btnToIngr:'btn-to-ingr.png',
  // ⑤ STEP3
  head3:'title-step-3.png', btnFinish:'btn-finish.png', btnFinishOff:'btn-finish-disabled.png',
  // ⑥ STEP4
  head4:'title-step-4.png', chefTip:'tip-chef-input.png', btnServe:'btn-serve.png', btnServeOff:'btn-serve-disabled.png',
  // ⑦ 結果
  btnDownload:'btn-download.png',
  shareCardBg:'share-card-bg.png',   // 1080×1920，含框、logo、Award、底部色塊
  shareLogo:'share-logo.png',        // 沒有 share-card-bg 時才會用到
};
for (const k in ASSETS) ASSETS[k] = DIR + ASSETS[k];

/* 每頁用哪張背景 */
const SCREEN_BG = { home:'bgHome', intro:'bgChoose', choose:'bgChoose', detail:'bgStep', ingr:'bgStep', sign:'bgStep', cook:'bgStep', wait:'bgStep', result:'bgStep' };
/* 右上「上一頁」的去處（等待頁沒有上一頁：料理已送出，不回到輸入暱稱重送） */
const BACK = { intro:'home', choose:'intro', detail:'choose', ingr:'detail', sign:'ingr', result:'wait' };

const LINE_URL = '#'; // 之後放良作 LINE 加好友連結

/* =========================================================
   B. 料理資料 —— 來自 data.js（改 data.js 就好，不用改這裡）
   ========================================================= */
function buildDishes(data){
  if (!data) throw new Error('找不到 data.js，或 data.js 有語法錯誤（按 F12 看主控台第一個紅字）');
  const ING = data.ingredients || {}, problems = [];
  const pick = (ids, ok, dish) => (ids || []).map(id => {
    const g = ING[id];
    if (!g){ problems.push(`「${dish}」用到不存在的食材代號：${id}`); return null; }
    return { id, n: g.zh, e: g.en, ok, img: DIR + 'Ingredients/' + (g.img || `ingr-${id}.png`) };
  }).filter(Boolean);

  const dishes = (data.dishes || []).map(d => {
    const ingredients = [...pick(d.correct, true, d.name), ...pick(d.wrong, false, d.name)];
    if (!d.correct?.length) problems.push(`「${d.name}」沒有正確食材，會無法過關`);
    const both = (d.correct || []).filter(id => (d.wrong || []).includes(id));
    if (both.length) problems.push(`「${d.name}」的 ${both.join('、')} 同時在 correct 和 wrong`);
    if (d.code == null) problems.push(`「${d.name}」沒有料理代碼 code`);
    else if (data.dishes.some(o => o !== d && o.code === d.code)) problems.push(`「${d.name}」的料理代碼 ${d.code} 重複`);
    return {
      id: d.id, code: d.code, name: d.name, en: d.en || '', secret: !!d.secret,
      feature: d.feature || '', story: d.story || '',
      img:      DIR + 'food/'  + (d.img      || `dish-${d.id}.png`),                  // 料理插圖
      nameImg:  DIR +            (d.nameImg  || `title-${d.id}.png`),                 // 料理名稱字圖
      infoImg:  DIR + 'info/'  + (d.infoImg  || `info-${d.id}.png`),                  // STEP2 特色＋故事字圖
      awardImg: DIR + 'Award/' + (d.awardImg || `world-banquet-Award-${d.id}.png`),   // 結果頁分享卡底圖（只差暱稱）
      ingredients,
    };
  });
  if (problems.length){ console.warn('data.js 需要檢查：\n' + problems.join('\n')); setTimeout(() => toast(`料理資料有 ${problems.length} 個問題，請按 F12 看主控台`), 300); }
  console.table(dishes.map(d => ({ 料理: d.name, 食材數: d.ingredients.length, 正確: d.ingredients.filter(x => x.ok).length })));
  return dishes;
}
let DISHES = [];

/* =========================================================
   C. 狀態
   ========================================================= */
const state = { screen:'home', dish:null, order:[], picked:new Set(), chef:'', unlocked:false, cardBlob:null, cardUrl:'' };

/* =========================================================
   D. 工具
   ========================================================= */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const media = (src, alt = '') =>
  `<img class="media" src="${src}" alt="${esc(alt)}" draggable="false">`;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const restartAnim = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

let toastTimer;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* 按鈕可用 / 停用：有停用圖就換圖，沒有就自動變灰 */
function setBtnEnabled(btn, on, offKey){
  btn.setAttribute('aria-disabled', on ? 'false' : 'true');
  const img = btn.querySelector('img');
  if (!img) return;
  if (offKey && !btn.dataset.noOff){
    const want = on ? ASSETS[btn.dataset.asset] : ASSETS[offKey];
    if (img.getAttribute('src') !== want){
      img.onerror = () => {               // 停用圖還沒做 → 改用原圖變灰
        img.onerror = null; btn.dataset.noOff = '1';
        btn.classList.add('no-off-img'); img.src = ASSETS[btn.dataset.asset];
      };
      img.src = want;
    }
  } else {
    btn.classList.add('no-off-img');
  }
}

/* 把 ASSETS 填進有 data-asset 的元素 */
function applyAssets(){
  document.querySelectorAll('[data-asset]').forEach(el => {
    el.innerHTML = `<img src="${ASSETS[el.dataset.asset]}" alt="${esc(el.dataset.alt || '')}" draggable="false">`;
  });
  document.querySelectorAll('[data-bg]').forEach(el => {
    el.style.backgroundImage = `url("${ASSETS[el.dataset.bg]}")`;
  });
}
function showBg(id){
  const key = SCREEN_BG[id];
  document.querySelectorAll('[data-bg]').forEach(el => el.classList.toggle('show', el.dataset.bg === key));
}

/* =========================================================
   E. 100vh 修正（--vh）
   ========================================================= */
function setVh(){
  // 輸入暱稱時鍵盤彈出會縮小 innerHeight，這時不更新，避免版面被壓扁
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
setVh();
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', () => setTimeout(setVh, 300));

/* =========================================================
   F. 頁面切換
   ========================================================= */
const onEnter = {
  choose: renderChoose,
  detail: renderDetail,
  ingr:   renderIngr,
  sign:   renderSign,
  result: renderResult,
};
function go(id, { back = false } = {}){
  const cur = $(`#s-${state.screen}`), next = $(`#s-${id}`);
  if (!next || cur === next) return;
  if (!back) onEnter[id]?.();               // 返回上一頁時保留原本的選擇
  cur.classList.remove('active');
  next.classList.add('active');
  if (!back) next.querySelector('.screen-body').scrollTop = 0;
  state.screen = id;
  showBg(id);
  const atHome = id === 'home';
  $('#btnHome').setAttribute('aria-disabled', atHome);
  $('#btnBack').setAttribute('aria-disabled', !BACK[id]);
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') !== 'true') go(b.dataset.go); }));

function resetAll(){
  clearWait();
  Object.assign(state, { dish:null, picked:new Set(), chef:'', cardBlob:null });
  if (state.cardUrl) URL.revokeObjectURL(state.cardUrl);
  state.cardUrl = '';
  $('#nameInput').value = '';
  go('home');
}
$('#btnHome').addEventListener('click', resetAll);
$('#btnBack').addEventListener('click', () => { nameInput.blur(); if (BACK[state.screen]) go(BACK[state.screen], { back:true }); });

/* =========================================================
   G. ② 環繞菜色（以中心為圓心旋轉）
   ========================================================= */
function buildRing(){
  const ring = $('#ring'), n = DISHES.length, R = 41; // R = 半徑（容器 %）
  ring.innerHTML = DISHES.map((d, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rot = (i / n) * 360;            // 正上方 0°，順時針遞增 → 放射狀
    return `<div class="ring-item" style="left:${50 + R * Math.cos(a)}%;top:${50 + R * Math.sin(a)}%;--rot:${rot}deg">
      <div class="inner">${media(d.img, d.name)}</div></div>`;
  }).join('');
}

/* =========================================================
   H. ③ STEP1 選菜 + 隱藏菜單
   ========================================================= */
function renderChoose(){
  $('#dishGrid').innerHTML = DISHES.map(d => {
    const locked = d.secret && !state.unlocked;
    return `<button class="dish-card${locked ? ' locked' : ''}" data-id="${d.id}">
      <div class="thumb">${locked ? media(ASSETS.vipCard, '神秘隱藏版') : media(d.img, d.name)}</div>
      <div class="name-tag">${locked ? '<b>神秘隱藏版</b><small>Mystery Menu</small>' : `<b>${d.name}</b><small>${d.en}</small>`}</div>
    </button>`;
  }).join('');
  $('#lineBanner').hidden = state.unlocked;
}
$('#dishGrid').addEventListener('click', e => {
  const card = e.target.closest('.dish-card'); if (!card) return;
  const d = DISHES.find(x => x.id === card.dataset.id);
  if (d.secret && !state.unlocked) return openModal('modalLine');
  state.dish = d;
  go('detail');
});
$('#lineBanner').addEventListener('click', () => openModal('modalLine'));
$('#btnJoinLine').href = LINE_URL;

/* 解鎖成功（之後串會員時，在驗證成功後呼叫 unlockSecret() 即可） */
function unlockSecret(){
  state.unlocked = true;
  closeModal('modalLine');
  $('#flipRow').innerHTML = DISHES.filter(d => d.secret).map(d => `
    <div class="flip"><div class="flip-inner">
      <div class="flip-face front">${media(ASSETS.vipCard, 'VIP')}</div>
      <div class="flip-face back">${media(d.img, d.name)}</div>
    </div></div>`).join('');
  setTimeout(() => openModal('modalUnlocked'), 250);
  renderChoose();
}
$('#devUnlock').addEventListener('click', unlockSecret);

/* =========================================================
   I. ④ STEP2 認識料理
   ========================================================= */
const titleHTML = d => `<img src="${d.nameImg}" alt="${esc(d.name + ' ' + d.en)}" draggable="false">`;
function renderDetail(){
  const d = state.dish;
  $('#detailImg').innerHTML = media(d.img, d.name);
  $('#detailTitle').innerHTML = titleHTML(d);
  $('#detailInfo').innerHTML = `<img src="${d.infoImg}" alt="${esc(`料理特色：${d.feature} 料理故事：${d.story}`)}" draggable="false">`;
}

/* =========================================================
   J. ⑤ STEP3 選食材 + 餐盤動畫
   ========================================================= */
const correctList = () => state.dish.ingredients.filter(x => x.ok);
function slotPos(k, n){
  if (n === 1) return { x:50, y:50 };
  const a = (k / n) * Math.PI * 2 - Math.PI / 2, r = 30;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}
function renderIngr(){
  const d = state.dish;
  state.picked = new Set();
  state.order = shuffle(d.ingredients);
  $('#ingrTitle').innerHTML = titleHTML(d);
  $('#plateDish').innerHTML = media(d.img, d.name);
  $('#plate').classList.remove('done');
  $('#plate').querySelectorAll('.chip').forEach(c => c.remove());
  $('#ingrGrid').innerHTML = state.order.map((g, i) => `
    <button class="ingr-card" data-i="${i}">
      <div class="thumb">${media(g.img, g.n)}</div>
      <div><b>${g.n}</b><small>${g.e}</small></div>
    </button>`).join('');
  // 預設捲到所有食材卡的正中間
  const grid = $('#ingrGrid');
  requestAnimationFrame(() => grid.scrollLeft = (grid.scrollWidth - grid.clientWidth) / 2);
  updatePick();
}
function updatePick(){
  const need = correctList().length, got = state.picked.size, done = got === need;
  setBtnEnabled($('#btnFinish'), done, 'btnFinishOff');
  $('#plate').classList.toggle('done', done);
  return done;
}
function flyTo(srcEl, plate, pos){
  const r = srcEl.getBoundingClientRect(), p = plate.getBoundingClientRect();
  const size = p.width * 0.36;
  const tx = p.left + p.width * pos.x / 100, ty = p.top + p.height * pos.y / 100;
  const clone = srcEl.cloneNode(true);
  clone.classList.add('fly');
  Object.assign(clone.style, { left:r.left + 'px', top:r.top + 'px', width:r.width + 'px', height:r.height + 'px' });
  document.body.appendChild(clone);
  const dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2), s = size / r.width;
  const anim = clone.animate(
    [{ transform:'translate(0,0) scale(1)' }, { transform:`translate(${dx}px,${dy - 40}px) scale(${s * 1.1})`, offset:.7 }, { transform:`translate(${dx}px,${dy}px) scale(${s})` }],
    { duration:600, easing:'cubic-bezier(.5,0,.3,1)' });
  return anim.finished.catch(() => {}).then(() => clone.remove());
}
/* 食材框：電腦上可用滑鼠拖曳或滾輪左右捲動 */
(() => {
  const el = $('#ingrGrid');
  el.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)){ el.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive:false });
  let down = null, moved = false;
  el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = { x:e.clientX, left:el.scrollLeft }; moved = false; });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 5){ moved = true; el.classList.add('dragging'); }
    if (moved) el.scrollLeft = down.left - dx;
  });
  window.addEventListener('pointerup', () => { down = null; el.classList.remove('dragging'); });
  el.addEventListener('click', e => { if (moved){ e.stopImmediatePropagation(); moved = false; } }, true);
})();

$('#ingrGrid').addEventListener('click', e => {
  const card = e.target.closest('.ingr-card'); if (!card) return;
  const i = +card.dataset.i, g = state.order[i], plate = $('#plate');

  // 再點一次 = 取消
  if (state.picked.has(i)){
    state.picked.delete(i);
    card.classList.remove('selected');
    plate.querySelector(`.chip[data-i="${i}"]`)?.remove();
    updatePick();
    return;
  }
  // 選錯 → 搖動 + 提示
  if (!g.ok){
    restartAnim(card, 'shake');
    card.classList.add('wrong');
    setTimeout(() => card.classList.remove('wrong'), 600);
    navigator.vibrate?.(80);
    toast(`「${g.n}」不是${state.dish.name}的食材喔，再想想！`);
    return;
  }
  // 選對 → 飛進餐盤
  state.picked.add(i);
  card.classList.add('selected');
  const list = correctList(), k = list.indexOf(g), pos = slotPos(k, list.length);
  flyTo(card.querySelector('.thumb > *'), plate, pos).then(() => {
    if (!state.picked.has(i)) return;           // 飛行中被取消
    const chip = document.createElement('div');
    chip.className = 'chip'; chip.dataset.i = i;
    chip.style.left = pos.x + '%'; chip.style.top = pos.y + '%';
    chip.innerHTML = media(g.img, g.n);
    plate.appendChild(chip);
    if (updatePick()) toast('食材到齊，料理完成！');
  });
});
$('#btnFinish').addEventListener('click', e => {
  const btn = e.currentTarget;
  if (btn.getAttribute('aria-disabled') === 'true'){
    restartAnim(btn, 'shake');
    toast(`還差 ${correctList().length - state.picked.size} 樣食材喔`);
    return;
  }
  go('sign');
});

/* =========================================================
   K. ⑥ STEP4 大廚暱稱（6 字內，支援注音輸入法）
   ========================================================= */
// 中文佔 2 格、半形英數佔 1 格：最多 6 個中文或 12 個英文，一半的格子寬度也剛好是一半
const NAME_UNITS = 12;
const nameUnits = ch => /^[\x00-\xff]$/.test(ch) ? 1 : 2;
function fitName(v){
  const chars = []; let used = 0;
  for (const ch of v){
    used += nameUnits(ch);
    if (used > NAME_UNITS) break;
    chars.push(ch);
  }
  return chars;
}
const nameInput = $('#nameInput'), slotsEl = $('#slots');
let composing = false;

function renderSign(){
  const d = state.dish, list = correctList(), n = list.length;
  const floats = list.map((g, k) => {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
    const x = 50 + 30 * Math.cos(a), y = 50 + 36 * Math.sin(a);   // 離中心的距離（%）
    return `<div class="float" style="left:${x}%;top:${y}%;animation-delay:${-k * .5}s">${media(g.img, g.n)}</div>`;
  }).join('');
  $('#orbit').innerHTML = `<div class="center-dish">${media(d.img, d.name)}</div>${floats}`;
  $('#signTitle').innerHTML = titleHTML(d);
  renderSlots(state.chef);
  setBtnEnabled($('#btnServe'), !!state.chef, 'btnServeOff');
}
function renderSlots(v){
  const chars = fitName(v), focused = document.activeElement === nameInput;
  slotsEl.querySelectorAll('.slot').forEach(el => el.remove());
  const add = (text, half, cursor) => {
    const el = document.createElement('span');
    el.className = 'slot' + (half ? ' half' : '') + (cursor ? ' cursor' : '');
    el.textContent = text;
    nameInput.before(el);
  };
  chars.forEach(ch => add(ch, nameUnits(ch) === 1));
  // 剩下的格子補空格；游標落在第一個空格
  let left = NAME_UNITS - chars.reduce((sum, ch) => sum + nameUnits(ch), 0), first = focused;
  while (left > 0){
    const half = left % 2 === 1;
    add('', half, first);
    first = false;
    left -= half ? 1 : 2;
  }
}
function syncName(){
  const raw = nameInput.value.replace(/\s/g, ''), name = fitName(raw).join('');
  if (name !== raw) toast('超過最多字數');
  nameInput.value = state.chef = name;
  renderSlots(state.chef);
  setBtnEnabled($('#btnServe'), !!state.chef, 'btnServeOff');
}
nameInput.addEventListener('compositionstart', () => composing = true);
nameInput.addEventListener('compositionend', () => { composing = false; syncName(); });
nameInput.addEventListener('input', () => composing ? renderSlots(nameInput.value) : syncName());
nameInput.addEventListener('focus', () => renderSlots(nameInput.value));
nameInput.addEventListener('blur', () => { renderSlots(nameInput.value); setTimeout(setVh, 300); });
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !composing) nameInput.blur(); });

$('#btnServe').addEventListener('click', e => {
  if (!state.chef){ restartAnim(e.currentTarget, 'shake'); toast('請先輸入大廚暱稱'); nameInput.focus(); return; }
  nameInput.blur();
  go('cook');
  const fill = $('#cookFill');
  fill.style.animationDuration = `${COOK_MS}ms`;
  restartAnim(fill, 'run');
  // 進度條跑完才傳送，等待頁的秒數才會接近實際時間
  cookTimer = setTimeout(() => { go('wait'); sendPlate(); }, COOK_MS);
});

/* =========================================================
   L. ⑦ 分享卡（Canvas 產生 1080×1920 PNG）
   ========================================================= */
const FONT = '"SweiSpringSugar", "SweiSpringSugar Common", "Noto Serif TC", serif';
const loadImg = src => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => res(im); im.onerror = rej; im.src = src;
});
const tryImg = src => loadImg(src).catch(() => null);
function rr(ctx, X, Y, W, H, R){
  ctx.beginPath();
  ctx.moveTo(X + R, Y); ctx.arcTo(X + W, Y, X + W, Y + H, R); ctx.arcTo(X + W, Y + H, X, Y + H, R);
  ctx.arcTo(X, Y + H, X, Y, R); ctx.arcTo(X, Y, X + W, Y, R); ctx.closePath();
}
function drawContain(ctx, im, X, Y, W, H){
  const s = Math.min(W / im.width, H / im.height), w = im.width * s, h = im.height * s;
  ctx.drawImage(im, X + (W - w) / 2, Y + (H - h) / 2, w, h);
}
function fitText(ctx, text, weight, size, maxW){
  do { ctx.font = `${weight} ${size}px ${FONT}`; size -= 4; } while (ctx.measureText(text).width > maxW && size > 20);
}
function spaced(ctx, px){ if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }

async function drawFallbackBg(x, W, H, BR){
  x.fillStyle = '#FDEBDD'; x.fillRect(0, 0, W, H);
  x.save(); rr(x, 62, 62, 956, 1796, 34); x.clip();
  x.fillStyle = '#EDC888';
  x.beginPath(); x.moveTo(40, 1480);
  x.bezierCurveTo(220, 1460, 180, 1690, 380, 1700); x.bezierCurveTo(580, 1710, 600, 1560, 780, 1580);
  x.bezierCurveTo(950, 1600, 920, 1430, 1040, 1420); x.lineTo(1040, 1900); x.lineTo(40, 1900); x.fill();
  x.fillStyle = '#E6B35A';
  x.beginPath(); x.moveTo(500, 1900);
  x.bezierCurveTo(560, 1780, 760, 1800, 860, 1720); x.bezierCurveTo(960, 1640, 980, 1560, 1040, 1540); x.lineTo(1040, 1900); x.fill();
  x.restore();
  x.strokeStyle = '#D4A35A';
  x.lineWidth = 8; rr(x, 40, 40, 1000, 1840, 48); x.stroke();
  x.lineWidth = 3; rr(x, 62, 62, 956, 1796, 34); x.stroke();
  x.textAlign = 'center'; x.fillStyle = BR;
  const logo = await tryImg(ASSETS.shareLogo);
  if (logo) drawContain(x, logo, 220, 150, 640, 180);
  else { x.font = `900 120px ${FONT}`; spaced(x, 16); x.fillText('世界辦桌', W / 2, 300); spaced(x, 0); }
  x.font = 'italic 120px Georgia, "Times New Roman", serif'; x.fillText('Award', W / 2, 520);
  x.lineWidth = 3; x.strokeStyle = BR;
  x.beginPath(); x.moveTo(170, 540); x.lineTo(370, 540); x.moveTo(710, 540); x.lineTo(910, 540); x.stroke();
}

async function generateCard(){
  const d = state.dish, W = 1081, H = 1921, BR = '#5A3E24';
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  // 先確保卡片上會出現的字（含暱稱）都已載入，canvas 才畫得出正確字型
  const text = `世界辦桌恭賀演繹經典風味榮獲最佳主廚${state.chef}${d.name}${d.en}`;
  try { await Promise.all(['900', '700'].map(w => document.fonts.load(`${w} 80px ${FONT}`, text))); } catch {}

  // 有 assets/Award/ 的成品圖 → 只在名字框裡寫上暱稱
  const award = await tryImg(d.awardImg);
  if (award){
    x.drawImage(award, 0, 0, W, H);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = BR;
    fitText(x, state.chef, 900, 72, 540); spaced(x, 6);
    x.fillText(state.chef, 543, 1150);   // 名字框中心（原圖 1081×1921）
    return c;
  }

  const [bg, dishImg] = await Promise.all([tryImg(ASSETS.shareCardBg), tryImg(d.img)]);
  if (bg) x.drawImage(bg, 0, 0, W, H);
  else await drawFallbackBg(x, W, H, BR);

  if (dishImg) drawContain(x, dishImg, 170, 580, 740, 520);

  x.textAlign = 'center'; x.fillStyle = BR;
  x.font = `700 54px ${FONT}`; x.fillText('恭賀', W / 2, 1180);
  x.fillStyle = 'rgba(255,250,245,.92)'; rr(x, 230, 1215, 620, 120, 32); x.fill();
  x.fillStyle = BR; fitText(x, state.chef, 900, 76, 560); x.fillText(state.chef, W / 2, 1302);
  x.font = `700 56px ${FONT}`; spaced(x, 4); x.fillText('演繹經典風味榮獲', W / 2, 1440);
  fitText(x, d.name, 900, 128, 760); spaced(x, 8); x.fillText(d.name, W / 2, 1600);
  spaced(x, 6); fitText(x, d.en, 700, 44, 820); x.fillText(d.en, W / 2, 1670);
  spaced(x, 6); x.font = `900 76px ${FONT}`; x.fillText('最佳主廚', W / 2, 1790);
  spaced(x, 0);
  return c;
}

async function renderResult(){
  const d = state.dish;
  $('#resultDish').textContent = d.name;
  $('#awardPreview').innerHTML = '<div class="award-msg">分享卡產生中…</div>';
  state.cardBlob = null;
  try {
    const canvas = await generateCard();
    state.cardBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    if (state.cardUrl) URL.revokeObjectURL(state.cardUrl);
    state.cardUrl = URL.createObjectURL(state.cardBlob);
    $('#awardPreview').innerHTML = `<img src="${state.cardUrl}" alt="我的主廚成就">`;
  } catch (err) {
    console.error(err);
    $('#awardPreview').innerHTML = '<div class="award-msg">分享卡產生失敗：請用本機伺服器或正式網址開啟，不要直接雙擊 html 檔</div>';
  }
}

async function saveCard(){
  if (!state.cardBlob){ toast('分享卡還在準備中，請稍候'); return; }
  const ua = navigator.userAgent;
  const inApp  = /Line\/|FBAN|FBAV|Instagram/i.test(ua);   // LINE / FB / IG 內建瀏覽器不支援下載
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const file = new File([state.cardBlob], `world-banquet-${state.dish.id}.png`, { type:'image/png' });

  if (inApp) return showSave();
  if (mobile && navigator.canShare?.({ files:[file] })){
    try { await navigator.share({ files:[file], title:'世界辦桌｜我的主廚成就' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  if (mobile) return showSave();
  const a = document.createElement('a');
  a.href = state.cardUrl; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
}
function showSave(){ $('#saveImg').src = state.cardUrl; openModal('modalSave'); }
$('#btnDownload').addEventListener('click', saveCard);

/* =========================================================
   L-2. 圓弧文字（透明 PNG，傳給 Unity 疊在盤子下緣）
   尺寸固定，名字長短都不會讓 Unity 裡的圖變形或跑位；要調大小只改 ARC
   ========================================================= */
const ARC = {
  width: 480,       // 輸出尺寸：剛好放得下 maxArc
  height: 150,
  radius: 335,      // 圓弧半徑
  maxArc: 384,      // 文字最長的弧長（6 個中文字），超過就等比縮小
  bottomPad: 8,     // 字到圖片下緣的距離
  fontPx: 58,
  gap: 6,           // 字距
  color: '#5A3E24',
  suffix: '',       // 接在暱稱後面的字，例如 '大主廚'
};
async function renderArcText(name){
  const chars = Array.from(name + ARC.suffix), font = `900 ${ARC.fontPx}px ${FONT}`;
  try { await document.fonts.load(font, chars.join('')); } catch {}
  const c = document.createElement('canvas'); c.width = ARC.width; c.height = ARC.height;
  const x = c.getContext('2d');
  const cx = ARC.width / 2, cy = ARC.height - ARC.bottomPad - ARC.fontPx / 2 - ARC.radius;   // 圓心在圖片上方
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = ARC.color;
  const widths = chars.map(ch => x.measureText(ch).width + ARC.gap);
  const scale = Math.min(1, ARC.maxArc / widths.reduce((sum, w) => sum + w, 0));
  x.font = `900 ${ARC.fontPx * scale}px ${FONT}`;
  const steps = widths.map(w => w * scale / ARC.radius);
  // 排在圓的正下方，字頂朝圓心；由左往右閱讀，所以角度遞減
  let a = Math.PI / 2 + steps.reduce((sum, s) => sum + s, 0) / 2;
  chars.forEach((ch, i) => {
    a -= steps[i] / 2;
    x.save();
    x.translate(cx + ARC.radius * Math.cos(a), cy + ARC.radius * Math.sin(a));
    x.rotate(a - Math.PI / 2);
    x.fillText(ch, 0, 0);
    x.restore();
    a -= steps[i] / 2;
  });
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('圓弧文字輸出失敗')), 'image/png'));
}

/* =========================================================
   L-3. WebSocket + 上菜等待頁
   傳送順序：HEADER（JSON，含料理代碼）→ 圓弧文字 PNG（Binary）
   ========================================================= */
const COOK_MS = 3000;         // 烹煮頁進度條的長度
let cookTimer = null;
const WAIT_TIMEOUT = 10000;   // 這段時間內沒收到 ETA 就不再等，讓玩家繼續
const wait = { id:null, acked:false, timer:null, tick:null };
let ws = null, unityConnected = false;

function connectWS(){
  if (!location.host) return;   // 直接雙擊 html 開啟時沒有伺服器
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.binaryType = 'arraybuffer';
  ws.onclose = () => { unityConnected = false; setTimeout(connectWS, 1000); };
  ws.onerror = err => console.error('WS 錯誤', err);
  ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type === 'UNITY_STATUS') unityConnected = msg.connected;
    else if (!wait.id) return;
    else if (msg.type === 'UPLOAD_OK' && msg.id === wait.id) wait.acked = true;
    else if (msg.type === 'ETA_UPDATE' && msg.id === wait.id) startEta(msg.etaSec);
    else if (msg.type === 'ERROR' && !wait.acked) setWait('fail');
  };
}
const screenReady = () => ws?.readyState === WebSocket.OPEN && unityConnected;
const newId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;   // randomUUID 只有 https 才有

function clearWait(){
  clearTimeout(cookTimer);
  clearTimeout(wait.timer); clearInterval(wait.tick);
  Object.assign(wait, { id:null, acked:false, timer:null, tick:null });
  $('#btnWaitNext').style.visibility = '';
}
function setWait(kind, sec){
  const busy = kind === 'queue' || kind === 'eta';
  if (!busy){ clearTimeout(wait.timer); clearInterval(wait.tick); $('#btnWaitNext').style.visibility = 'visible'; }
  $('#waitLoading').hidden = !busy;
  $('#waitCheck').toggleAttribute('hidden', kind !== 'done' && kind !== 'sent');   // SVG 沒有 .hidden 屬性
  $('#waitText').innerHTML = {
    queue: '正在排程中，請稍候…',
    eta:   `你的料理將在約<b>${sec}</b>秒後出現`,
    done:  '你的料理已經上桌了！',
    sent:  '你的料理已送出，很快就會出現',
    fail:  '現場螢幕暫時沒有連線，這次不會出現在螢幕上',
  }[kind];
}
function startEta(etaSec){
  clearTimeout(wait.timer); clearInterval(wait.tick);
  let sec = Math.max(0, Math.floor(Number(etaSec) || 0));
  if (sec === 0) return setWait('done');
  setWait('eta', sec);
  wait.tick = setInterval(() => { if (--sec > 0) setWait('eta', sec); else setWait('done'); }, 1000);
}
async function sendPlate(){
  clearWait();
  const id = wait.id = newId(), { code, id:dishId } = state.dish;
  setWait('queue');
  if (!screenReady()) return setWait('fail');
  wait.timer = setTimeout(() => setWait(wait.acked ? 'sent' : 'fail'), WAIT_TIMEOUT);
  try {
    const buffer = await (await renderArcText(state.chef)).arrayBuffer();
    if (wait.id !== id) return;                // 繪製期間玩家已回首頁
    if (!screenReady()) return setWait('fail');
    ws.send(JSON.stringify({ type:'HEADER', id, meta:{ dishCode:code, dishId } }));
    ws.send(buffer);
  } catch (err) {
    console.error(err);
    if (wait.id === id) setWait('fail');
  }
}
$('#btnWaitNext').addEventListener('click', () => go('result'));

/* =========================================================
   M. 彈窗
   ========================================================= */
function openModal(id){ $('#' + id).classList.add('open'); }
function closeModal(id){ $('#' + id).classList.remove('open'); }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => {
  if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('open');
}));
$('#modalUnlocked').addEventListener('transitionend', e => {
  // 關閉解鎖視窗後，讓新解鎖的兩張菜卡晃一下
  if (e.target.id !== 'modalUnlocked' || e.target.classList.contains('open')) return;
  document.querySelectorAll('.dish-card').forEach(c => {
    const d = DISHES.find(x => x.id === c.dataset.id);
    if (d.secret) { restartAnim(c, 'just-unlocked'); c.scrollIntoView({ behavior:'smooth', block:'center' }); }
  });
});

/* =========================================================
   N. 啟動
   ========================================================= */
applyAssets();
showBg('home');
try {
  DISHES = buildDishes(window.GAME_DATA);
  buildRing();
} catch (err) {
  console.error(err);
  toast(err.message); clearTimeout(toastTimer);             // 錯誤訊息留在畫面上
  document.querySelectorAll('[data-go]').forEach(b => b.setAttribute('aria-disabled', 'true'));
}
$('#btnHome').setAttribute('aria-disabled', true);
$('#btnBack').setAttribute('aria-disabled', true);
connectWS();
