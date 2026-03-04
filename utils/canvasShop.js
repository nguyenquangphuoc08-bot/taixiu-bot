// utils/canvasShop.js
const { createCanvas, loadImage } = require('@napi-rs/canvas');

function fmt(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'b';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k';
    return num.toLocaleString('en-US');
}

// VIP emoji icons de ve
const VIP_ICONS = {
    vip1:  { emoji: '⭐',     color: '#aaaaaa', bg: '#2a2a3a', label: 'VIP 1'  },
    vip2:  { emoji: '⭐⭐',   color: '#bbbbbb', bg: '#2a2a3a', label: 'VIP 2'  },
    vip3:  { emoji: '⭐⭐⭐', color: '#cccccc', bg: '#2a2a3a', label: 'VIP 3'  },
    vip4:  { emoji: '💎',     color: '#4fc3f7', bg: '#1a2a3a', label: 'VIP 4'  },
    vip5:  { emoji: '💎⭐',   color: '#29b6f6', bg: '#1a2535', label: 'VIP 5'  },
    vip6:  { emoji: '💎💎',   color: '#00bcd4', bg: '#1a2a2a', label: 'VIP 6'  },
    vip7:  { emoji: '👑',     color: '#FFD700', bg: '#2a2000', label: 'VIP 7'  },
    vip8:  { emoji: '👑⭐',   color: '#FFB300', bg: '#2a1a00', label: 'VIP 8'  },
    vip9:  { emoji: '👑💎',   color: '#FF8C00', bg: '#2a1500', label: 'VIP 9'  },
    vip10: { emoji: '🔥👑',   color: '#FF4500', bg: '#3a0a00', label: 'VIP 10' },
};

const TITLE_ICONS = {
    title_tanhu:    { emoji: '🌱', color: '#81c784', bg: '#1a2a1a', label: 'Tân Thủ'   },
    title_caothu:   { emoji: '⚔️', color: '#64b5f6', bg: '#1a1a2a', label: 'Cao Thủ'   },
    title_banthan:  { emoji: '🌙', color: '#ce93d8', bg: '#2a1a2a', label: 'Bán Thần'  },
    title_devuong:  { emoji: '👑', color: '#FFD700', bg: '#2a2000', label: 'Đế Vương'  },
    title_daithanh: { emoji: '🌟', color: '#fff176', bg: '#2a2a00', label: 'Đại Thánh' },
    title_chienthan:{ emoji: '🔥', color: '#FF4500', bg: '#3a0a00', label: 'Chiến Thần'},
};

// Ve 1 card item
function drawCard(ctx, x, y, w, h, item, info, owned, isTitle) {
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
        ctx.roundRect(x + w - 36, y + 6, 30, 18, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', x + w - 21, y + 18);
    }

    // Icon vong tron
    const cx = x + w / 2;
    const iconY = y + 52;
    const r = 32;

    const iconGrad = ctx.createRadialGradient(cx, iconY, 0, cx, iconY, r);
    iconGrad.addColorStop(0, info.color + '33');
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

    // Emoji icon
    ctx.font = `${isTitle ? 28 : 24}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.emoji, cx, iconY);
    ctx.textBaseline = 'alphabetic';

    // Ten item
    ctx.fillStyle = info.color;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    const label = info.label;
    ctx.fillText(label, cx, y + 96);

    // Gia
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(fmt(item.price), cx, y + 114);

    // Bonus nho
    let bonusText = '';
    if (isTitle) {
        bonusText = `+${item.dailyBonus}% dd`;
        if (item.betBonus > 0) bonusText += ` +${item.betBonus}% TH`;
    } else {
        bonusText = `+${item.betBonus}% TH`;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '10px sans-serif';
    ctx.fillText(bonusText, cx, y + 128);
}

async function createShopImage(items, pageTitle, userOwnedIds, currentPage, totalPages) {
    const COLS = 4;
    const ROWS = Math.ceil(items.length / COLS);
    const CARD_W = 140;
    const CARD_H = 145;
    const PAD = 14;
    const HEADER_H = 60;
    const FOOTER_H = 44;

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
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏪 ROT SHOP — ${pageTitle}`, W / 2, 38);

    // Cards
    items.forEach((item, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = PAD + col * (CARD_W + PAD);
        const y = HEADER_H + PAD + row * (CARD_H + PAD);

        const isTitle = item.id.startsWith('title_');
        const iconMap = isTitle ? TITLE_ICONS : VIP_ICONS;
        const info = iconMap[item.id] || { emoji: '❓', color: '#aaa', bg: '#1a1a1a', label: item.id };
        const owned = userOwnedIds.includes(item.id);

        drawCard(ctx, x, y, CARD_W, CARD_H, item, info, owned, isTitle);
    });

    // Footer trang
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Trang ${currentPage} / ${totalPages}  •  Chọn vật phẩm từ menu bên dưới`, W / 2, H - 14);

    return canvas.toBuffer('image/png');
}

module.exports = { createShopImage };
