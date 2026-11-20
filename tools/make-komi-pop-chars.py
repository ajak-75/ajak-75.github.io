#!/usr/bin/env python3
"""KOMI & MOMO POP — 9단계 유리 버블 시트에서 원형 스프라이트를 잘라낸다.

입력: 3×3 격자로 늘어선 유리 버블 시트(흰 배경, 각 버블 반지름 ≈ 215~230px,
      크기 1404×1536)
출력: komi-pop/chars/stage-0.webp ~ stage-8.webp (512×512, 정사각형에 내접하는 원,
      원 바깥은 완전 투명. 게임의 drawBall 이 지름 = 충돌 지름으로 그린다)
      PNG 로도 같은 그림이 450KB 인데 WebP q90 은 55KB 라 — 폰 첫 로딩을 위해 WebP.
      아주 옛 브라우저가 WebP 를 못 읽으면 sprites.js 가 벡터 그림으로 그린다.

원을 찾는 법
  SEEDS 는 시트에서 잰 대략값이다. 그 주변 좁은 격자(±3px, 반지름 ±8px)에서
  원주 방향 밝기 경사가 가장 강한 원을 고른다 — 유리 테두리에 정확히 붙는다.
  이웃 버블과 아래 그림자는 원 밖이라 잘려나간다.

가장자리 처리
  1) 원 바깥은 alpha 0, 원 안쪽은 1 — 가장자리 3px 는 smoothstep 페더.
  2) 바깥 12% 고리에서는 '흰색에 가까운 픽셀'의 alpha 를 낮춘다. 원본이 흰 배경과
     섞여 있는 유리 테두리 끝자락을 반투명 유리로 남겨, 연분홍 게임판 위에서도
     흰 테가 생기지 않는다.

사용:
  python3 tools/make-komi-pop-chars.py <sheet.jpg> <outdir>
"""
import json
import math
import os
import sys

import cv2
import numpy as np

OUT_PX = 512          # 저장 크기
RIM_PAD = 3.0         # 유리 테두리 바깥 여유(원본 px)
FEATHER = 3.0         # 원 가장자리 페더(px, 512 기준)

# 시트(1404×1536)에서 잰 버블 중심·반지름 — find_circles 의 출발점
SEEDS = [
    (264, 243, 228), (704, 252, 213), (1152, 243, 228),
    (260, 712, 225), (707, 717, 219), (1159, 714, 223),
    (260, 1205, 224), (710, 1209, 219), (1162, 1206, 225),
]


