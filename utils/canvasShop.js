// utils/canvasShop.js
const { createCanvas } = require('@napi-rs/canvas');

function fmt(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'b';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k';
    return num.toLocaleString('en-US');
}

function fmtKC(n) {
    return n >= 1000 ? (n / 1000) + 'k' : String(n);
}

const VIP_ICONS = {
    vip1:  { color: '#aaaaaa', bg: '#2a2a3a', label: 'VIP 1'  },
    vip2:  { color: '#bbbbbb', bg: '#2a2a3a', label: 'VIP 2'  },
    vip3:  { color: '#cccccc', bg: '#2a2a3a', label: 'VIP 3'  },
    vip4:  { color: '#4fc3f7', bg: '#1a2a3a', label: 'VIP 4'  },
    vip5:  { color: '#29b6f6', bg: '#1a2535', label: 'VIP 5'  },
    vip6:  { color: '#00bcd4', bg: '#1a2a2a', label: 'VIP 6'  },
    vip7:  { color: '#FFD700', bg: '#2a2000', label: 'VIP 7'  },
    vip8:  { color: '#FFB300', bg: '#2a1a00', label: 'VIP 8'  },
    vip9:  { color: '#FF8C00', bg: '#2a1500', label: 'VIP 9'  },
    vip10: { color: '#FF4500', bg: '#3a0a00', label: 'VIP 10' },
};

const TITLE_ICONS = {
    title_tanhu:     { color: '#81c784', bg: '#1a2a1a', label: 'Tan Thu'    },
    title_caothu:    { color: '#64b5f6', bg: '#1a1a2a', label: 'Cao Thu'    },
    title_banthan:   { color: '#ce93d8', bg: '#2a1a2a', label: 'Ban Than'   },
    title_devuong:   { color: '#FFD700', bg: '#2a2000', label: 'De Vuong'   },
    title_daithanh:  { color: '#fff176', bg: '#2a2a00', label: 'Dai Thanh'  },
    title_chienthan: { color: '#FF4500', bg: '#3a0a00', label: 'Chien Than' },
};

const FRAME_ICONS = {
    frame_gold:   { color: '#FFD700', bg: '#2a2000', label: 'Khung Vang' },
    frame_fire:   { color: '#FF4500', bg: '#3a0a00', label: 'Khung Lua'  },
    frame_ice:    { color: '#00BFFF', bg: '#001a2a', label: 'Khung Bang' },
    frame_purple: { color: '#9B59B6', bg: '#1a0a2a', label: 'Khung Tim'  },
    frame_green:  { color: '#2ecc71', bg: '#0a2a1a', label: 'Khung Xanh' },
};

function getIconInfo(item) {
    if (item.id.startsWith('title_')) return TITLE_ICONS[item.id] || { color: '#aaaaaa', bg: '#1a1a1a', label: item.id };
    if (item.id.startsWith('frame_')) return FRAME_ICONS[item.id] || { color: '#aaaaaa', bg: '#1a1a1a', label: item.id };
    return VIP_ICONS[item.id] || { color: '#aaaaaa', bg: '#1a1a1a', label: item.id };
}

function drawCard(ctx, x, y, w, h, item, owned) {
    const info = getIconInfo(item);
    const isTitle = item.id.startsWith('title_');
    const isFrame = item.id.startsWith('frame_');
    const isVip = !isTitle && !isFrame;
    const cx = x + w / 2;

    // Card bg
    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, info.bg);
    bgGrad.addColorStop(1, '#111118');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();

    // Vien card
    ctx.strokeStyle = owned ? '#2ecc71' : info.color + '66';
    ctx.lineWidth = owned ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.stroke();

    // Owned badge
    if (owned) {
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.roundRect(x + w - 34, y + 5, 28, 16, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DA CO', x + w - 20, y + 16);
    }

    // Icon vong tron
    const iconY = y + 48;
    const r = 28;
    const iconGrad = ctx.createRadialGradient(cx, iconY, 0, cx, iconY, r);
    iconGrad.addColorStop(0, info.color + '44');
    iconGrad.addColorStop(1, info.color + '11');
    ctx.fillStyle = iconGrad;
    ctx.beginPath();
    ctx.arc(cx, iconY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = info.color + '99';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, iconY, r, 0, Math.PI * 2);
    ctx.stroke();

    // Ten item
    ctx.fillStyle = info.color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(info.label, cx, y + 88);

    // Gia: "2b + 1kKC | +25% TH"
    let priceStr = fmt(item.price);
    if (isVip && item.kcPrice > 0) {
        priceStr += ' + ' + fmtKC(item.kcPrice) + 'KC';
    }

    let bonusStr = '';
    if (isTitle) {
        bonusStr = `+${item.dailyBonus}%dd`;
        if (item.betBonus > 0) bonusStr += ` +${item.betBonus}%TH`;
    } else if (isVip) {
        bonusStr = `+${item.betBonus}%TH`;
    } else if (isFrame) {
        bonusStr = 'Khung profile';
    }

    // 1 dong: "2b + 1kKC | +25%TH"
    const fullLine = bonusStr ? `${priceStr} | ${bonusStr}` : priceStr;

    // Do dai chu, neu qua dai thi xuong font
    ctx.font = 'bold 10px sans-serif';
    const measured = ctx.measureText(fullLine).width;
    if (measured > w - 8) {
        // Xuong 2 dong
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(priceStr, cx, y + 104);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px sans-serif';
        ctx.fillText(bonusStr, cx, y + 116);
    } else {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(fullLine, cx, y + 108);
    }
}

async function createShopImage(items, pageTitle, userOwnedIds, currentPage, totalPages) {
    const COLS = 4;
    const ROWS = Math.ceil(items.length / COLS);
    const CARD_W = 148;
    const CARD_H = 130;
    const PAD = 12;
    const HEADER_H = 58;
    const FOOTER_H = 40;

    const W = COLS * CARD_W + (COLS + 1) * PAD;
    const H = HEADER_H + ROWS * CARD_H + (ROWS + 1) * PAD + FOOTER_H;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0e0e1c');
    bg.addColorStop(1, '#1a1020');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = 'rgba(255,215,0,0.08)';
    ctx.fillRect(0, 0, W, HEADER_H);
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_H);
    ctx.lineTo(W, HEADER_H);
    ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ROT SHOP — ${pageTitle}`, W / 2, 36);

    // Cards
    items.forEach((item, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = PAD + col * (CARD_W + PAD);
        const y = HEADER_H + PAD + row * (CARD_H + PAD);
        const owned = userOwnedIds.includes(item.id);
        drawCard(ctx, x, y, CARD_W, CARD_H, item, owned);
    });

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Trang ${currentPage} / ${totalPages}  •  Chon vat pham tu menu ben duoi`, W / 2, H - 12);

    return canvas.toBuffer('image/png');
}

module.exports = { createShopImage };
