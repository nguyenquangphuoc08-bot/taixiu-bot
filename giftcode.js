const { EmbedBuilder } = require('discord.js');
const giftcode = require('../giftcode');
const { getUser, saveDB } = require('../utils/database');

const ADMIN_ID = '1100660298073002004';

// Lệnh: .giftcode (Admin tạo code)
async function handleCreateGiftcode(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới tạo được giftcode!');
    }
    
    let customReward = null;
    let customHours = 2;
    
    if (args[1]) {
        customReward = parseInt(args[1]);
        if (isNaN(customReward) || customReward < 1000000) {
            return message.reply('❌ Số tiền phải >= 1,000,000 Mcoin!\n\n**Cách dùng:**\n`.giftcode [số tiền] [số giờ]`\n\n**Ví dụ:**\n`.giftcode 50000000 5` → 50M Mcoin, 5 giờ\n`.giftcode` → Random 5M-1000M, 2 giờ');
        }
    }
    
    if (args[2]) {
        customHours = parseInt(args[2]);
        if (isNaN(customHours) || customHours < 1 || customHours > 720) {
            return message.reply('❌ Số giờ phải từ 1 đến 720 (30 ngày)!');
        }
    }
    
    const newCode = giftcode.createGiftcode(message.author.id, customReward, customHours);
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 GIFTCODE MỚI ĐÃ TẠO!')
        .setColor('#f39c12')
        .setDescription(`
**Code:** \`${newCode.code}\`
**Phần thưởng:** ${newCode.reward.toLocaleString('en-US')} Mcoin
**Số lượt:** ${newCode.maxUses} lượt
**Thời hạn:** ${newCode.duration} giờ
**Hết hạn:** <t:${Math.floor(newCode.expiresAt / 1000)}:R>

📢 **Share code này cho người chơi!**
Họ dùng lệnh: \`.code ${newCode.code}\`
        `)
        .setFooter({ text: `Code tự động xóa sau ${newCode.duration} giờ hoặc hết 10 lượt` })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Lệnh: .code (Xem danh sách code HOẶC nhập code)
async function handleCode(message, args) {
    const code = args[1]?.toUpperCase();
    
    // Nếu KHÔNG có mã code → Hiện danh sách code đang hoạt động
    if (!code) {
        const activeCodes = giftcode.listActiveCodes();
        
        if (activeCodes.length === 0) {
            return message.reply('📭 Hiện không có giftcode nào đang hoạt động!\n\n💡 **Cách dùng:** `.code <MÃ CODE>` để nhập code');
        }
        
        let codeList = '';
        activeCodes.forEach((gc, index) => {
            const usesLeft = gc.maxUses - gc.usedBy.length;
            const expiresIn = Math.floor((gc.expiresAt - Date.now()) / (60 * 1000));
            const hours = Math.floor(expiresIn / 60);
            const minutes = expiresIn % 60;
            
            codeList += `**${index + 1}. \`${gc.code}\`**\n`;
            codeList += `   💰 Thưởng: **${gc.reward.toLocaleString('en-US')} Mcoin**\n`;
            codeList += `   📊 Còn: **${usesLeft}/${gc.maxUses}** lượt\n`;
            codeList += `   ⏰ Hết hạn sau: **${hours}h ${minutes}m**\n\n`;
        });
        
        const stats = giftcode.getStats();
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 DANH SÁCH GIFTCODE ĐANG HOẠT ĐỘNG')
            .setColor('#9b59b6')
            .setDescription(codeList)
            .addFields(
                { 
                    name: '💡 Cách nhập code', 
                    value: '`.code <MÃ CODE>`\n**Ví dụ:** `.code ABC12345`', 
                    inline: false 
                },
                { 
                    name: '📊 Thống kê', 
                    value: `Code hoạt động: **${stats.activeCodes}**\nĐã nhập: **${stats.totalRedeemed}** lần\nTổng thưởng: **${stats.totalRewards.toLocaleString('en-US')}** Mcoin`, 
                    inline: false 
                }
            )
            .setFooter({ text: `Tổng ${activeCodes.length} code đang hoạt động` })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
    
    // Nếu CÓ mã code → Nhập code
    const result = giftcode.redeemGiftcode(code, message.author.id);
    
    if (!result.success) {
        return message.reply(result.message);
    }
    
    const user = getUser(message.author.id);
    user.balance += result.reward;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('🎉 NHẬP CODE THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Bạn đã nhận được **${result.reward.toLocaleString('en-US')} Mcoin**!

💰 **Số dư mới:** ${user.balance.toLocaleString('en-US')} Mcoin
${result.usesLeft > 0 ? `⏳ Code còn **${result.usesLeft} lượt**` : '🔒 Code đã hết lượt và bị xóa!'}
        `)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Lệnh: .delcode (Admin xóa code)
async function handleDeleteCode(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới xóa được code!');
    }
    
    const code = args[1]?.toUpperCase();
    
    if (!code) {
        return message.reply('❌ Sử dụng: `.delcode <CODE>`\n\n**Ví dụ:** `.delcode ABC12345`');
    }
    
    const result = giftcode.deleteGiftcode(code);
    
    if (!result.success) {
        return message.reply(`❌ ${result.message}`);
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🗑️ ĐÃ XÓA CODE')
        .setColor('#e74c3c')
        .setDescription(`
**Code đã xóa:** \`${result.code.code}\`
**Phần thưởng:** ${result.code.reward.toLocaleString('en-US')} Mcoin
**Đã dùng:** ${result.code.usedBy.length}/${result.code.maxUses} lượt
        `)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Lệnh: .delallcode (Admin xóa tất cả code)
async function handleDeleteAllCodes(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới xóa được tất cả code!');
    }
    
    const result = giftcode.deleteAllCodes();
    
    if (result.count === 0) {
        return message.reply('📭 Không có code nào để xóa!');
    }
    
    await message.reply(`✅ Đã xóa **${result.count} code** thành công!`);
}

module.exports = {
    handleCreateGiftcode,
    handleCode,
    handleDeleteCode,
    handleDeleteAllCodes
};