def gradient_magnitude(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = cv2.GaussianBlur(g, (3, 3), 0.8)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    return np.hypot(gx, gy)


def find_circles(img, seeds, r_tol=8, reach=3):
    H, W = img.shape[:2]
    mag = gradient_magnitude(img)
    ang = np.linspace(0, 2 * math.pi, 720, endpoint=False)
    cs, sn = np.cos(ang), np.sin(ang)
    out = []
    for ax, ay, ar in seeds:
        best = (-1.0, None)
        for cx in range(int(ax) - reach, int(ax) + reach + 1):
            for cy in range(int(ay) - reach, int(ay) + reach + 1):
                for r in range(int(ar) - r_tol, int(ar) + r_tol + 1):
                    xi = np.clip(np.rint(cx + r * cs).astype(int), 0, W - 1)
                    yi = np.clip(np.rint(cy + r * sn).astype(int), 0, H - 1)
                    s = float(mag[yi, xi].mean())
                    if s > best[0]:
                        best = (s, (cx, cy, r))
        out.append((best[1], best[0]))
    return out


def cut_bubble(img, cx, cy, r, out_px=OUT_PX, feather=FEATHER):
    """(cx, cy, r) 원을 out_px 정사각형에 내접하도록 잘라 RGBA 를 만든다."""
    half = r + RIM_PAD                      # 잘라낼 반변 길이(원본 px)
    scale = (out_px / 2.0) / half           # 원본 → 출력 배율
    M = np.array([
        [1.0 / scale, 0, cx - (out_px / 2.0) / scale],
        [0, 1.0 / scale, cy - (out_px / 2.0) / scale],
    ], dtype=np.float64)
    warp = cv2.warpAffine(img, M, (out_px, out_px),
                          flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP,
                          borderMode=cv2.BORDER_REPLICATE)

    yy, xx = np.mgrid[0:out_px, 0:out_px].astype(np.float32)
    c = (out_px - 1) / 2.0
    d = np.hypot(xx - c, yy - c)
    # 유리 테두리(버블 실제 반지름)가 놓이는 출력 반지름 — 캔버스 끝이 아니다
    R = (out_px / 2.0) * (r / half)

    # 1) 원형 알파 + 페더
    alpha = np.clip((R - d) / feather, 0.0, 1.0)
    alpha = alpha * alpha * (3 - 2 * alpha)

    # 2) 바깥 고리에서 흰 배경과 섞인 픽셀은 반투명 유리로
    minc = warp.min(axis=2).astype(np.float32)          # BGR 최소 채널 = 흰색도
    whiteness = np.clip((252.0 - minc) / 12.0, 0.0, 1.0)
    ring = np.clip((d - R * 0.86) / (R * 0.14), 0.0, 1.0)
    alpha = alpha * (1.0 - ring * (1.0 - (0.18 + 0.82 * whiteness)))

    rgba = cv2.cvtColor(warp, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    return rgba


def main():
    src = sys.argv[1]
    outdir = sys.argv[2]
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit('cannot read ' + src)
    H, W = img.shape[:2]

    # 시트 크기가 다르면 SEEDS 를 비례 환산한다
    sx, sy = W / 1404.0, H / 1536.0
    seeds = [(x * sx, y * sy, r * (sx + sy) / 2) for x, y, r in SEEDS]
    circles = find_circles(img, seeds)

    os.makedirs(outdir, exist_ok=True)
    report, tiles = [], []
    for i, ((cx, cy, r), score) in enumerate(circles):
        rgba = cut_bubble(img, cx, cy, r)
        out_path = os.path.join(outdir, 'stage-%d.webp' % i)
        cv2.imwrite(out_path, cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA),
                    [cv2.IMWRITE_WEBP_QUALITY, 90])
        report.append({'stage': i, 'cx': cx, 'cy': cy, 'r': r, 'score': round(score, 1)})
        tiles.append(rgba)

    # 검수용 콘택트 시트 — 게임판과 같은 연분홍(#FFE4F1) 위에 얹어 본다
    cell = OUT_PX // 2
    sheet = np.zeros((cell * 3, cell * 3, 3), np.uint8)
    sheet[:] = (233, 228, 255)
    for i, t in enumerate(tiles):
        small = cv2.resize(cv2.cvtColor(t, cv2.COLOR_RGBA2BGRA), (cell, cell),
                            interpolation=cv2.INTER_AREA)
        a = small[:, :, 3:4].astype(np.float32) / 255.0
        rgb = small[:, :, :3].astype(np.float32)
        y0, x0 = (i // 3) * cell, (i % 3) * cell
        bg = sheet[y0:y0 + cell, x0:x0 + cell].astype(np.float32)
        sheet[y0:y0 + cell, x0:x0 + cell] = (rgb * a + bg * (1 - a)).astype(np.uint8)
    cv2.imwrite(os.path.join(outdir, '_contact.png'), sheet)

    # 어두운 배경 검수 — 바깥으로 새는 흰 테·그림자가 있는지 본다
    dark = np.zeros((cell * 3, cell * 3, 3), np.uint8)
    dark[:] = (90, 20, 60)
    for i, t in enumerate(tiles):
        small = cv2.resize(cv2.cvtColor(t, cv2.COLOR_RGBA2BGRA), (cell, cell),
                            interpolation=cv2.INTER_AREA)
        a = small[:, :, 3:4].astype(np.float32) / 255.0
        rgb = small[:, :, :3].astype(np.float32)
        y0, x0 = (i // 3) * cell, (i % 3) * cell
        bg = dark[y0:y0 + cell, x0:x0 + cell].astype(np.float32)
        dark[y0:y0 + cell, x0:x0 + cell] = (rgb * a + bg * (1 - a)).astype(np.uint8)
    cv2.imwrite(os.path.join(outdir, '_contact_dark.png'), dark)
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
