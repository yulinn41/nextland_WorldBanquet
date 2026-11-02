/* =========================================================
   世界辦桌｜料理資料
   ---------------------------------------------------------
   ========================================================= */
window.GAME_DATA = {

  /* -------------------------------------------------------
     一、所有食材
     代號: { zh: 中文, en: 英文, img: 圖檔（放在 assets/Ingredients/） }
     代號只是給下方料理引用的簡寫，英文小寫＋連字號即可
     ------------------------------------------------------- */
  ingredients: {
    // 肉類
    'pork-loin':          { zh:'豬里肌',     en:'Pork Loin',                img:'ingr-porktenderloin.png' },
    'pork-belly':         { zh:'豬五花',     en:'Pork Belly',               img:'ingr-pork-belly.png' },
    'braised-pork-belly': { zh:'滷五花',     en:'Braised Pork Belly',       img:'ingr-pork-belly-braised.png' },
    'crispy-pork-belly':  { zh:'脆皮五花',   en:'Crispy Pork Belly',        img:'ingr-crispy-pork-belly.png' },
    'pork-ribs':          { zh:'排骨',       en:'Pork Ribs',                img:'ingr-ribs.png' },
    'baby-back-ribs':     { zh:'豬肋排',     en:'Baby Back Ribs',           img:'ingr-baby-back-ribs.png' },
    'minced-pork':        { zh:'豬絞肉',     en:'Minced Pork',              img:'ingr-minced-pork.png' },
    'pork-shoulder':      { zh:'豬肩肉',     en:'Pork Shoulder',            img:'ingr-pork-shoulder.png' },
    'pork-tripe':         { zh:'豬肚',       en:'Pork Tripe',               img:'ingr-pork-tripe.png' },
    'egg':                { zh:'雞蛋',       en:'Egg',                      img:'ingr-egg.png' },
    'white egg':          { zh:'雞蛋(白)',       en:'White Egg',                      img:'ingr-egg-white.png' },

    // 蔬菜・辛香料
    'cabbage':            { zh:'高麗菜絲',   en:'Shredded Cabbage',         img:'ingr-cabbage.png' },
    'lettuce':            { zh:'美生菜',     en:'Iceberg Lettuce',          img:'ingr-lettuce.png' },
    'white-radish':       { zh:'白蘿蔔',     en:'White Radish',             img:'ingr-white-radish.png' },
    'carrot':             { zh:'紅蘿蔔',     en:'Carrot',                   img:'ingr-carrot.png' },
    'onion':              { zh:'洋蔥',       en:'Onion',                    img:'ingr-onion.png' },
    'shallot':            { zh:'紅蔥頭',     en:'Shallots',                 img:'ingr-shallot.png' },
    'potato':             { zh:'馬鈴薯',     en:'Potato',                   img:'ingr-potato.png' },
    'mashed-potatoes':    { zh:'馬鈴薯泥',   en:'Mashed Potatoes',          img:'ingr-mashed-potatoes.png' },
    'sweet-potato':       { zh:'地瓜',       en:'Sweet Potato',             img:'ingr-sweet-potato.png' },
    'mushroom':           { zh:'蘑菇',       en:'Mushroom',                 img:'ingr-mushroom.png' },
    'cilantro':           { zh:'香菜',       en:'Cilantro',                 img:'ingr-cilantro.png' },
    'holy-basil':         { zh:'打拋葉',     en:'Holy Basil',               img:'ingr-holy-basil.png' },
    'bouquet-garni':      { zh:'香草束',     en:'Bouquet Garni',            img:'ingr-bouquet-garni.png' },
    'ginger-shreds':      { zh:'薑絲',       en:'Shredded Ginger',          img:'ingr-gingershreds.png' },
    'ginger-slices':      { zh:'薑片',       en:'Sliced Ginger',            img:'ingr-ginger-slices.png' },
    'minced-garlic':      { zh:'蒜末',       en:'Minced Garlic',            img:'ingr-mincedgarlic.png' },
    'garlic-slices':      { zh:'蒜片',       en:'Sliced Garlic',            img:'ingr-garlic-slices.png' },

    // 醃漬・醬料・調味
    'pickled-greens':     { zh:'酸菜',       en:'Pickled Mustard Greens',   img:'ingr-pickled-cabbage.png' },
    'kimchi':             { zh:'泡菜',       en:'Kimchi',                   img:'ingr-kimchi.png' },
    'soy-sauce':          { zh:'醬油',       en:'Soy Sauce',                img:'ingr-soy-sauce.png' },
    'miso':               { zh:'味噌',       en:'Miso',                     img:'ingr-miso.png' },
    'fish-sauce':         { zh:'魚露',       en:'Fish Sauce',               img:'ingr-fish-sauce.png' },
    'bbq-sauce':          { zh:'BBQ醬',      en:'BBQ Sauce',                img:'ingr-bbq-sauce.png' },
    'ssamjang':           { zh:'包飯醬',     en:'Ssamjang (Korean Dipping Sauce)', img:'ingr-ssamjang.png' },
    'dry-rub':            { zh:'乾式香料',   en:'Dry Rub Spices',           img:'ingr-dry-rub.png' },
    'orange-marmalade':   { zh:'柳丁果醬',   en:'Orange Marmalade',         img:'ingr-orange-marmalade.png' },
    'rock-sugar':         { zh:'冰糖',       en:'Rock Sugar',               img:'ingr-rock-sugar.png' },
    'red-wine':           { zh:'紅酒',       en:'Red Wine',                 img:'ingr-red-wine.png' },

    // 主食・其他
    'rice':               { zh:'白飯',       en:'Steamed Rice',             img:'ingr-rice.png' },
    'steamed-bun':        { zh:'刈包皮',     en:'Steamed Bun',              img:'ingr-steamed-bun.png' },
    'breadcrumbs':        { zh:'粗麵包粉',   en:'Coarse Breadcrumbs',       img:'ingr-coarsebreadflour.png' },
    'peanut-powder':      { zh:'花生粉',     en:'Peanut Powder',            img:'ingr-peanut-powder.png' },
    'pork-bone-broth':    { zh:'大骨湯',     en:'Pork Bone Broth',          img:'ingr-porkbonebroth.png' },
  },

  /* -------------------------------------------------------
     二、料理
     列的順序 = STEP1 選菜頁的順序
     code = 料理代碼，傳給 Unity 用來對應料理（不可重複；調整順序時不用改）
     correct = 正確食材（全部選到才能過關）
     wrong   = 干擾項
     兩組加起來就是選食材頁出現的卡片（建議共 10 張）
     圖片自動對應：assets/food/dish-料理ID.png、assets/title-料理ID.png、assets/info/info-料理ID.png、assets/Award/world-banquet-Award-料理ID.png
     ------------------------------------------------------- */
  dishes: [
    { id:'tonkatsu', code:1, name:'日式炸豬排', en:'Japanese Deep-fried Pork Cutlet',
      correct: ['breadcrumbs', 'miso', 'cabbage', 'rice', 'pork-loin'],
      wrong:   ['egg', 'ginger-shreds', 'soy-sauce', 'minced-garlic', 'onion'] },

    { id:'radish-soup', code:2, name:'台式排骨蘿蔔湯', en:'White Radish Pork Rib Soup',
      correct: ['white-radish', 'cilantro', 'pork-ribs', 'ginger-slices'],
      wrong:   ['ginger-shreds', 'pork-bone-broth', 'onion', 'garlic-slices',
                'holy-basil', 'bbq-sauce'] },                       // ← 最後兩個是補滿用，可替換

    { id:'guabao', code:3, name:'台灣刈包', en:'Taiwanese Gua Bao',
      feature:'綿白餅皮包覆酥軟五花肉，鹹香、酸爽、甜潤在一口間層層化開。',
      story:'尾牙餐桌上的傳統美食，形如老虎咬肉象徵咬住整年福氣，是台灣人把祝福做成的形狀。',
      correct: ['peanut-powder', 'braised-pork-belly', 'cilantro', 'steamed-bun', 'pickled-greens'],
      wrong:   ['crispy-pork-belly', 'egg', 'minced-garlic',
                'holy-basil', 'red-wine'] },                        // ← 最後兩個是補滿用，可替換

    { id:'bbq-ribs', code:4, name:'美式炭烤豬肋排', en:'Charcoal-grilled Pork Ribs',
      correct: ['dry-rub', 'baby-back-ribs', 'bbq-sauce'],
      wrong:   ['garlic-slices', 'mushroom', 'onion', 'pork-ribs', 'potato',
                'pickled-greens', 'holy-basil'] },                  // ← 最後兩個是補滿用，可替換

    { id:'kaprao', code:5, name:'泰式打拋豬肉', en:'Thai-style Basil Pork',
      correct: ['cilantro', 'egg', 'holy-basil', 'minced-pork', 'fish-sauce', 'rice', 'minced-garlic'],
      wrong:   ['soy-sauce', 'pork-loin', 'onion'] },

    { id:'roast-pork', code:6, name:'英式脆皮烤豬', en:'Crispy Roast Pork',
      correct: ['potato', 'carrot', 'orange-marmalade', 'sweet-potato', 'crispy-pork-belly'],
      wrong:   ['onion', 'mushroom', 'bouquet-garni', 'minced-garlic', 'mashed-potatoes'] },

    { id:'lurou', code:7, name:'台灣滷肉飯', en:'Braised Pork Rice',
      correct: ['rock-sugar', 'shallot', 'soy-sauce', 'rice', 'pork-belly'],
      wrong:   ['cilantro', 'egg', 'braised-pork-belly',
                'orange-marmalade', 'ssamjang'] },                  // ← 最後兩個是補滿用，可替換

    { id:'samgyeop', code:8, name:'韓式烤五花肉', en:'Korean-style Grilled Pork Belly',
      correct: ['garlic-slices', 'pork-belly', 'ssamjang', 'kimchi', 'lettuce'],
      wrong:   ['egg', 'pork-loin', 'onion',
                'red-wine', 'orange-marmalade'] },                  // ← 最後兩個是補滿用，可替換

    // ---- 神秘隱藏版（secret:true = 加入 LINE 會員才能解鎖）----
    { id:'secret-1', code:9, secret:true, name:'酸菜豬肚湯', en:'Pickled Mustard Greens & Pork Tripe Soup',
      correct: ['ginger-shreds', 'pork-bone-broth', 'pickled-greens', 'pork-tripe'],
      wrong:   ['carrot', 'cilantro', 'minced-garlic', 'ginger-slices',
                'orange-marmalade', 'bbq-sauce'] },                 // ← 最後兩個是補滿用，可替換

    { id:'secret-2', code:10, secret:true, name:'法式紅酒燉豬肉', en:'French Red Wine Braised Pork',
      correct: ['mashed-potatoes', 'mushroom', 'bouquet-garni', 'red-wine', 'onion', 'pork-shoulder'],
      wrong:   ['potato', 'carrot', 'pork-ribs', 'minced-garlic'] },
  ],
};
