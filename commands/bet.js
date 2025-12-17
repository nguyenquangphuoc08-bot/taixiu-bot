// handlers/bet.js - XỬ LÝ ĐẶT CƯỢC LINH HOẠT 1k - 100 TỶ

const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');
const { getBettingSession } = require('./game');

// Hàm parse số tiền linh hoạt
function parseAmount(input) {
    if (!input) return null;
    
    const str = input.toLowerCase().trim();
    const cleaned = str.replace(/[,\s]/g, '');
    
    // Đơn vị
    const multipliers = {
        'k': 1000,
        'm': 1000000,
        'b': 1000000000,
        'tỷ': 1000000000,
        'triệu': 1000000,
        'tr': 1000000,
        'nghìn': 1000,
        'n': 1000
    };
    
    // Tìm số và đơn vị
    const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|m|b|tỷ|triệu|tr|nghìn|n)?$/i);
    
    if (!match) {
        const pure = parseFloat(cleaned);
        if (!isNaN(pure) && pure >= 1000) return Math.floor(pure);
        return null;
    }
    
    const number = parseFloat(match[1]);
    const unit = match[2] ? match[2].toLowerCase() : '';
    
    if (isNaN(number)) return null;
    
    const multiplier = multipliers[unit] || 1;
    const result = Math.floor(number * multiplier);
    
    // Giới hạn 1k - 100 tỷ
    if (result < 1000 || result > 100000000000) return null;
    
    return result;
}

// Xử lý đặt cược qua interaction
async function handleBetInteraction(interaction) {
    const betType = interaction.customId.replace('bet_', '');
    const session = getBettingSession();
    
    if (!session) {
        return interaction.reply({ 
            content: '❌ Không có phiên cược nào đang diễn ra!',
            ephemeral: true 
        });
    }
    
    if (session.channelId !== interaction.channel.id) {
        return interaction.reply({ 
            content: '❌ Phiên cược không ở channel này!',
            ephemeral: true 
        });
    }
    
    const userId = interaction.user.id;
    
    if (session.bets[userId]) {
        return interaction.reply({ 
            content: '❌ Bạn đã đặt cược rồi! Không thể đổi cược.',
            ephemeral: true 
        });
    }
    
    // Yêu cầu nhập số tiền
    await interaction.reply({
        content: `
🎲 **Bạn chọn cược: ${betType.toUpperCase()}**

💰 Nhập số tiền cược (1k - 100 tỷ):
Ví dụ: \`1k\`, \`5m\`, \`10b\`, \`1000000\`

⏰ Bạn có **30 giây** để nhập!
        `,
        ephemeral: true
    });
    
    // Chờ tin nhắn từ user
    const filter = m => m.author.id === userId;
    
    try {
        const collected = await interaction.channel.awaitMessages({ 
            filter, 
            max: 1, 
            time: 30000, 
            errors: ['time'] 
        });
        
        const amountInput = collected.first().content.trim();
        const amount = parseAmount(amountInput);
        
        if (!amount) {
            await collected.first().delete().catch(() => {});
            return interaction.followUp({
                content: `❌ Số tiền không hợp lệ! Phải từ **1,000** đến **100,000,000,000** Mcoin.\nVí dụ: \`1k\`, \`5m\`, \`10b\``,
                ephemeral: true
            });
        }
        
        const user = getUser(userId);
        
        if (user.balance < amount) {
            await collected.first().delete().catch(() => {});
            return interaction.followUp({
                content: `❌ Không đủ tiền! Bạn có **${user.balance.toLocaleString('en-US')} Mcoin**, cần **${amount.toLocaleString('en-US')} Mcoin**`,
                ephemeral: true
            });
        }
        
        // Trừ tiền và lưu cược
        user.balance -= amount;
        session.bets[userId] = {
            type: betType,
            amount: amount
        };
        saveDB();
        
        // Xóa tin nhắn số tiền
        await collected.first().delete().catch(() => {});
        
        await interaction.followUp({
            content: `✅ Đã đặt **${amount.toLocaleString('en-US')} Mcoin** vào **${betType.toUpperCase()}**!`,
            ephemeral: true
        });
        
        console.log(`✅ ${interaction.user.tag} đặt ${amount.toLocaleString('en-US')} vào ${betType}`);
        
    } catch (error) {
        if (error.message === 'time') {
            return interaction.followUp({
                content: '⏰ Hết thời gian nhập số tiền!',
                ephemeral: true
            });
        }
        console.error('❌ Lỗi bet:', error);
    }
}

module.exports = {
    handleBetInteraction,
    parseAmount
};
