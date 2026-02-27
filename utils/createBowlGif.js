// utils/createBowlGif.js
// Tối ưu mượt: 15fps, quality cao, easing mượt

const { createCanvas } = require('@napi-rs/canvas');
const GIFEncoder = require('gifencoder');

// ===== EASING =====
function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeInQuart(t) {
    return t * t * t * t;
}
function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ===== NỀN =====
function drawBackground(ctx, width, height) {
    const grad = ctx.createRadialGradient(width/2, height/2, 60, width/2, height/2, width/1.3);
    grad.addColorStop(0, '#318a50');
    grad.addColorStop(1, '#1a5c33');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Vòng trang trí mờ
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (const r of [170, 205, 240]) {
        ctx.beginPath();
        ctx.arc(width/2, height/2, r, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// ===== XÚC XẮC =====
function drawDice(ctx, number, x, y, size = 82, opacity = 1, scale = 1) {
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, opacity);
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const half = size / 2;
    const r    = size * 0.15;

    // Đổ bóng
    ctx.shadowColor   = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur    = 14;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 5;

    // Gradient mặt xúc xắc
    const g = ctx.createLinearGradient(-half, -half, half, half);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#d8d8d8');
    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.moveTo(-half + r, -half);
    ctx.lineTo( half - r, -half);
    ctx.quadraticCurveTo( half, -half,  half, -half + r);
    ctx.lineTo( half,  half - r);
    ctx.quadraticCurveTo( half,  half,  half - r,  half);
    ctx.lineTo(-half + r,  half);
    ctx.quadraticCurveTo(-half,  half, -half,  half - r);
    ctx.lineTo(-half, -half + r);
    ctx.quadraticCurveTo(-half, -half, -half + r, -half);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Chấm
    ctx.fillStyle = '#111';
    const dotR = size * 0.10;
    const off  = size * 0.275;
    const dots = {
        1: [[0,0]],
        2: [[-off,-off],[off,off]],
        3: [[-off,-off],[0,0],[off,off]],
        4: [[-off,-off],[off,-off],[-off,off],[off,off]],
        5: [[-off,-off],[off,-off],[0,0],[-off,off],[off,off]],
        6: [[-off,-off*1.1],[off,-off*1.1],[-off,0],[off,0],[-off,off*1.1],[off,off*1.1]]
    };
    (dots[number]||[]).forEach(([dx,dy])=>{
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI*2);
        ctx.fill();
    });

    ctx.restore();
}

// ===== TÔ =====
function drawBowl(ctx, cx, cy, offX=0, offY=0, scaleY=1, opacity=1) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, opacity);
    ctx.translate(cx + offX, cy + offY);
    ctx.scale(1, scaleY);

    // Đổ bóng tô
    ctx.shadowColor   = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur    = 28;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 10;

    const g = ctx.createRadialGradient(-45, -45, 12, 0, 0, 168);
    g.addColorStop(0,   '#d09070');
    g.addColorStop(0.4, '#8B5A3C');
    g.addColorStop(1,   '#4a2010');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 162, 0, Math.PI*2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#9a6040';
    ctx.lineWidth   = 7;
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(-50, -58, 60, 33, -Math.PI/5, 0, Math.PI*2);
    ctx.fill();

    // Núm tô
    const ng = ctx.createRadialGradient(-6, -5, 2, 0, 0, 20);
    ng.addColorStop(0, '#b07050');
    ng.addColorStop(1, '#5c3520');
    ctx.fillStyle   = ng;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.ellipse(0, -152, 23, 14, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#4a2010';
    ctx.lineWidth   = 2.5;
    ctx.stroke();

    ctx.restore();
}

