#!/usr/bin/env python3
"""Ajak Studio — icon & OG cover generator (PIL only, no external deps).

Mark: black rounded-square tile with a white "AS" monogram.
Run: python3 tools/make-icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ICONS = os.path.join(ROOT, "icons")
FONT = "/usr/share/fonts/pickle-hwp/NotoSansCJKkr-Regular.otf"
INK = (17, 17, 17, 255)
WHITE = (255, 255, 255, 255)

os.makedirs(ICONS, exist_ok=True)


def rounded_tile(size, radius_ratio=0.225, bg=INK):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=bg)
    return img


def monogram(size, text="AS", scale=0.42, tracking=0.04):
    """White 'AS' monogram centered, thickened with a stroke to fake a bold weight."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = int(size * scale)
    font = ImageFont.truetype(FONT, px)
    stroke = 0  # light, gallery-weight monogram (no fake bold)
    # draw letter by letter so tracking can be tightened
    widths = []
    for ch in text:
        box = font.getbbox(ch, stroke_width=stroke)
        widths.append(box[2] - box[0])
    gap = int(px * tracking)
    total = sum(widths) + gap * (len(text) - 1)
    x = (size - total) / 2
    d = ImageDraw.Draw(layer)
    for ch, w in zip(text, widths):
        box = font.getbbox(ch, stroke_width=stroke)
        y = (size - (box[3] - box[1])) / 2 - box[1]
        d.text((x - box[0], y), ch, font=font, fill=WHITE,
               stroke_width=stroke, stroke_fill=WHITE)
        x += w + gap
    return layer


def app_icon(size, glyph_scale=0.42, radius_ratio=0.225):
    img = rounded_tile(size, radius_ratio)
    img.alpha_composite(monogram(size, scale=glyph_scale))
    return img


def save(img, name):
    path = os.path.join(ICONS, name)
    img.save(path, "PNG")
    print("wrote", path, img.size)


# ---- app icons (transparent corners, rounded square) ----
for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (32, "favicon-32.png")]:
    save(app_icon(size), name)

# ---- maskable: safe zone inside the circle mask ----
save(app_icon(512, glyph_scale=0.31, radius_ratio=0.0).convert("RGBA"), "icon-maskable-512.png")

# ---- apple-touch: iOS applies its own rounding, so fill the canvas ----
apple = Image.new("RGBA", (180, 180), INK)
apple.alpha_composite(monogram(180, scale=0.42).resize((180, 180)))
save(apple, "apple-touch-icon.png")

# ---- OG cover 1200x630 ----
W, H = 1200, 630
og = Image.new("RGB", (W, H), WHITE)
d = ImageDraw.Draw(og)
tile = app_icon(120, glyph_scale=0.42).resize((120, 120), Image.LANCZOS)
og.paste(tile, (88, 92), tile)

f_brand = ImageFont.truetype(FONT, 62)
f_tag = ImageFont.truetype(FONT, 32)
f_small = ImageFont.truetype(FONT, 25)

def text(xy, s, font, fill=INK, stroke=0):
    d.text(xy, s, font=font, fill=fill, stroke_width=stroke, stroke_fill=fill)

text((88, 246), "Ajak Studio", f_brand, stroke=1)
text((90, 340), "아이디어가 앱이 되는 스튜디오", f_tag, fill=(55, 55, 55))
text((90, 392), "작은 불편을 앱으로 풀어냅니다 · 설치 없이 바로", f_small, fill=(125, 125, 125))

# right: the two live app icons, softly shadowed
def shadowed(src, box, radius_ratio=0.24, pad=22):
    w, h = box
    src = src.resize((w, h), Image.LANCZOS)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=int(w * radius_ratio), fill=255)
    rounded = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rounded.paste(src, (0, 0), mask)
    sh = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([pad, pad + 7, pad + w, pad + 7 + h], radius=int(w * radius_ratio), fill=(0, 0, 0, 30))
    sh = sh.filter(ImageFilter.GaussianBlur(11))
    sh.alpha_composite(rounded, (pad, pad))
    return sh

try:
    app_a = Image.open(os.path.join(ROOT, "..", "diary", "icons", "icon-192.png")).convert("RGBA")
    app_k = Image.open(os.path.join(ROOT, "..", "KOMI-Diary", "icons", "icon-192.png")).convert("RGBA")
    a = shadowed(app_a, (116, 116))
    k = shadowed(app_k, (116, 116))
    og.paste(a, (772, 236), a)
    og.paste(k, (952, 236), k)
    text((794, 402), "Ajak", f_small, fill=(110, 110, 110))
    text((974, 402), "KOMI-Diary", f_small, fill=(110, 110, 110))
except Exception as e:  # icons optional
    print("skip app icons:", e)

d.line([(88, 500), (W - 88, 500)], fill=(232, 232, 232), width=2)
text((88, 528), "ajak-75.github.io", f_small, fill=(110, 110, 110))
right = "2 apps live  ·  more soon"
rw = d.textlength(right, font=f_small)
text((W - 88 - rw, 528), right, f_small, fill=(140, 140, 140))

og.save(os.path.join(ICONS, "og-cover.jpg"), "JPEG", quality=92)
print("wrote", os.path.join(ICONS, "og-cover.jpg"), og.size)
