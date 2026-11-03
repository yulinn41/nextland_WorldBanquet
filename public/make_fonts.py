"""
把「獅尾四季春加糖」切成網頁用的兩個 woff2：

  fonts/swei-ui.woff2      index.html＋script.js＋data.js 裡出現的所有字（固定文案），檔案很小，先載
  fonts/swei-common.woff2  Big5 常用字 5401 字＋標點＋英數，給暱稱等使用者輸入的字

用法：python make_fonts.py                  （自動找同資料夾的 .ttf/.otf）
      python make_fonts.py 字型檔.ttf [index.html]
需要：pip install fonttools brotli
"""
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

try:
    import brotli  # noqa: F401  woff2 壓縮需要
except ImportError:
    sys.exit("缺少 brotli：請先執行  pip install brotli")

if len(sys.argv) > 1:
    src = Path(sys.argv[1])
else:
    found = sorted(p for p in Path(".").iterdir() if p.suffix.lower() in (".ttf", ".otf", ".ttc"))
    if not found:
        sys.exit("找不到字型檔：請把 SweiSpringSugarCJKtc-Bold.ttf 放進這個資料夾，或執行  python make_fonts.py 字型檔路徑")
    src = found[0]
    print("使用字型：", src.name)
if not src.exists():
    sys.exit(f"找不到字型檔：{src}")
html = Path(sys.argv[2] if len(sys.argv) > 2 else "index.html")
out = Path("fonts")
out.mkdir(exist_ok=True)

ascii_chars = {chr(c) for c in range(0x20, 0x7F)}
punct = set("，。、；：？！「」『』（）《》〈〉…—～·・｜／＋－＝＃％＆＊＠　")
fullwidth = {chr(c) for c in range(0xFF01, 0xFF5F)}

# 1) 網頁固定文字＋ data.js 裡的料理名、食材名
text = html.read_text(encoding="utf-8")
for name in ("script.js", "data.js"):
    extra = html.with_name(name)
    if extra.exists():
        text += extra.read_text(encoding="utf-8")
        print(f"已讀取 {name} 的文字")
    else:
        print(f"（找不到 {name}）")
ui_chars = {ch for ch in text if ord(ch) > 0x7F} | ascii_chars | punct

# 2) Big5 第一級常用字（0xA440–0xC67E）
common = set()
for hi in range(0xA4, 0xC7):
    for lo in list(range(0x40, 0x7F)) + list(range(0xA1, 0xFF)):
        try:
            ch = bytes([hi, lo]).decode("big5")
        except UnicodeDecodeError:
            continue
        common.add(ch)
common |= ascii_chars | punct | fullwidth | ui_chars


def make(chars, name):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    font = TTFont(src, fontNumber=0) if src.suffix.lower() in (".ttc", ".otc") else TTFont(src)
    cmap = font.getBestCmap()
    keep = [ord(c) for c in chars if ord(c) in cmap]
    missing = sorted(c for c in chars if ord(c) not in cmap and not c.isspace())
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=keep)
    sub.subset(font)
    path = out / name
    font.flavor = "woff2"
    font.save(path)
    print(f"{path}: {len(keep)} 字, {path.stat().st_size / 1024:.0f} KB")
    if missing and name == "swei-ui.woff2":
        print("  字型裡沒有的字（會退回備用字型）:", "".join(missing[:80]))


make(ui_chars, "swei-ui.woff2")
make(common, "swei-common.woff2")
