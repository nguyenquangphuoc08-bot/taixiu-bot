// ============================================
// services/vipbonus.js
// Hệ thống thưởng VIP hàng ngày - lệnh .vipbonus
// ============================================

const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Lấy mốc 0h theo giờ VN (UTC+7)
function getTodayStartVN() {
    const now = new Date();
    const vnOffset = 7 * 60; // phút
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const vnNow = new Date(utc + vnOffset * 60000);
    vnNow.setHours(0, 0, 0, 0);
    // Chuyển lại về timestamp UTC
    return vnNow.getTime() - vnOffset * 60000;
}

function getTimeLeftToMidnightVN() {
    const now = Date.now();
    const todayStart = getTodayStartVN();
    const nextMidnight = todayStart + 24 * 60 * 60 * 1000;
    const timeLeft = nextMidnight - now;
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}p`;
}

// ============================================
// ✏️ CHỈNH SỐ THƯỞNG Ở ĐÂY
// Nếu min === max → cố định (không random)
// Nếu min < max   → random trong khoảng đó
// ============================================
const VIP_DAILY_REWARDS = {
    1:  { min: 10_000_000,    max: 15_000_000    },  // VIP 1:  chỉnh ở đây
    2:  { min: 20_000_000,    max: 25_000_000    },  // VIP 2:  chỉnh ở đây
    3:  { min: 30_000_000,    max: 30_000_000    },  // VIP 3:  chỉnh ở đây
    4:  { min: 40_000_000,    max: 40_000_000    },  // VIP 4:  chỉnh ở đây
    5:  { min: 70_000_000,    max: 90_000_000    },  // VIP 5:  chỉnh ở đây
    6:  { min: 100_000_000,    max: 150_000_000    },  // VIP 6:  chỉnh ở đây
    7:  { min: 200_000_000,    max: 300_000_000    },  // VIP 7:  chỉnh ở đây
    8:  { min: 300_000_000,    max: 500_000_000    },  // VIP 8:  chỉnh ở đây
    9:  { min: 500_000_000,    max: 1_000_000_000    },  // VIP 9:  chỉnh ở đây
    10: { min: 1_000_000_000,   max: 5_000_000_000 },  // VIP 10: 500M ~ 1B random
};
// ============================================

function calcReward(vipLevel) {
    const range = VIP_DAILY_REWARDS[vipLevel];
    if (!range) return 0;
    if (range.min === range.max) return range.min;
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

function getVipIcon(vipLevel) {
    const icons = {
        1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐',
        4: '💎', 5: '💎⭐', 6: '💎💎',
        7: '👑', 8: '👑⭐', 9: '👑💎', 10: '🔥👑'
    };
    return icons[vipLevel] || '⭐';
}

async function handleVipBonus(message) {
    const userId = message.author.id;
    const user = getUser(userId);

    if (!user.vipLevel || user.vipLevel <= 0) {
        return message.reply('❌ Bạn chưa có VIP! Mua VIP tại `.shop` để nhận thưởng hằng ngày nhé!');
    }

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (user.lastVipBonus && user.lastVipBonus >= todayStart.getTime()) {
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const timeLeft = tomorrow.getTime() - now;
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        return message.reply(`⏰ Bạn đã nhận thưởng VIP hôm nay rồi! Quay lại sau **${hours}h ${minutes}p**`);
    }

    const reward = calcReward(user.vipLevel);
    const icon = getVipIcon(user.vipLevel);
    const range = VIP_DAILY_REWARDS[user.vipLevel];

    user.balance += reward;
    user.lastVipBonus = now;
    saveDB();

    const rangeText = range.min === range.max
        ? `${formatNumber(range.min)} Mcoin/ngày (cố định)`
        : `${formatNumber(range.min)} ~ ${formatNumber(range.max)} Mcoin/ngày (random)`;

    const embed = new EmbedBuilder()
        .setTitle(`${icon} NHẬN THƯỞNG VIP ${user.vipLevel} THÀNH CÔNG!`)
        .setColor('#f1c40f')
        .setThumbnail(message.author.displayAvatarURL({ extension: 'png', size: 256 }))
        .addFields(
            { name: `${icon} Cấp VIP`,      value: `VIP ${user.vipLevel}`,        inline: true },
            { name: '🎁 Nhận được',          value: `**${formatNumber(reward)}**`, inline: true },
            { name: '💰 Số dư mới',          value: formatNumber(user.balance),    inline: true },
            { name: '📊 Thưởng hàng ngày',  value: rangeText,                     inline: false }
        )
        .setFooter({ text: 'Quay lại sau 0h ngày mai!' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

module.exports = { handleVipBonus };
