// commands/user.js - .mcoin HIỆN ẢNH + TEXT

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database, getUser, saveDB } = require('../utils/database');
const { createProfileCard } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');

// ===== FORMAT SỐ VN STYLE (dấu chấm) =====
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ===== .mcoin - CHỈ HIỂN THỊ 3 THÔNG TIN =====
async function handleMcoin(message) {
    const user = getUser(message.author.id);
    const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 256 });
    const profileBuffer = await createProfileCard(message.author, user, avatarUrl);
    
    if (!profileBuffer) {
        return message.reply('❌ Không thể tạo profile card!');
    }
    
    const attachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });
    
    // ===== CHỈ 3 THÔNG TIN =====
    const balanceDisplay = formatNumber(user.balance);
    const vipLevel = user.vipLevel || 0;
    const title = user.vipTitle || 'Thường';
    
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
            .setDescription(`
**1️⃣ Upload ảnh:** Đính kèm ảnh + gõ \`.setbg\`
**2️⃣ Dùng URL:** \`.setbg <link>\`
**3️⃣ Xóa ảnh:** \`.setbg reset\`
            `)
            .setFooter({ text: 'Khuyến nghị: 500x250px' });
        
        return message.reply({ embeds: [embed] });
    }
    
    const attachment = message.attachments.first();
    
    if (!attachment.contentType?.startsWith('image/')) {
        return message.reply('❌ File phải là ảnh!');
    }
    
    if (attachment.size > 8 * 1024 * 1024) {
        return message.reply('❌ Ảnh quá lớn! Tối đa 8MB');
    }
    
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
    
    if (!targetUser) {
        return message.reply('❌ Sử dụng: `.tang @user [số]`');
    }
    
    if (!amount || amount < 10000) {
        return message.reply('❌ Tối thiểu 10,000 Mcoin!');
    }
    
    const sender = getUser(message.author.id);
    
    if (sender.balance < amount) {
        return message.reply(`❌ Không đủ! Bạn có: **${formatNumber(sender.balance)}**`);
    }
    
    if (targetUser.id === message.author.id) {
        return message.reply('❌ Không thể tự tặng!');
    }
    
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
    const lastCheckin = database.lastCheckin[userId] || 0;
    const timeLeft = lastCheckin + (8 * 60 * 60 * 1000) - now;
    
    if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        return message.reply(`⏰ Đã điểm danh rồi! Quay lại sau **${hours}h ${minutes}p**`);
    }
    
    const user = getUser(userId);
    
    let reward = 3000000;
    const vipBonus = user.vipBonus?.dailyBonus || 0;
    reward += vipBonus;
    
    user.balance += reward;
    database.lastCheckin[userId] = now;
    saveDB();
    
    updateQuest(userId, 3);
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 ĐIỂM DANH THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`Bạn nhận được **${formatNumber(reward)}**!\n${vipBonus > 0 ? `⭐ **+${formatNumber(vipBonus)}** từ VIP` : ''}`)
        .addFields({
            name: '💰 Số dư mới',
            value: formatNumber(user.balance)
        })
        .setFooter({ text: 'Quay lại sau 8 giờ' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

module.exports = {
    handleMcoin,
    handleSetBg,
    handleTang,
    handleDiemDanh,
    handleDaily,
    handleClaimAll
};

