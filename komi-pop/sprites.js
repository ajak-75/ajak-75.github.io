/* KOMI & MOMO POP — 캐릭터 스프라이트
   외부 이미지 없이 캔버스 벡터로 9단계를 그린다. 그림 좌표계는 320×320,
   얼굴 중심 (160,172), 몸통 반지름 128 — 바깥 32px 여백에 귀·왕관이 들어간다.
   그래서 게임에서는 스프라이트를 몸통 반지름의 2.5배 크기로 그리면 충돌 원과 정확히 맞는다. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var CX = 160, CY = 172, RB = 128;

  /* ---------- 작은 도구 ---------- */
  function rg(ctx, x0, y0, r0, x1, y1, r1, stops) {
    var g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function lg(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function ellipse(ctx, x, y, rx, ry, rot, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ---------- 공통 몸통 ---------- */
  function ball(ctx, c1, c2, c3, rim) {
    ctx.beginPath();
    ctx.arc(CX, CY, RB, 0, TAU);
    ctx.fillStyle = rg(ctx, CX - 0.36 * RB, CY - 0.44 * RB, 0.06 * RB, CX, CY, RB * 1.04, [
      [0, c1], [0.52, c2], [1, c3]
    ]);
    ctx.fill();
    ctx.lineWidth = 0.05 * RB;
    ctx.strokeStyle = rim || 'rgba(120,60,90,.10)';
    ctx.beginPath();
    ctx.arc(CX, CY, RB - 0.025 * RB, 0, TAU);
    ctx.stroke();
  }

  function gloss(ctx, a) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, RB, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(CX - 0.30 * RB, CY - 0.58 * RB, 0.52 * RB, 0.30 * RB, -0.5, 0, TAU);
    ctx.fillStyle = rg(ctx, CX - 0.30 * RB, CY - 0.62 * RB, 0, CX - 0.30 * RB, CY - 0.58 * RB, 0.6 * RB, [
      [0, 'rgba(255,255,255,' + a + ')'], [1, 'rgba(255,255,255,0)']
    ]);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- 개 귀 ---------- */
  function earPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-0.70 * RB, -0.58 * RB);
    ctx.quadraticCurveTo(-0.88 * RB, -0.84 * RB, -0.64 * RB, -1.06 * RB);
    ctx.quadraticCurveTo(-0.57 * RB, -1.14 * RB, -0.47 * RB, -1.02 * RB);
    ctx.quadraticCurveTo(-0.40 * RB, -0.94 * RB, -0.28 * RB, -0.88 * RB);
    ctx.quadraticCurveTo(-0.46 * RB, -0.70 * RB, -0.70 * RB, -0.58 * RB);
    ctx.closePath();
  }

  function ear(ctx, dir, k, fur, inner, outline) {
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(dir < 0 ? -1 : 1, 1);
    ctx.scale(k, k);

    earPath(ctx);
    ctx.fillStyle = fur;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.035 * RB;
    ctx.strokeStyle = outline || 'rgba(60,30,45,.10)';
    ctx.stroke();

    // 안쪽 귀 — 바깥 귀를 살짝 줄여 그린다
    ctx.save();
    ctx.translate(-0.50 * RB, -0.74 * RB);
    ctx.scale(0.66, 0.66);
    ctx.translate(0.50 * RB, 0.74 * RB);
    earPath(ctx);
    ctx.fillStyle = rg(ctx, -0.80 * RB, -0.92 * RB, 0.04 * RB, -0.62 * RB, -0.78 * RB, 0.32 * RB, [
      [0, '#FFD3DF'], [1, inner]
    ]);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  /* ---------- 눈 ---------- */
  function eye(ctx, x, y, rx, ry, iris, opts) {
    opts = opts || {};
    ctx.save();
    // 눈두덩 그림자
    if (opts.socket) {
      ellipse(ctx, x, y + ry * 0.08, rx * 1.16, ry * 1.12, 0, opts.socket);
    }
    // 흰자
    ellipse(ctx, x, y, rx, ry, 0, opts.sclera || '#FFFBF6');
    // 홍채
    var ig = rg(ctx, x - rx * 0.2, y - ry * 0.3, rx * 0.1, x, y + ry * 0.1, rx * 1.05, [
      [0, iris[0]], [0.6, iris[1]], [1, iris[2] || iris[1]]
    ]);
    ellipse(ctx, x, y + ry * 0.04, rx * 0.86, ry * 0.9, 0, ig);
    // 눈동자
    ellipse(ctx, x, y + ry * 0.08, rx * 0.5, ry * 0.52, 0, opts.pupil || '#1B1016');
    // 반짝이
    ellipse(ctx, x - rx * 0.34, y - ry * 0.36, rx * 0.3, ry * 0.3, 0, 'rgba(255,255,255,.96)');
    ellipse(ctx, x + rx * 0.32, y + ry * 0.34, rx * 0.16, ry * 0.16, 0, 'rgba(255,255,255,.75)');
    // 위쪽 눈꺼풀 선
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.strokeStyle = opts.lid || 'rgba(60,30,40,.30)';
    ctx.lineWidth = Math.max(1.5, rx * 0.1);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  function blush(ctx, x, y, rx, ry, color) {
    ellipse(ctx, x, y, rx, ry, 0, rg(ctx, x, y, 0, x, y, Math.max(rx, ry), [
      [0, color], [1, 'rgba(255,255,255,0)']
    ]));
  }

  /* ---------- 리본 · 왕관 · 꽃 ---------- */
  function bow(ctx, x, y, s, c1, c2, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale(s, s);
    var g = lg(ctx, 0, -30, 0, 30, [[0, c1], [1, c2]]);
    ctx.fillStyle = g;
    // 왼쪽 고리
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.bezierCurveTo(-26, -34, -62, -34, -60, -8);
    ctx.bezierCurveTo(-58, 18, -26, 20, -4, 6);
    ctx.closePath();
    ctx.fill();
    // 오른쪽 고리
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.bezierCurveTo(26, -34, 62, -34, 60, -8);
    ctx.bezierCurveTo(58, 18, 26, 20, 4, 6);
    ctx.closePath();
    ctx.fill();
    // 매듭
    ellipse(ctx, 0, 1, 13, 15, 0, c2);
    ellipse(ctx, -3, -4, 5, 6, 0, 'rgba(255,255,255,.45)');
    ctx.restore();
  }

  function crown(ctx, x, y, w, opts) {
    opts = opts || {};
    var h = w * 0.5;
    var gold = lg(ctx, 0, y - h, 0, y + h * 0.6, [
      [0, '#FFF0B8'], [0.35, '#FFD66B'], [0.7, '#F0AE2E'], [1, '#C9821A']
    ]);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = gold;
    ctx.strokeStyle = '#B3750F';
    ctx.lineWidth = w * 0.035;
    ctx.lineJoin = 'round';
    // 뾰족 세 개
    ctx.beginPath();
    ctx.moveTo(-w / 2, h * 0.55);
    ctx.lineTo(-w / 2, -h * 0.15);
    ctx.lineTo(-w * 0.28, -h * 0.72);
    ctx.lineTo(-w * 0.06, -h * 0.18);
    ctx.lineTo(w * 0.16, -h * 0.78);
    ctx.lineTo(w * 0.34, -h * 0.16);
    ctx.lineTo(w / 2, -h * 0.62);
    ctx.lineTo(w / 2, h * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 아래 띠
    roundRect(ctx, -w / 2, h * 0.05, w, h * 0.55, h * 0.16);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.stroke();
    // 보석
    var gems = opts.gems || ['#FF5D9B', '#4FA8E8', '#FF5D9B'];
    for (var i = 0; i < 3; i++) {
      var gx = (-0.26 + i * 0.26) * w;
      ellipse(ctx, gx, h * 0.34, w * 0.06, w * 0.06, 0, gems[i]);
      ellipse(ctx, gx - w * 0.015, h * 0.32, w * 0.022, w * 0.022, 0, 'rgba(255,255,255,.85)');
    }
    // 꼭대기 구슬
    ellipse(ctx, w * 0.16, -h * 0.8, w * 0.055, w * 0.055, 0, '#FFF3C4');
    ctx.restore();
  }

  function flower(ctx, x, y, r, petal, center, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * TAU;
      ellipse(ctx, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.46, r * 0.34, a, petal);
    }
    ellipse(ctx, 0, 0, r * 0.34, r * 0.34, 0, center);
    ctx.restore();
  }

  function sparkle(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
    ctx.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
    ctx.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
    ctx.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- 1단계 · 젤리 발바닥 ---------- */
  function stagePaw(ctx) {
    ball(ctx, '#FFEDF5', '#FFB6D4', '#FF8DBA', 'rgba(213,74,127,.18)');
    gloss(ctx, 0.6);
    var pad = rg(ctx, CX - 0.1 * RB, CY + 0.2 * RB, 0.04 * RB, CX, CY + 0.38 * RB, 0.55 * RB, [
      [0, '#FF9CC4'], [0.55, '#FF6BA4'], [1, '#EF3E83']
    ]);
    ctx.beginPath();
    ctx.ellipse(CX, CY + 0.34 * RB, 0.44 * RB, 0.35 * RB, 0, 0, TAU);
    ctx.fillStyle = pad;
    ctx.fill();
    var toes = [[-0.54, -0.26, -0.5], [-0.24, -0.5, -0.18], [0.24, -0.5, 0.18], [0.54, -0.26, 0.5]];
    for (var i = 0; i < toes.length; i++) {
      var t = toes[i];
      ellipse(ctx, CX + t[0] * RB, CY + t[1] * RB, 0.155 * RB, 0.19 * RB, t[2], pad);
      ellipse(ctx, CX + t[0] * RB - 0.03 * RB, CY + t[1] * RB - 0.05 * RB, 0.05 * RB, 0.045 * RB, 0, 'rgba(255,255,255,.55)');
    }
    ellipse(ctx, CX - 0.13 * RB, CY + 0.24 * RB, 0.13 * RB, 0.06 * RB, -0.35, 'rgba(255,255,255,.5)');
  }

  /* ---------- 2단계 · 핑크 리본 ---------- */
  function stageRibbon(ctx) {
    ball(ctx, '#FFF4FA', '#FFD8EA', '#FFB2D2', 'rgba(213,74,127,.16)');
    gloss(ctx, 0.5);
    // 그림자
    ellipse(ctx, CX, CY + 0.52 * RB, 0.5 * RB, 0.09 * RB, 0, 'rgba(213,74,127,.10)');
    ctx.save();
    ctx.translate(CX, CY + 0.02 * RB);
    var g = lg(ctx, 0, -0.75 * RB, 0, 0.75 * RB, [
      [0, '#FF8FBB'], [0.5, '#FB5B9C'], [1, '#DE2273']
    ]);
    // 고리 두 개
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-0.06 * RB, -0.02 * RB);
    ctx.bezierCurveTo(-0.30 * RB, -0.72 * RB, -0.92 * RB, -0.70 * RB, -0.86 * RB, -0.16 * RB);
    ctx.bezierCurveTo(-0.81 * RB, 0.28 * RB, -0.30 * RB, 0.30 * RB, -0.05 * RB, 0.10 * RB);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.06 * RB, -0.02 * RB);
    ctx.bezierCurveTo(0.30 * RB, -0.72 * RB, 0.92 * RB, -0.70 * RB, 0.86 * RB, -0.16 * RB);
    ctx.bezierCurveTo(0.81 * RB, 0.28 * RB, 0.30 * RB, 0.30 * RB, 0.05 * RB, 0.10 * RB);
    ctx.closePath();
    ctx.fill();
    // 꼬리
    ctx.beginPath();
    ctx.moveTo(-0.05 * RB, 0.12 * RB);
    ctx.bezierCurveTo(-0.22 * RB, 0.34 * RB, -0.34 * RB, 0.56 * RB, -0.40 * RB, 0.72 * RB);
    ctx.lineTo(-0.22 * RB, 0.64 * RB);
    ctx.bezierCurveTo(-0.16 * RB, 0.46 * RB, -0.08 * RB, 0.28 * RB, 0.02 * RB, 0.16 * RB);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.05 * RB, 0.12 * RB);
    ctx.bezierCurveTo(0.22 * RB, 0.34 * RB, 0.34 * RB, 0.56 * RB, 0.40 * RB, 0.72 * RB);
    ctx.lineTo(0.22 * RB, 0.64 * RB);
    ctx.bezierCurveTo(0.16 * RB, 0.46 * RB, 0.08 * RB, 0.28 * RB, -0.02 * RB, 0.16 * RB);
    ctx.closePath();
    ctx.fill();
    // 매듭
    ellipse(ctx, 0, 0.04 * RB, 0.16 * RB, 0.18 * RB, 0, rg(ctx, -0.05 * RB, -0.04 * RB, 0, 0, 0.04 * RB, 0.2 * RB, [
      [0, '#FFA3C6'], [1, '#DF2A79']
    ]));
    // 하이라이트
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 0.045 * RB;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-0.46 * RB, -0.12 * RB, 0.30 * RB, Math.PI * 1.05, Math.PI * 1.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.46 * RB, -0.12 * RB, 0.30 * RB, Math.PI * 1.55, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- 모모 얼굴 (3·4단계) ---------- */
  function momo(ctx, opt) {
    opt = opt || {};
    var furDark = '#2A2029', furMid = '#453542';
    ear(ctx, -1, 1.02, furMid, '#FFB3C7', 'rgba(20,10,18,.25)');
    ear(ctx, 1, 1.02, furMid, '#FFB3C7', 'rgba(20,10,18,.25)');

    ball(ctx, '#544351', furDark, '#160F17', 'rgba(10,4,12,.25)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, RB - 1, 0, TAU);
    ctx.clip();

    // 주둥이
    ctx.beginPath();
    ctx.ellipse(CX, CY + 0.60 * RB, 0.46 * RB, 0.34 * RB, 0, 0, TAU);
    ctx.fillStyle = rg(ctx, CX, CY + 0.46 * RB, 0.05 * RB, CX, CY + 0.60 * RB, 0.62 * RB, [
      [0, '#FFFEFB'], [0.65, '#FBF1E3'], [1, '#E8D5C0']
    ]);
    ctx.fill();

    // 이마의 흰 줄
    ctx.beginPath();
    ctx.moveTo(CX, CY - 0.99 * RB);
    ctx.bezierCurveTo(CX + 0.03 * RB, CY - 0.70 * RB, CX + 0.07 * RB, CY - 0.42 * RB, CX + 0.075 * RB, CY - 0.08 * RB);
    ctx.bezierCurveTo(CX + 0.08 * RB, CY + 0.12 * RB, CX + 0.15 * RB, CY + 0.20 * RB, CX + 0.17 * RB, CY + 0.34 * RB);
    ctx.lineTo(CX - 0.17 * RB, CY + 0.34 * RB);
    ctx.bezierCurveTo(CX - 0.15 * RB, CY + 0.20 * RB, CX - 0.08 * RB, CY + 0.12 * RB, CX - 0.075 * RB, CY - 0.08 * RB);
    ctx.bezierCurveTo(CX - 0.07 * RB, CY - 0.42 * RB, CX - 0.03 * RB, CY - 0.70 * RB, CX, CY - 0.99 * RB);
    ctx.closePath();
    ctx.fillStyle = rg(ctx, CX, CY - 0.9 * RB, 0.05 * RB, CX, CY - 0.2 * RB, 0.8 * RB, [
      [0, '#FFFDF8'], [1, '#F6E9DA']
    ]);
    ctx.fill();

    // 볼 쪽 살구색 털
    ellipse(ctx, CX - 0.72 * RB, CY + 0.28 * RB, 0.16 * RB, 0.11 * RB, 0.25, 'rgba(226,169,108,.5)');
    ellipse(ctx, CX + 0.72 * RB, CY + 0.28 * RB, 0.16 * RB, 0.11 * RB, -0.25, 'rgba(226,169,108,.5)');
    // 눈썹 자리 살구색 털
    ellipse(ctx, CX - 0.36 * RB, CY - 0.33 * RB, 0.13 * RB, 0.05 * RB, 0.22, 'rgba(226,169,108,.8)');
    ellipse(ctx, CX + 0.36 * RB, CY - 0.33 * RB, 0.13 * RB, 0.05 * RB, -0.22, 'rgba(226,169,108,.8)');
    ctx.restore();

    // 눈
    eye(ctx, CX - 0.36 * RB, CY + 0.04 * RB, 0.20 * RB, 0.22 * RB, ['#5B3A48', '#2C1B24', '#1A1018'], {
      socket: 'rgba(255,250,244,.18)', pupil: '#150C12'
    });
    eye(ctx, CX + 0.36 * RB, CY + 0.04 * RB, 0.20 * RB, 0.22 * RB, ['#5B3A48', '#2C1B24', '#1A1018'], {
      socket: 'rgba(255,250,244,.18)', pupil: '#150C12'
    });

    // 살짝 찡그린 눈썹
    ctx.strokeStyle = 'rgba(250,236,216,.9)';
    ctx.lineWidth = 0.045 * RB;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CX - 0.52 * RB, CY - 0.35 * RB);
    ctx.quadraticCurveTo(CX - 0.40 * RB, CY - 0.42 * RB, CX - 0.24 * RB, CY - 0.34 * RB);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CX + 0.52 * RB, CY - 0.35 * RB);
    ctx.quadraticCurveTo(CX + 0.40 * RB, CY - 0.42 * RB, CX + 0.24 * RB, CY - 0.34 * RB);
    ctx.stroke();

    // 코
    ctx.beginPath();
    ctx.moveTo(CX - 0.085 * RB, CY + 0.29 * RB);
    ctx.quadraticCurveTo(CX, CY + 0.24 * RB, CX + 0.085 * RB, CY + 0.29 * RB);
    ctx.quadraticCurveTo(CX + 0.055 * RB, CY + 0.38 * RB, CX, CY + 0.385 * RB);
    ctx.quadraticCurveTo(CX - 0.055 * RB, CY + 0.38 * RB, CX - 0.085 * RB, CY + 0.29 * RB);
    ctx.closePath();
    ctx.fillStyle = '#221A20';
    ctx.fill();
    ellipse(ctx, CX - 0.025 * RB, CY + 0.30 * RB, 0.022 * RB, 0.012 * RB, -0.3, 'rgba(255,255,255,.6)');

    // 입 (샐쭉)
    ctx.strokeStyle = '#3A2A32';
    ctx.lineWidth = 0.032 * RB;
    ctx.beginPath();
    ctx.moveTo(CX - 0.11 * RB, CY + 0.47 * RB);
    ctx.quadraticCurveTo(CX - 0.055 * RB, CY + 0.44 * RB, CX, CY + 0.47 * RB);
    ctx.quadraticCurveTo(CX + 0.055 * RB, CY + 0.44 * RB, CX + 0.11 * RB, CY + 0.47 * RB);
    ctx.stroke();

    // 수염 점
    ctx.fillStyle = 'rgba(150,120,105,.45)';
    for (var s = -1; s <= 1; s += 2) {
      for (var i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(CX + s * (0.34 + i * 0.07) * RB, CY + (0.44 + (i % 2) * 0.05) * RB, 0.016 * RB, 0, TAU);
        ctx.fill();
      }
    }

    blush(ctx, CX - 0.60 * RB, CY + 0.30 * RB, 0.20 * RB, 0.13 * RB, 'rgba(255,150,180,.38)');
    blush(ctx, CX + 0.60 * RB, CY + 0.30 * RB, 0.20 * RB, 0.13 * RB, 'rgba(255,150,180,.38)');

    if (opt.flower) {
      // 머리 위 꽃 화관
      var spots = [[-0.58, -0.80, 0.20], [-0.22, -0.94, 0.23], [0.18, -0.93, 0.21], [0.54, -0.78, 0.19]];
      for (var f = 0; f < spots.length; f++) {
        var p = spots[f];
        flower(ctx, CX + p[0] * RB, CY + p[1] * RB, p[2] * RB, f % 2 ? '#FFC7DE' : '#FFFDF8', '#FFC44D', f * 0.6);
      }
      flower(ctx, CX + 0.02 * RB, CY - 0.60 * RB, 0.12 * RB, '#FFD9E7', '#FFB020', 0.9);
    }
  }

  /* ---------- 코미 얼굴 (5~9단계의 바탕) ---------- */
  function komi(ctx, opt) {
    opt = opt || {};
    var gold = !!opt.gold;
    var furHi = gold ? '#FFF6D8' : '#FFFBF2';
    var furMid = gold ? '#F5CE72' : '#F9E7CA';
    var furLow = gold ? '#C98A24' : '#E7C79C';
    var furEar = gold ? 'rgba(255,240,196,.98)' : '#F7E3C4';

    ear(ctx, -1, 1.0, furEar, '#FFB6CB', gold ? 'rgba(150,90,10,.28)' : 'rgba(190,150,100,.35)');
    ear(ctx, 1, 1.0, furEar, '#FFB6CB', gold ? 'rgba(150,90,10,.28)' : 'rgba(190,150,100,.35)');

    ball(ctx, furHi, furMid, furLow, gold ? 'rgba(150,90,10,.24)' : 'rgba(160,110,70,.14)');
    gloss(ctx, gold ? 0.30 : 0.55);

    // 눈
    var irisSet = gold ? ['#6B4433', '#33201A', '#1E110C'] : ['#7A4E3C', '#3A2521', '#221310'];
    var pupilSet = gold ? '#120802' : '#170D0A';
    eye(ctx, CX - 0.355 * RB, CY + 0.01 * RB, 0.205 * RB, 0.225 * RB, irisSet, {
      sclera: '#FFFAF2', pupil: pupilSet, lid: gold ? 'rgba(70,40,20,.55)' : 'rgba(60,30,40,.3)'
    });
    eye(ctx, CX + 0.355 * RB, CY + 0.01 * RB, 0.205 * RB, 0.225 * RB, irisSet, {
      sclera: '#FFFAF2', pupil: pupilSet, lid: gold ? 'rgba(70,40,20,.55)' : 'rgba(60,30,40,.3)'
    });
    // 속눈썹
    ctx.strokeStyle = gold ? 'rgba(120,70,10,.6)' : 'rgba(70,40,32,.55)';
    ctx.lineWidth = 0.026 * RB;
    ctx.lineCap = 'round';
    for (var e = -1; e <= 1; e += 2) {
      for (var j = 0; j < 2; j++) {
        var bx = CX + e * (0.50 + j * 0.05) * RB;
        var by = CY - (0.10 + j * 0.02) * RB;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + e * 0.05 * RB, by - 0.06 * RB);
        ctx.stroke();
      }
    }

    // 볼
    blush(ctx, CX - 0.60 * RB, CY + 0.26 * RB, 0.21 * RB, 0.14 * RB, gold ? 'rgba(255,170,110,.45)' : 'rgba(255,140,175,.45)');
    blush(ctx, CX + 0.60 * RB, CY + 0.26 * RB, 0.21 * RB, 0.14 * RB, gold ? 'rgba(255,170,110,.45)' : 'rgba(255,140,175,.45)');

    // 코
      ctx.beginPath();
      ctx.moveTo(CX - 0.065 * RB, CY + 0.27 * RB);
      ctx.quadraticCurveTo(CX, CY + 0.23 * RB, CX + 0.065 * RB, CY + 0.27 * RB);
      ctx.quadraticCurveTo(CX + 0.04 * RB, CY + 0.35 * RB, CX, CY + 0.355 * RB);
      ctx.quadraticCurveTo(CX - 0.04 * RB, CY + 0.35 * RB, CX - 0.065 * RB, CY + 0.27 * RB);
      ctx.closePath();
      ctx.fillStyle = gold ? '#5A3006' : '#4A302A';
      ctx.fill();
    ellipse(ctx, CX - 0.02 * RB, CY + 0.275 * RB, 0.018 * RB, 0.010 * RB, -0.3, 'rgba(255,255,255,.7)');

    // 웃는 입 + 혀
    ctx.strokeStyle = gold ? '#5A3006' : '#5A3A32';
    ctx.lineWidth = 0.03 * RB;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CX - 0.10 * RB, CY + 0.40 * RB);
    ctx.quadraticCurveTo(CX - 0.05 * RB, CY + 0.455 * RB, CX, CY + 0.40 * RB);
    ctx.quadraticCurveTo(CX + 0.05 * RB, CY + 0.455 * RB, CX + 0.10 * RB, CY + 0.40 * RB);
    ctx.stroke();
    if (!gold) {
      ctx.beginPath();
      ctx.moveTo(CX - 0.045 * RB, CY + 0.44 * RB);
      ctx.quadraticCurveTo(CX, CY + 0.52 * RB, CX + 0.045 * RB, CY + 0.44 * RB);
      ctx.closePath();
      ctx.fillStyle = '#FF8FA9';
      ctx.fill();
    }

    if (opt.headband) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(CX, CY - 0.02 * RB, 0.905 * RB, Math.PI * 1.10, Math.PI * 1.90);
      ctx.lineWidth = 0.115 * RB;
      ctx.strokeStyle = '#FF4F92';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX, CY - 0.055 * RB, 0.905 * RB, Math.PI * 1.14, Math.PI * 1.86);
      ctx.lineWidth = 0.032 * RB;
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.stroke();
      ctx.restore();
      bow(ctx, CX - 0.78 * RB, CY - 0.50 * RB, 0.60, '#FF8FBB', '#E3226F', -0.55);
    }

    if (opt.crown) {
      crown(ctx, CX, CY - 0.95 * RB, opt.gold ? 1.04 * RB : 0.86 * RB, {
        gems: opt.gold ? ['#FF4F92', '#59B6FF', '#FFD34E'] : ['#FF5D9B', '#4FA8E8', '#FF5D9B']
      });
    }

    if (opt.dancheong) {
      // 오방색 단청 깃 — 아래쪽을 감싸는 띠
      var cols = ['#1F5FA8', '#F2F4EF', '#D8452F', '#F5C034', '#2E7D5B'];
      var R0 = 0.90 * RB, a0 = Math.PI * 0.16, a1 = Math.PI * 0.84;
      var per = (a1 - a0) / cols.length;
      ctx.save();
      ctx.lineCap = 'butt';
      for (var c = 0; c < cols.length; c++) {
        ctx.beginPath();
        ctx.arc(CX, CY, R0, a0 + c * per, a0 + (c + 1) * per);
        ctx.lineWidth = 0.15 * RB;
        ctx.strokeStyle = cols[c];
        ctx.stroke();
      }
      // 테두리
      [R0 - 0.082 * RB, R0 + 0.082 * RB].forEach(function (rr) {
        ctx.beginPath();
        ctx.arc(CX, CY, rr, a0 - 0.01, a1 + 0.01);
        ctx.lineWidth = 0.018 * RB;
        ctx.strokeStyle = 'rgba(40,26,20,.55)';
        ctx.stroke();
      });
      ctx.restore();
      // 단청 꽃 문양
      flower(ctx, CX + 0.02 * RB, CY + 0.88 * RB, 0.15 * RB, '#FFFDF6', '#D8452F', 0.2);
      flower(ctx, CX - 0.46 * RB, CY + 0.72 * RB, 0.10 * RB, '#FFFDF6', '#F5C034', 0.7);
      flower(ctx, CX + 0.48 * RB, CY + 0.72 * RB, 0.10 * RB, '#FFFDF6', '#1F5FA8', 1.2);
      flower(ctx, CX + 0.34 * RB, CY - 0.56 * RB, 0.07 * RB, '#FFFDF6', '#D8452F', 0.4);
    }

    if (opt.hanbok) {
      // 저고리 깃 (분홍) + 동정 (흰색)
      var R1 = 0.88 * RB;
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(CX, CY, R1, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 0.26 * RB;
      ctx.strokeStyle = '#E8548A';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX, CY, R1 - 0.135 * RB, Math.PI * 0.17, Math.PI * 0.83);
      ctx.lineWidth = 0.07 * RB;
      ctx.strokeStyle = '#FFFDF8';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX, CY, R1 + 0.13 * RB, Math.PI * 0.14, Math.PI * 0.86);
      ctx.lineWidth = 0.02 * RB;
      ctx.strokeStyle = 'rgba(140,30,70,.4)';
      ctx.stroke();
      ctx.restore();
      // 고름 (옷고름)
      ctx.save();
      ctx.translate(CX + 0.04 * RB, CY + 0.86 * RB);
      ctx.fillStyle = '#C9265F';
      roundRect(ctx, -0.10 * RB, 0.10 * RB, 0.10 * RB, 0.34 * RB, 0.04 * RB);
      ctx.fill();
      roundRect(ctx, 0.02 * RB, 0.10 * RB, 0.10 * RB, 0.26 * RB, 0.04 * RB);
      ctx.fill();
      ellipse(ctx, -0.05 * RB, 0.05 * RB, 0.09 * RB, 0.075 * RB, -0.2, '#E8548A');
      ellipse(ctx, 0.08 * RB, 0.05 * RB, 0.09 * RB, 0.075 * RB, 0.2, '#E8548A');
      ellipse(ctx, 0.015 * RB, 0.04 * RB, 0.055 * RB, 0.06 * RB, 0, '#A81B4D');
      ctx.restore();
      // 비녀 꽃
      flower(ctx, CX - 0.58 * RB, CY - 0.58 * RB, 0.12 * RB, '#FFD9E7', '#FFB020', 0.4);
      ellipse(ctx, CX - 0.58 * RB, CY - 0.58 * RB, 0.032 * RB, 0.032 * RB, 0, '#FF5D9B');
    }

    if (gold) {
      // 광채
      ctx.save();
      var gg = ctx.createRadialGradient(CX, CY, RB * 0.88, CX, CY, RB * 1.22);
      gg.addColorStop(0, 'rgba(255,215,110,0)');
      gg.addColorStop(0.55, 'rgba(255,215,110,.30)');
      gg.addColorStop(1, 'rgba(255,215,110,0)');
      ctx.beginPath();
      ctx.arc(CX, CY, RB * 1.22, 0, TAU);
      ctx.fillStyle = gg;
      ctx.fill();
      ctx.restore();
      var spots = [[-0.98, -0.46, 0.10], [0.95, -0.52, 0.085], [-0.86, 0.62, 0.075], [0.92, 0.52, 0.10], [0.06, -1.14, 0.07]];
      for (var s2 = 0; s2 < spots.length; s2++) {
        sparkle(ctx, CX + spots[s2][0] * RB, CY + spots[s2][1] * RB, spots[s2][2] * RB, '#FFFBE4', 0.95);
      }
    }
  }

  /* ---------- 단계 그리기 ---------- */
  function drawStage(ctx, stage) {
    switch (stage) {
      case 0: stagePaw(ctx); break;
      case 1: stageRibbon(ctx); break;
      case 2: momo(ctx, {}); break;
      case 3: momo(ctx, { flower: true }); break;
      case 4: komi(ctx, { headband: true }); break;
      case 5: komi(ctx, { crown: true }); break;
      case 6: komi(ctx, { dancheong: true }); break;
      case 7: komi(ctx, { hanbok: true }); break;
      default: komi(ctx, { crown: true, gold: true }); break;
    }
  }

  /* ---------- 공개 API ---------- */
  var cache = {};

  /* =========================================================
     이미지 스프라이트 — chars/stage-0.png ~ stage-8.png
     원본 사진에서 만든 원형 배지(정사각형에 내접하는 원, 모서리 투명).
     모두 로드되기 전에는 위의 벡터 그림으로 그린다(fallback).
     ========================================================= */
  var FILES = [
    'chars/stage-0.png', 'chars/stage-1.png', 'chars/stage-2.png',
    'chars/stage-3.png', 'chars/stage-4.png', 'chars/stage-5.png',
    'chars/stage-6.png', 'chars/stage-7.png', 'chars/stage-8.png'
  ];
  var IMG = [];
  var settled = 0, allReady = false, readyCbs = [];

  function whenReady(fn) {
    if (allReady) { try { fn(); } catch (e) { } return; }
    readyCbs.push(fn);
  }

  function settle() {
    settled++;
    if (settled < FILES.length) return;
    allReady = true;
    cache = {};
    var cbs = readyCbs;
    readyCbs = [];
    for (var i = 0; i < cbs.length; i++) { try { cbs[i](); } catch (e) { } }
  }

  (function loadAll() {
    if (typeof Image === 'undefined') { allReady = true; return; }
    for (var i = 0; i < FILES.length; i++) {
      (function (idx) {
        var im = new Image();
        im.decoding = 'async';
        im.onload = function () { IMG[idx] = im; settle(); };
        im.onerror = function () { settle(); };
        im.src = FILES[idx];
      })(i);
    }
  })();

  function makeSprite(stage, px) {
    px = Math.max(24, Math.round(px));
    var key = stage + ':' + px;
    var hit = cache[key];
    if (hit) return hit;
    var c = document.createElement('canvas');
    c.width = c.height = px;
    var g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    if (IMG[stage]) {
      g.drawImage(IMG[stage], 0, 0, px, px);
    } else {
      g.scale(px / 320, px / 320);
      drawStage(g, stage);
    }
    cache[key] = c;
    return c;
  }

  function drawInto(ctx, stage, x, y, size) {
    var c = makeSprite(stage, Math.min(1024, size * 2));
    ctx.drawImage(c, x, y, size, size);
  }

  /* 게임판의 공 하나 — 반지름 r 에 원형 배지를 정확히 맞춰 그리고 은은한 광택 링을 얹는다 */
  function drawBall(ctx, stage, x, y, r, angle) {
    var im = IMG[stage];
    var rot = angle || 0;
    if (rot > 0.22) rot = 0.22; else if (rot < -0.22) rot = -0.22;

    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);

    if (!im) {
      var d2 = r * 2 * 1.25;
      var c = makeSprite(stage, Math.min(1024, Math.ceil(d2 * 2)));
      ctx.drawImage(c, -d2 / 2, -d2 / 2 - 0.0375 * d2, d2, d2);
      ctx.restore();
      return;
    }

    var d = r * 2;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, -r, -r, d, d);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.4, 0, TAU);
    ctx.clip();
    // 위쪽 광택
    var g1 = ctx.createRadialGradient(-r * 0.34, -r * 0.44, r * 0.03, 0, 0, r * 1.04);
    g1.addColorStop(0, 'rgba(255,255,255,.30)');
    g1.addColorStop(0.40, 'rgba(255,255,255,.07)');
    g1.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(-r, -r, d, d);
    // 아래쪽 옅은 그늘로 입체감
    var g2 = ctx.createLinearGradient(0, r * 0.30, 0, r);
    g2.addColorStop(0, 'rgba(96,48,78,0)');
    g2.addColorStop(1, 'rgba(96,48,78,.16)');
    ctx.fillStyle = g2;
    ctx.fillRect(-r, 0, d, r);
    ctx.restore();

    // 테두리 링
    ctx.beginPath();
    ctx.arc(0, 0, r - Math.max(0.7, r * 0.03), 0, TAU);
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.strokeStyle = 'rgba(255,255,255,.34)';
    ctx.stroke();

    ctx.restore();
  }

  window.KOMI_POP_SPRITES = {
    count: 9,
    /** 벡터 fallback 스프라이트는 몸통 반지름의 2.5배 정사각형 (지름의 1.25배) */
    ratio: 1.25,
    drawStage: drawStage,
    make: makeSprite,
    drawInto: drawInto,
    drawBall: drawBall,
    whenReady: whenReady,
    isReady: function () { return allReady; },
    hasImage: function (stage) { return !!IMG[stage]; },
    clearCache: function () { cache = {}; }
  };
})();
