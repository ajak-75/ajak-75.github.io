#!/usr/bin/env python3
"""SnapRate 아이콘 생성 — 잉크 바탕 위 두 코인(주홍 원 + 아이보리 링) = 통화 교환.
   512/192/32/apple-touch/maskable 5종을 같은 도형 비율로 만든다."""
from PIL import Image, ImageDraw

INK = (30, 26, 21, 255)
ACCENT = (222, 95, 58, 255)
CREAM = (251, 247, 238, 255)

SS = 4  # 슈퍼샘플


def mark(size, scale=1.0, bg=INK):
    S = size * SS
    img = Image.new("RGBA", (S, S), bg)
    d = ImageDraw.Draw(img)
    cx, cy = S / 2, S / 2

    r = 0.208 * S * scale            # 주홍 코인 반지름
    rr = 0.196 * S * scale           # 아이보리 링 중심 반지름
    rw = max(3, int(0.046 * S * scale))
    gap = max(3, int(0.020 * S * scale))

    ax, ay = cx - 0.128 * S * scale, cy - 0.128 * S * scale
    bx, by = cx + 0.132 * S * scale, cy + 0.132 * S * scale

    # 1) 뒤쪽 코인: 아이보리 링
    d.ellipse([bx - rr, by - rr, bx + rr, by + rr], outline=CREAM, width=rw)

    # 2) 앞쪽 코인 자리를 바탕색으로 조금 크게 비워 링과 틈을 만든다
    gr = r + gap
    d.ellipse([ax - gr, ay - gr, ax + gr, ay + gr], fill=bg)

    # 3) 앞쪽 코인: 주홍 원 (온전한 원으로 남는다)
    d.ellipse([ax - r, ay - r, ax + r, ay + r], fill=ACCENT)

    return img.resize((size, size), Image.LANCZOS)


def main():
    out = [
        ("icon-512.png", 512, 1.0),
        ("icon-192.png", 192, 1.0),
        ("icon-32.png", 32, 1.12),
        ("apple-touch-icon.png", 180, 1.0),
        ("icon-maskable-512.png", 512, 0.74),
    ]
    for name, size, scale in out:
        mark(size, scale).convert("RGBA").save(name, optimize=True)
        print("wrote", name, size)


if __name__ == "__main__":
    main()
