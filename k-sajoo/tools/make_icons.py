#!/usr/bin/env python3
"""K-Sajoo 아이콘 생성 — 한지 바탕 + 인주 낙관. 한자 없이 한글 '사주'만."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent
SERIF = "/usr/share/fonts/pickle-hwp/NotoSerifCJKkr-Regular.otf"

BG = (239, 227, 205)
BG_DARK = (226, 210, 183)
INK = (36, 28, 22)
SEAL = (168, 50, 42)
SEAL_DARK = (138, 38, 32)
PAPER = (248, 237, 219)


def hanji(size):
    """한지 결이 살짝 보이는 바탕."""
    W = size
    img = Image.new("RGB", (W, W), BG)
    d = ImageDraw.Draw(img, "RGBA")
    random.seed(7)
    for _ in range(int(W * W / 90)):
        x, y = random.randrange(W), random.randrange(W)
        a = random.randint(4, 14)
        d.point((x, y), fill=(120, 92, 58, a))
    for i in range(0, W, 3):
        d.line([(0, i), (W, i)], fill=(120, 92, 58, 10))
        d.line([(i, 0), (i, W)], fill=(120, 92, 58, 7))
    return img


def seal_layer(size):
    """살짝 비뚤어진 낙관."""
    s = int(size * 0.58)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0 = (size - s) // 2
    y0 = (size - s) // 2
    r = int(s * 0.10)
    d.rounded_rectangle([x0, y0, x0 + s, y0 + s], radius=r, fill=SEAL + (255,))
    # 테두리 안쪽 선
    inset = int(s * 0.055)
    d.rounded_rectangle([x0 + inset, y0 + inset, x0 + s - inset, y0 + s - inset],
                        radius=max(2, r - inset), outline=SEAL_DARK + (120,), width=max(1, size // 220))
    # 글자
    font = ImageFont.truetype(SERIF, int(s * 0.44))
    text = "사주"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = x0 + (s - tw) / 2 - bbox[0]
    ty = y0 + (s - th) / 2 - bbox[1]
    d.text((tx, ty), text, font=font, fill=PAPER + (255,))
    # 가장자리 거칠기
    px = layer.load()
    for _ in range(int(s * 1.2)):
        ex = random.randrange(x0, x0 + s)
        ey = random.choice([y0, y0 + s - 1])
        px[ex, ey] = (SEAL[0], SEAL[1], SEAL[2], random.randint(90, 200))
    layer = layer.rotate(-3.2, resample=Image.BICUBIC, center=(size / 2, size / 2))
    return layer


def make(size, padding_ratio=0.0, maskable=False):
    base = hanji(size)
    if padding_ratio:
        # 안쪽 여백: 테두리를 조금 안으로
        pass
    d = ImageDraw.Draw(base, "RGBA")
    inset = int(size * (0.055 if not maskable else 0.14))
    d.rectangle([inset, inset, size - inset, size - inset],
                outline=(70, 48, 24, 70), width=max(1, size // 180))
    d.rectangle([inset + size // 90, inset + size // 90, size - inset - size // 90, size - inset - size // 90],
                outline=(70, 48, 24, 40), width=max(1, size // 320))

    seal = seal_layer(size)
    if maskable:
        seal = seal.resize((int(size * 0.82), int(size * 0.82)), Image.LANCZOS)
        base.paste(seal, ((size - seal.width) // 2, (size - seal.height) // 2), seal)
    else:
        base.paste(seal, (0, 0), seal)
    return base


def main():
    for size, name in [(32, "icon-32.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        img = make(size)
        img.save(OUT / name, optimize=True)
        print("wrote", name)
    m = make(512, maskable=True)
    m.save(OUT / "icon-maskable-512.png", optimize=True)
    print("wrote icon-maskable-512.png")
    # 스튜디오 카드 아이콘
    apps = OUT.parent.parent / "apps"
    apps.mkdir(exist_ok=True)
    make(192).save(apps / "k-sajoo.png", optimize=True)
    make(512).save(apps / "k-sajoo-512.png", optimize=True)
    print("wrote studio icons")


if __name__ == "__main__":
    main()
