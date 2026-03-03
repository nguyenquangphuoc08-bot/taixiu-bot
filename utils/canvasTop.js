// utils/canvasTop.js
const { createCanvas, loadImage } = require('@napi-rs/canvas');

function fmt(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0','') + 'b';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
    return num.toLocaleString('en-US');
}

async function createTopImage(txTop, xdTop) {
    const W = 860, H = 530;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0d0d1a');
    bg.addColorStop(0.5, '#1a0d2e');
    bg.addColorStop(1, '#0d1a2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Vien
    ctx.strokeStyle = 'rgba(255,215,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, W-8, H-8);

    // Tieu de
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BANG XEP HANG THANG HOC NAY', W/2, 42);

    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 54);
    ctx.lineTo(W-20, 54);
    ctx.stroke();

    const colW = W / 2 - 15;
    drawColumn(ctx, txTop, 10, 58, colW, 'TAI XIU', '#4fc3f7');

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W/2, 58);
    ctx.lineTo(W/2, H-20);
    ctx.stroke();

    drawColumn(ctx, xdTop, W/2 + 5, 58, colW, 'XOC DIA', '#ef9a9a');

    const now = new Date();
    const vnTime = new Date(now.getTime() + 7*60*60*1000);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Cap nhat: ' + vnTime.toLocaleTimeString('vi-VN') + ' ' + vnTime.toLocaleDateString('vi-VN'), W-14, H-8);

    return canvas.toBuffer('image/png');
}

function drawColumn(ctx, top5, x, y, w, title, color) {
    const MEDALS = ['#FFD700','#C0C0C0','#CD7F32','#aaaaaa','#888888'];
    const RANK   = ['#1','#2','#3','#4','#5'];
    const PRIZES = ['+100m','+50m','+30m','+15m','+15m'];
    const rowH   = 74;
    const startY = y + 44;

    // Header cot
    ctx.fillStyle = color;
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w/2, y + 24);

    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x+10, y+32);
    ctx.lineTo(x+w-10, y+32);
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
        const entry = top5[i] || null;
        const ry = startY + i * rowH;

        // Row bg
        const rowBg = ctx.createLinearGradient(x, ry, x+w, ry);
        if (i === 0 && entry) {
            rowBg.addColorStop(0, 'rgba(255,215,0,0.18)');
            rowBg.addColorStop(1, 'rgba(255,215,0,0.04)');
        } else {
            rowBg.addColorStop(0, 'rgba(255,255,255,0.06)');
            rowBg.addColorStop(1, 'rgba(255,255,255,0.02)');
        }
        ctx.fillStyle = rowBg;
        ctx.beginPath();
        ctx.roundRect(x+6, ry+2, w-12, rowH-4, 8);
        ctx.fill();

        if (!entry) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('-- Trong --', x + w/2, ry + rowH/2 + 5);
            continue;
        }

        // Medal
        ctx.fillStyle = MEDALS[i];
        ctx.beginPath();
        ctx.arc(x+26, ry+rowH/2, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(RANK[i], x+26, ry+rowH/2+4);

        // Avatar circle
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x+60, ry+rowH/2, 20, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();

        // Ten user
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        const name = (entry.name || 'Unknown').substring(0, 14);
        ctx.fillText(name, x+88, ry+rowH/2-5);

        // So thang
        ctx.fillStyle = color;
        ctx.font = '13px sans-serif';
        ctx.fillText('Thang: ' + fmt(entry.win), x+88, ry+rowH/2+13);

        // Phan thuong
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(PRIZES[i], x+w-10, ry+rowH/2+5);
    }
}

module.exports = { createTopImage };
