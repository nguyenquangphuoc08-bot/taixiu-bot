// utils/canvasXD.js - Xoc dia voi hat tron tren dia xam

const { createCanvas } = require('@napi-rs/canvas');

function drawBead(ctx, cx, cy, radius, isRed) {
    // Shadow glow
    ctx.shadowColor = isRed ? 'rgba(231,76,60,0.8)' : 'rgba(200,200,200,0.6)';
    ctx.shadowBlur = 18;

    // Gradient chinh
    const grad = ctx.createRadialGradient(
        cx - radius * 0.35, cy - radius * 0.35, radius * 0.05,
        cx, cy, radius
    );
    if (isRed) {
        grad.addColorStop(0, '#ff9999');
        grad.addColorStop(0.4, '#e74c3c');
        grad.addColorStop(1, '#7b0000');
    } else {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ecf0f1');
        grad.addColorStop(1, '#95a5a6');
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Vien
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isRed ? '#c0392b' : '#7f8c8d';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Highlight sang
    const hl = ctx.createRadialGradient(
        cx - radius * 0.4, cy - radius * 0.4, 1,
        cx - radius * 0.2, cy - radius * 0.2, radius * 0.65
    );
    hl.addColorStop(0, 'rgba(255,255,255,0.6)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = hl;
    ctx.fill();
}

// Ve dia xam chua hat
function drawPlate(ctx, cx, cy, plateRadius) {
    // Bong dia
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // Dia ngoai (vien)
    const outerGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, plateRadius);
    outerGrad.addColorStop(0, '#9e9e9e');
    outerGrad.addColorStop(0.6, '#757575');
    outerGrad.addColorStop(1, '#424242');
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Dia trong (mat dia)
    const innerRadius = plateRadius * 0.88;
    const innerGrad = ctx.createRadialGradient(cx - 15, cy - 15, 5, cx, cy, innerRadius);
    innerGrad.addColorStop(0, '#bdbdbd');
    innerGrad.addColorStop(0.5, '#9e9e9e');
    innerGrad.addColorStop(1, '#616161');
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    // Vien vong tron trang nho
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Highlight dia
    const hlGrad = ctx.createRadialGradient(cx - 40, cy - 40, 5, cx - 20, cy - 20, plateRadius * 0.6);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();
}

function createXDResult(beads) {
    const W = 500, H = 220;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Nen gradient toi giong .tx
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1a1a2e');
    bg.addColorStop(0.5, '#16213e');
    bg.addColorStop(1, '#0f3460');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Vien ngoai
    ctx.strokeStyle = 'rgba(231,76,60,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    const plateRadius = 88;
    const cx = W / 2;
    const cy = 100;

    // Ve dia xam
    drawPlate(ctx, cx, cy, plateRadius);

    // Vi tri 4 hat tren dia (2x2)
    const beadRadius = 22;
    const spread = 32;
    const positions = [
        { x: cx - spread, y: cy - spread },
        { x: cx + spread, y: cy - spread },
        { x: cx - spread, y: cy + spread },
        { x: cx + spread, y: cy + spread }
    ];

    const red = beads.filter(b => b === 'red').length;
    const white = 4 - red;

    // Ve 4 hat
    beads.forEach((color, i) => {
        drawBead(ctx, positions[i].x, positions[i].y, beadRadius, color === 'red');
    });

    // Label ket qua
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'transparent';

    let label = '';
    let labelColor = '#f1c40f';

    if (red === 4)      { label = '4 DO - BO TU DO!';      labelColor = '#e74c3c'; }
    else if (white === 4) { label = '4 TRANG - BO TU TRANG!'; labelColor = '#ecf0f1'; }
    else if (red === 3) { label = '3 DO  1 TRANG';          labelColor = '#e67e22'; }
    else if (white === 3){ label = '3 TRANG  1 DO';         labelColor = '#bdc3c7'; }
    else                { label = '2 DO  2 TRANG - CHAN';   labelColor = '#f1c40f'; }

    // Background label
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(W/2 - 160, 188, 320, 26, 8);
    ctx.fill();

    ctx.shadowColor = labelColor;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = labelColor;
    ctx.fillText(label, W / 2, 207);

    return canvas.toBuffer('image/png');
}

module.exports = { createXDResult };

