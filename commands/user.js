// commands/user.js - CẬP NHẬT VỚI .setbg

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database, getUser, saveDB } = require('../utils/database');
const { createProfileCard } = require('../utils/canvas');

// Lệnh: .mcoin (CHỈ HIỂN THỊ ẢNH)
async function handleMcoin(message) {
    const user = getUser(message.author.id);
    
    // Lấy avatar URL
    const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 256 });
    
    // Tạo profile card
    const profileBuffer = await createProfileCard(message.author, user, avatarUrl);
    
    if (!profileBuffer) {
        return message.reply('❌ Không thể tạo profile card!');
    }
    
    // ✅ CHỈ GỬI ẢNH, KHÔNG CÓ TEXT
    const attachment = new AttachmentBuilder(profileBuffer, { name: 'profile.png' });
    
    await message.reply({ 
        files: [attachment] 
    });
}

// ✅ LỆNH MỚI: .setbg (Upload ảnh nền)
async function handleSetBg(message, args) {
    const user = getUser(message.author.id);
    
    // ✅ XỬ LÝ: .setbg reset
    if (args && args[0] && args[0].toLowerCase() === 'reset') {
        user.customBg = null;
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('🗑️ ĐÃ XÓA ẢNH NỀN')
            .setColor('#e74c3c')
            .setDescription(`
Ảnh nền đã được đặt về mặc định (hồng).

📝 **Xem ngay:** Gõ \`.mcoin\`
🎨 **Đặt ảnh mới:** Upload ảnh + \`.setbg\`
            `)
            .setFooter({ text: 'Profile card bây giờ dùng ảnh nền hồng' });
        
        return message.reply({ embeds: [embed] });
    }
    
    // ✅ XỬ LÝ: .setbg <URL>
    if (args && args[0] && args[0].startsWith('http')) {
        try {
            // Test xem URL có load được không
            const { loadImage } = require('canvas');
            await loadImage(args[0]);
            
            user.customBg = args[0];
            saveDB();
            
            const embed = new EmbedBuilder()
                .setTitle('✅ ĐÃ ĐẶT ẢNH NỀN TỪ URL!')
                .setColor('#2ecc71')
                .setDescription(`
Ảnh nền của bạn đã được cập nhật!

📝 **Xem ngay:** Gõ \`.mcoin\`
🔄 **Đổi ảnh khác:** Upload ảnh mới + \`.setbg\`
🗑️ **Xóa ảnh:** Gõ \`.setbg reset\`
                `)
                .setImage(args[0])
                .setFooter({ text: 'Ảnh sẽ hiển thị ở profile card của bạn' })
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
            
        } catch (error) {
            return message.reply('❌ URL ảnh không hợp lệ hoặc không thể tải được!');
        }
    }
    
    // ✅ XỬ LÝ: .setbg (không có gì) → HƯỚNG DẪN
    if (message.attachments.size === 0) {
        const embed = new EmbedBuilder()
            .setTitle('🎨 HỖ TRỢ ĐẶT ẢNH NỀN')
            .setColor('#9b59b6')
            .setDescription(`
**Cách dùng:**

**1️⃣ Upload ảnh từ máy:**
• Nhấn icon 📎 (đính kèm file)
• Chọn ảnh từ máy
• Trong ô "Add a comment", gõ: \`.setbg\`
• Gửi tin nhắn

**2️⃣ Dùng link ảnh:**
\`.setbg <URL>\`
Ví dụ: \`.setbg https://i.imgur.com/abc.png\`

**3️⃣ Xóa ảnh nền:**
\`.setbg reset\` - Về mặc định (hồng)

**Ảnh hiện tại:**
${user.customBg ? '✅ Đã có ảnh nền tùy chỉnh' : '❌ Đang dùng ảnh mặc định (hồng)'}
            `)
            .setFooter({ text: 'Khuyến nghị: Ảnh 500x250 px, JPG/PNG' });
        
        return message.reply({ embeds: [embed] });
    }
    
    // ✅ XỬ LÝ: Upload ảnh
    const attachment = message.attachments.first();
    
    // Kiểm tra có phải ảnh không
    if (!attachment.contentType?.startsWith('image/')) {
        return message.reply('❌ File đính kèm phải là ảnh (JPG, PNG, GIF)!');
    }
    
    // Kiểm tra kích thước (tối đa 8MB)
    if (attachment.size > 8 * 1024 * 1024) {
        return message.reply('❌ Ảnh quá lớn! Tối đa 8MB.');
    }
    
    // Lưu URL ảnh vào database
    user.customBg = attachment.url;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('✅ ĐÃ ĐẶT ẢNH NỀN MỚI!')
        .setColor('#2ecc71')
        .setDescription(`
Ảnh nền của bạn đã được cập nhật!

📝 **Xem ngay:** Gõ \`.mcoin\`
🔄 **Đổi ảnh khác:** Upload ảnh mới + \`.setbg\`
🗑️ **Xóa ảnh:** Gõ \`.setbg reset\`
        `)
        .setImage(attachment.url)
        .setFooter({ text: 'Ảnh sẽ hiển thị ở profile card của bạn' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Lệnh: .tang
async function handleTang(message, args) {
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[2]);
    
    if (!targetUser) {
        return message.reply('❌ Sử dụng: `.tang @user [số tiền]`\nVí dụ: `.tang @Tên 100000`');
    }
    
    if (!amount || amount < 10000) {
        return message.reply('❌ Số tiền phải ít nhất 10,000 Mcoin!');
    }
    
    const sender = getUser(message.author.id);
    
    if (sender.balance < amount) {
        return message.reply(`❌ Số dư không đủ! Bạn có: **${sender.balance.toLocaleString('en-US')} Mcoin**`);
    }
    
    if (targetUser.id === message.author.id) {
        return message.reply('❌ Không thể tặng tiền cho chính mình!');
    }
    
    const receiver = getUser(targetUser.id);
    sender.balance -= amount;
    receiver.balance += amount;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('💝 TẶNG TIỀN THÀNH CÔNG!')
        .setColor('#e91e63')
        .setDescription(`<@${message.author.id}> đã tặng **${amount.toLocaleString('en-US')} Mcoin** cho <@${targetUser.id}>!`)
        .addFields(
            { name: '💰 Số dư người gửi', value: `${sender.balance.toLocaleString('en-US')} Mcoin`, inline: true },
            { name: '💰 Số dư người nhận', value: `${receiver.balance.toLocaleString('en-US')} Mcoin`, inline: true }
        )
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Lệnh: .diemdanh (có VIP bonus)
async function handleDiemDanh(message) {
    const userId = message.author.id;
    const now = Date.now();
    const lastCheckin = database.lastCheckin[userId] || 0;
    const timeLeft = lastCheckin + (8 * 60 * 60 * 1000) - now;
    
    if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        return message.reply(`⏰ Bạn đã điểm danh rồi! Quay lại sau **${hours}h ${minutes}phút**`);
    }
    
    const user = getUser(userId);
    const streak = user.dailyQuests?.streak || 0;
    const multiplier = streak >= 3 ? 2 : 1;
    
    // Base reward
    let reward = 3000000 * multiplier;
    
    // VIP bonus
    const vipBonus = user.vipBonus?.dailyBonus || 0;
    reward += vipBonus;
    
    user.balance += reward;
    database.lastCheckin[userId] = now;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 ĐIỂM DANH THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Bạn nhận được **${reward.toLocaleString('en-US')} Mcoin**!
${multiplier === 2 ? '✨ **X2 nhờ chuỗi 3+ ngày làm nhiệm vụ!**' : ''}
${vipBonus > 0 ? `⭐ **+${vipBonus.toLocaleString('en-US')} Mcoin từ VIP!**` : ''}
        `)
        .addFields(
            {
                name: '💰 Số dư mới',
                value: `${user.balance.toLocaleString('en-US')} Mcoin`
            },
            {
                name: '🔥 Chuỗi nhiệm vụ',
                value: `${streak} ngày ${streak >= 3 ? '(Đang x2!)' : '(Cần 3+ để x2)'}`
            }
        )
        .setFooter({ text: 'Quay lại sau 8 giờ | Làm .daily để giữ chuỗi!' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

module.exports = {
    handleMcoin,
    handleSetBg,
    handleTang,
    handleDiemDanh
};
