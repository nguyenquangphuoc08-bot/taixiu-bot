// handlers/buttonHandler.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getUser } = require('../utils/database');

async function handleButtonClick(interaction, bettingSession) {
    try {
        // ✅ Kiểm tra có phiên cược không
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.reply({ 
                content: '❌ Không có phiên cược nào đang diễn ra!', 
                ephemeral: true 
            }).catch(() => {});
        }
        
        // ✅ Kiểm tra đã cược chưa
        if (bettingSession.bets[interaction.user.id]) {
            return interaction.reply({ 
                content: '❌ Bạn đã đặt cược rồi!', 
                ephemeral: true 
            }).catch(() => {});
        }
        
        // ✅ Định nghĩa các loại cược
        const betTypes = {
            'bet_tai': { type: 'tai', name: 'TÀI', emoji: '🔵' },
            'bet_xiu': { type: 'xiu', name: 'XỈU', emoji: '🔴' },
            'bet_chan': { type: 'chan', name: 'CHẴN', emoji: '🟣' },
            'bet_le': { type: 'le', name: 'LẺ', emoji: '🟡' }
        };
        
        const betInfo = betTypes[interaction.customId];
        if (!betInfo) {
            return interaction.reply({ 
                content: '❌ Loại cược không hợp lệ!', 
                ephemeral: true 
            }).catch(() => {});
        }
        
        // ✅ Lấy thông tin user
        const user = getUser(interaction.user.id);
        
        // ✅ Tạo modal nhập số tiền
        const modal = new ModalBuilder()
            .setCustomId(`bet_modal_${betInfo.type}`)
            .setTitle(`${betInfo.emoji} NHẬP SỐ TIỀN CƯỢC (${betInfo.name})`);
        
        const amountInput = new TextInputBuilder()
            .setCustomId('bet_amount')
            .setLabel(`Mcoin của bạn: ${user.balance.toLocaleString('en-US')}`)
            .setPlaceholder('VD: 1k, 5m, 10b, 100000000')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(20);
        
        const row = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(row);
        
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('❌ Button handler error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Có lỗi xảy ra khi xử lý button!', 
                ephemeral: true 
            }).catch(() => {});
        }
    }
}

// ✅ Export dưới dạng named export
module.exports = { handleButtonClick };