// ===== TẠO GIF =====
function createBowlSlideGif(dice1, dice2, dice3) {
    const W = 560, H = 500;
    const cx = W/2, cy = H/2 + 8;

    // 15fps × 20s = 300 frame — đủ mượt, Discord render tốt
    const FPS    = 15;
    const totalF = 300;

    // Vị trí 3 xúc xắc
    const dicePos = [
        { x: cx - 95, y: cy + 32  }, // trái
        { x: cx + 95, y: cy + 32  }, // phải
        { x: cx,      y: cy - 68  }, // trên
    ];
    const diceVals = [dice1, dice2, dice3];

    // Phase (frame)
    // 0  →  75 : hé TRÁI  lộ dice[0]   (5s)
    // 75 → 150 : hé PHẢI  lộ dice[1]   (5s)
    // 150→ 225 : hé TRÁI  lộ dice[2]   (5s)
    // 225→ 262 : giữ full               (2.5s)
    // 262→ 300 : tô vụt lên biến mất   (2.5s)
    const P = [0, 75, 150, 225, 262, 300];
    const HE = 238; // px tô trượt

    const encoder = new GIFEncoder(W, H);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setQuality(3); // 1=tốt nhất — dùng 3 để cân bằng size/chất lượng
    encoder.setDelay(Math.round(1000 / FPS)); // 67ms/frame

    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    // opacity từng xúc xắc
    const op = [0, 0, 0];
    // scale từng xúc xắc (pop effect khi xuất hiện)
    const sc = [0, 0, 0];

    for (let f = 0; f < totalF; f++) {
        ctx.clearRect(0, 0, W, H);
        drawBackground(ctx, W, H);

        let bowlOffX = 0, bowlOffY = 0, bowlScY = 1, bowlOp = 1;

        // helper: một phase hé trái/phải
        function doPhase(phaseF, pLen, dir, idx) {
            const t = phaseF / pLen;

            if (t < 0.10) {
                // rung nhẹ
                bowlOffX = Math.sin(t * 80) * 6 * dir;
            } else if (t < 0.55) {
                // trượt ra
                const s = easeInOutQuart((t - 0.10) / 0.45);
                bowlOffX = s * HE * dir;
                op[idx]  = easeOutBack(Math.min(1, s * 2.2));
                sc[idx]  = 0.5 + easeOutBack(Math.min(1, s * 2.2)) * 0.5;
            } else if (t < 0.90) {
                // dừng hé — nhìn xúc xắc
                bowlOffX = HE * dir;
                op[idx]  = 1;
                sc[idx]  = 1;
            } else {
                // kéo về
                const b  = easeInOutCubic((t - 0.90) / 0.10);
                bowlOffX = (1 - b) * HE * dir;
                op[idx]  = 1;
                sc[idx]  = 1;
            }
        }

        if (f < P[1]) {
            doPhase(f - P[0], P[1]-P[0], -1, 0);
        } else if (f < P[2]) {
            doPhase(f - P[1], P[2]-P[1],  1, 1);
        } else if (f < P[3]) {
            doPhase(f - P[2], P[3]-P[2], -1, 2);
        } else if (f < P[4]) {
            // giữ full — tô rung nhẹ tự hào
            const t = (f - P[3]) / (P[4]-P[3]);
            bowlOffX = Math.sin(t * 18) * 2.5;
            op[0] = op[1] = op[2] = 1;
            sc[0] = sc[1] = sc[2] = 1;
        } else {
            // vụt lên
            const t  = (f - P[4]) / (P[5]-P[4]);
            const e  = easeInQuart(t);
            bowlOffY = -e * (H + 250);
            bowlScY  = 1 - e * 0.4;
            bowlOp   = 1 - e * 0.6;
            op[0] = op[1] = op[2] = 1;
            sc[0] = sc[1] = sc[2] = 1;
        }

        // Vẽ xúc xắc (dưới tô)
        dicePos.forEach((pos, i) => {
            drawDice(ctx, diceVals[i], pos.x, pos.y, 82, op[i], sc[i]);
        });

        // Vẽ tô (đè lên xúc xắc)
        drawBowl(ctx, cx, cy, bowlOffX, bowlOffY, bowlScY, bowlOp);

        encoder.addFrame(ctx);
    }

    encoder.finish();
    return encoder.out.getData();
}

module.exports = { createBowlSlideGif };
