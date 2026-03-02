// commands/user.js - ĐÃ THÊM .INFO VÀ MESSAGE REWARDS

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database, getUser, saveDB } = require('../utils/database');
const { createProfileCard } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Lấy mốc 0h theo giờ VN (UTC+7)
function getTodayStartVN() {
    const vnOffset = 7 * 60;
    const utc = Date.now() + new Date().getTimezoneOffset() * 60000;
    const vnNow = new Date(utc + vnOffset * 60000);
    vnNow.setHours(0, 0, 0, 0);
    return vnNow.getTime() - vnOffset * 60000;
}

function getTimeLeftToMidnightVN() {
    const now = Date.now();
    const nextMidnight = getTodayStartVN() + 24 * 60 * 60 * 1000;
    const timeLeft = nextMidnight - now;
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}p`;
}

async function handleMcoin(message) {
    const user = getUser(message.author.id);
    const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 256 });
    const profileBuffer = await createProfileCard(message.author, user, avatarUrl);
    
    if (!profileBuffer) {
        return message.reply('❌ Không thể tạo profile card!');
    }
    
    const attachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });
    const balanceDisplay = formatNumber(user.balance);
    
    await message.reply({ 
        content: `💎 | **${message.author.username}**, bạn hiện có: **${balanceDisplay} Mcoin**.`,
        files: [attachment] 
    });
}

async function handleSetBg(message, args) {
    const user = getUser(message.author.id);
    
    if (args && args[0] && args[0].toLowerCase() === 'reset') {
        user.customBg = null;
        saveDB();
        const embed = new EmbedBuilder()
            .setTitle('🗑️ ĐÃ XÓA ẢNH NỀN')
            .setColor('#e74c3c')
            .setDescription(`Ảnh nền đã được đặt về mặc định.\n\n📝 **Xem ngay:** Gõ \`.mcoin\``)
            .setFooter({ text: 'Ảnh nền mặc định' });
        return message.reply({ embeds: [embed] });
    }
    
    if (args && args[0] && args[0].startsWith('http')) {
        try {
            const { loadImage } = require('@napi-rs/canvas');
            await loadImage(args[0]);
            user.customBg = args[0];
            saveDB();
            const embed = new EmbedBuilder()
                .setTitle('✅ ĐÃ ĐẶT ẢNH NỀN!')
                .setColor('#2ecc71')
                .setDescription(`Ảnh nền đã cập nhật!\n\n📝 **Xem ngay:** Gõ \`.mcoin\``)
                .setImage(args[0])
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply('❌ URL ảnh không hợp lệ!');
        }
    }
    
    if (message.attachments.size === 0) {
        const embed = new EmbedBuilder()
            .setTitle('🎨 HƯỚNG DẪN ĐẶT ẢNH NỀN')
            .setColor('#9b59b6')
            .setDescription(`**1️⃣ Upload ảnh:** Đính kèm ảnh + gõ \`.setbg\`\n**2️⃣ Dùng URL:** \`.setbg <link>\`\n**3️⃣ Xóa ảnh:** \`.setbg reset\``)
            .setFooter({ text: 'Khuyến nghị: 500x250px' });
        return message.reply({ embeds: [embed] });
    }
    
    const attachment = message.attachments.first();
    if (!attachment.contentType?.startsWith('image/')) return message.reply('❌ File phải là ảnh!');
    if (attachment.size > 8 * 1024 * 1024) return message.reply('❌ Ảnh quá lớn! Tối đa 8MB');
    
    user.customBg = attachment.url;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('✅ ĐÃ ĐẶT ẢNH NỀN!')
        .setColor('#2ecc71')
        .setDescription(`Ảnh nền đã cập nhật!\n\n📝 **Xem ngay:** Gõ \`.mcoin\``)
        .setImage(attachment.url)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function handleTang(message, args) {
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[2]);
    
    if (!targetUser) return message.reply('❌ Sử dụng: `.tang @user [số]`');
    if (!amount || amount <= 0) return message.reply('❌ Số tiền phải lớn hơn 0!');
    
    const sender = getUser(message.author.id);
    if (sender.balance < amount) return message.reply(`❌ Không đủ! Bạn có: **${formatNumber(sender.balance)}**`);
    if (targetUser.id === message.author.id) return message.reply('❌ Không thể tự tặng!');
    
    const receiver = getUser(targetUser.id);
    sender.balance -= amount;
    receiver.balance += amount;
    saveDB();
    
    updateQuest(message.author.id, 5);
    
    const embed = new EmbedBuilder()
        .setTitle('💝 TẶNG TIỀN THÀNH CÔNG!')
        .setColor('#e91e63')
        .setDescription(`<@${message.author.id}> đã tặng **${formatNumber(amount)}** cho <@${targetUser.id}>!`)
        .addFields(
            { name: '💰 Người gửi', value: formatNumber(sender.balance), inline: true },
            { name: '💰 Người nhận', value: formatNumber(receiver.balance), inline: true }
        )
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function handleDiemDanh(message) {
    const userId = message.author.id;
    const now = Date.now();
    const user = getUser(userId);

    // Reset theo 0h mỗi ngày giờ Việt Nam (UTC+7)
    const VN_OFFSET = 7 * 60 * 60 * 1000;
    const nowVN = now + VN_OFFSET;
    const todayStartVN = nowVN - (nowVN % (24 * 60 * 60 * 1000));
    const todayStartUTC = todayStartVN - VN_OFFSET;

    const lastCheckin = database.lastCheckin[userId] || 0;

    if (lastCheckin >= todayStartUTC) {
        return message.reply('⏰ Đã điểm danh hôm nay rồi!');
    }
    
    const base = 100000; // 100K
    let reward = base;
    let bonusText = '';
    
    const vipDailyBonus = user.vipBonus?.dailyBonus || 0;
    if (vipDailyBonus > 0) {
        const vipBonusAmount = Math.floor(base * vipDailyBonus / 100);
        reward += vipBonusAmount;
        bonusText += `⭐ VIP: +${formatNumber(vipBonusAmount)} (${vipDailyBonus}%)\n`;
    }
    
    const titleDailyBonus = user.titleBonus?.dailyBonus || 0;
    if (titleDailyBonus > 0) {
        const titleBonusAmount = Math.floor(base * titleDailyBonus / 100);
        reward += titleBonusAmount;
        bonusText += `👑 ${user.vipTitle}: +${formatNumber(titleBonusAmount)} (${titleDailyBonus}%)\n`;
    }
    
    user.balance += reward;
    database.lastCheckin[userId] = now;
    saveDB();
    
    updateQuest(userId, 3);
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 ĐIỂM DANH THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`Bạn nhận được **${formatNumber(reward)}**!\n${bonusText}`)
        .addFields({ name: '💰 Số dư mới', value: formatNumber(user.balance) })
        .setFooter({ text: 'Reset lúc 0h giờ VN mỗi ngày!' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function handleInfo(message) {
    const userId = message.author.id;
    const user = getUser(userId);
    
    if (!user.messageStats) {
        user.messageStats = { today: 0, week: 0, month: 0, lastReward: 0, weeklyRewardClaimed: false };
    }
    
    const allUsers = Object.values(database.users);
    const todayRank = allUsers.filter(u => (u.messageStats?.today || 0) > user.messageStats.today).length + 1;
    const weekRank = allUsers.filter(u => (u.messageStats?.week || 0) > user.messageStats.week).length + 1;
    const monthRank = allUsers.filter(u => (u.messageStats?.month || 0) > user.messageStats.month).length + 1;
    
    const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTitle(`📊 THỐNG KÊ HOẠT ĐỘNG`)
        .setDescription(`**${message.author.username}**`)
        .addFields(
            { name: '📅 HÔM NAY', value: `\`\`\`ansi\n💬 Tin nhắn: \u001b[1;36m${user.messageStats.today}\u001b[0m\n💎 Hạng:     \u001b[1;33m#${todayRank}\u001b[0m\n\`\`\``, inline: true },
            { name: '📆 TUẦN NÀY', value: `\`\`\`ansi\n💬 Tin nhắn: \u001b[1;36m${user.messageStats.week}\u001b[0m\n💎 Hạng:     \u001b[1;33m#${weekRank}\u001b[0m\n\`\`\``, inline: true },
            { name: '📊 THÁNG NÀY', value: `\`\`\`ansi\n💬 Tin nhắn: \u001b[1;36m${user.messageStats.month}\u001b[0m\n💎 Hạng:     \u001b[1;33m#${monthRank}\u001b[0m\n\`\`\``, inline: true }
        )
        .setFooter({ text: 'mxtbot.com', iconURL: message.client.user.displayAvatarURL() })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

function updateMessageStats(userId, channel) {
    const user = getUser(userId);
    
    if (!user.messageStats) {
        user.messageStats = { today: 0, week: 0, month: 0, lastReward: 0, weeklyRewardClaimed: false };
    }
    
    user.messageStats.today++;
    user.messageStats.week++;
    user.messageStats.month++;
    
    if (user.messageStats.today > 0 && user.messageStats.today % 20 === 0 && user.messageStats.lastReward !== user.messageStats.today) {
        const reward = Math.floor(Math.random() * 9000000 + 1000000);
        user.balance += reward;
        user.messageStats.lastReward = user.messageStats.today;
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('🎉 THƯỞNG HOẠT ĐỘNG!')
            .setColor('#f39c12')
            .setDescription(`Bạn nhận **${formatNumber(reward)} Mcoin** vì đã gửi **${user.messageStats.today} tin nhắn** hôm nay!`)
            .setFooter({ text: 'Tiếp tục chat để nhận thêm thưởng!' });
        
        channel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => {});
        return;
    }
    
    if (user.messageStats.week >= 1000 && !user.messageStats.weeklyRewardClaimed) {
        const reward = Math.floor(Math.random() * 100000000 + 100000000);
        user.balance += reward;
        user.messageStats.weeklyRewardClaimed = true;
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 THƯỞNG TUẦN SIÊU TO!')
            .setColor('#e74c3c')
            .setDescription(`Chúc mừng! Bạn nhận **${formatNumber(reward)} Mcoin** vì đã gửi **${user.messageStats.week} tin nhắn** tuần này!`)
            .setFooter({ text: 'Bạn thật tuyệt vời!' });
        
        channel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => {});
    }
    
    saveDB();
}

module.exports = {
    handleMcoin,
    handleSetBg,
    handleTang,
    handleDiemDanh,
    handleInfo,
    updateMessageStats
};

