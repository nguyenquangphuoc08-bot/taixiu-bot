// utils/canvasXD.js

const { createCanvas } = require('@napi-rs/canvas');

// Ve hat tron
function drawBead(ctx, cx, cy, radius, isRed) {
    ctx.shadowColor = isRed ? 'rgba(231,76,60,0.8)' : 'rgba(200,200,200,0.6)';
    ctx.shadowBlur = 18;

    const grad = ctx.createRadialGradient(cx - radius*0.35, cy - radius*0.35, radius*0.05, cx, cy, radius);
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

    ctx.shadowBlur = 0;
    ctx.strokeStyle = isRed ? '#c0392b' : '#7f8c8d';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const hl = ctx.createRadialGradient(cx - radius*0.4, cy - radius*0.4, 1, cx - radius*0.2, cy - radius*0.2, radius*0.65);
    hl.addColorStop(0, 'rgba(255,255,255,0.6)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = hl;
    ctx.fill();
}

// Ve dia xam
function drawPlate(ctx, cx, cy, plateRadius) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    const outerGrad = ctx.createRadialGradient(cx-20, cy-20, 10, cx, cy, plateRadius);
    outerGrad.addColorStop(0, '#9e9e9e');
    outerGrad.addColorStop(0.6, '#757575');
    outerGrad.addColorStop(1, '#424242');
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const innerRadius = plateRadius * 0.88;
    const innerGrad = ctx.createRadialGradient(cx-15, cy-15, 5, cx, cy, innerRadius);
    innerGrad.addColorStop(0, '#bdbdbd');
    innerGrad.addColorStop(0.5, '#9e9e9e');
    innerGrad.addColorStop(1, '#616161');
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    const hlGrad = ctx.createRadialGradient(cx-40, cy-40, 5, cx-20, cy-20, plateRadius*0.6);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();
}

// Ve bat up (giong bowl trong .tx)
function drawCover(ctx, cx, cy, coverRadius) {
    // Bong
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    // Than bat - mau nau giong .tx
    const coverGrad = ctx.createRadialGradient(cx-30, cy-30, 10, cx, cy, coverRadius);
    coverGrad.addColorStop(0, '#A0694F');
    coverGrad.addColorStop(0.5, '#8B5A3C');
    coverGrad.addColorStop(1, '#5D3A1A');
    ctx.beginPath();
    ctx.arc(cx, cy, coverRadius, 0, Math.PI * 2);
    ctx.fillStyle = coverGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Vien bat
    ctx.strokeStyle = '#A0694F';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Highlight bat
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(cx - coverRadius*0.3, cy - coverRadius*0.3, coverRadius*0.35, 0, Math.PI * 2);
    ctx.fill();
}

// ANIMATION FRAME: bat dang up kin (liftPercent = 0 -> 100)
function createXDLift(beads, liftPercent = 0) {
    try {
        const W = 500, H = 320;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');

        // Nen xanh la giong .tx
        ctx.fillStyle = '#2d8a4f';
        ctx.fillRect(0, 0, W, H);

        const cx = W / 2;
        const plateY = 180;
        const plateRadius = 130;
        const coverRadius = 120;

        // Ve dia truoc
        drawPlate(ctx, cx, plateY, plateRadius);

        // Ve 4 hat tren dia (luon hien)
        const beadRadius = 22;
        const spread = 38;
        const positions = [
            { x: cx - spread, y: plateY - spread },
            { x: cx + spread, y: plateY - spread },
            { x: cx - spread, y: plateY + spread },
            { x: cx + spread, y: plateY + spread }
        ];
        beads.forEach((color, i) => {
            drawBead(ctx, positions[i].x, positions[i].y, beadRadius, color === 'red');
        });

        // Ve bat up - nang dan len theo liftPercent
        const maxLift = 250; // px nang len toi da
        const liftAmount = (liftPercent / 100) * maxLift;
        const coverY = plateY - liftAmount;

        if (liftPercent < 100) {
            // Bong bat
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 6;
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(cx + 4, coverY + 4, coverRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            drawCover(ctx, cx, coverY, coverRadius);
        }

        return canvas.toBuffer('image/png');
    } catch (err) {
        console.error('createXDLift error:', err.message);
        return null;
    }
}

// FRAME KET QUA: chi hien dia + hat + label
function createXDResult(beads) {
    try {
        const W = 500, H = 220;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');

        // Nen gradient toi
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#1a1a2e');
        bg.addColorStop(0.5, '#16213e');
        bg.addColorStop(1, '#0f3460');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(231,76,60,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, W-6, H-6);

        const cx = W / 2;
        const cy = 95;
        const plateRadius = 88;

        drawPlate(ctx, cx, cy, plateRadius);

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

        beads.forEach((color, i) => {
            drawBead(ctx, positions[i].x, positions[i].y, beadRadius, color === 'red');
        });

        // Label
        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';

        let label = '';
        let labelColor = '#f1c40f';
        if (red === 4)        { label = '4 Do - BO TU DO!';      labelColor = '#e74c3c'; }
        else if (white === 4) { label = '4 Trang - BO TU TRANG!'; labelColor = '#ecf0f1'; }
        else if (red === 3)   { label = '3 Do  1 Trang';          labelColor = '#e67e22'; }
        else if (white === 3) { label = '3 Trang  1 Do';          labelColor = '#bdc3c7'; }
        else                  { label = '2 Do  2 Trang - CHAN';    labelColor = '#f1c40f'; }

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(W/2 - 160, 188, 320, 26, 8);
        ctx.fill();

        ctx.shadowColor = labelColor;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 17px sans-serif';
        ctx.fillStyle = labelColor;
        ctx.fillText(label, W/2, 207);

        return canvas.toBuffer('image/png');
    } catch (err) {
        console.error('createXDResult error:', err.message);
        return null;
    }
}

module.exports = { createXDLift, createXDResult };

