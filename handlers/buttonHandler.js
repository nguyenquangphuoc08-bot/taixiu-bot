const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getUser } = require('../utils/database');

async function handleButton(interaction, bettingSession) {
    if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
        return interaction.reply({ content: '❌ Không có phiên cược nào đang diễn ra!', flags: 64 });
    }
    
    if (bettingSession.bets[interaction.user.id]) {
        return interaction.reply({ content: '❌ Bạn đã đặt cược rồi!', flags: 64 });
    }
    
    const betTypes = {
        'bet_tai': { type: 'tai', name: 'TÀI', emoji: '🔵' },
        'bet_xiu': { type: 'xiu', name: 'XỈU', emoji: '🔴' },
        'bet_chan': { type: 'chan', name: 'CHẴN', emoji: '🟣' },
        'bet_le': { type: 'le', name: 'LẺ', emoji: '🟡' }
    };
    
    const betInfo = betTypes[interaction.customId];
    if (!betInfo) return;
    
    const modal = new ModalBuilder()
        .setCustomId(`bet_modal_${betInfo.type}`)
        .setTitle(`${betInfo.emoji} NHẬP SỐ TIỀN CƯỢC (${betInfo.name})`);
    
    const user = getUser(interaction.user.id);
    
    const amountInput = new TextInputBuilder()
        .setCustomId('bet_amount')
        .setLabel(`Mcoin của bạn: ${user.balance.toLocaleString('en-US')}`)
        .setPlaceholder('Nhập số tiền bạn muốn cược ở đây!')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(4)
        .setMaxLength(10);
    
    const row = new ActionRowBuilder().addComponents(amountInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
}

module.exports = handleButton;
