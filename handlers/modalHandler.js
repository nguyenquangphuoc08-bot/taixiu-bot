const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB, database } = require('../utils/database');

async function handleModal(interaction, bettingSession, client) {
    // ✅ QUAN TRỌNG: Defer NGAY LẬP TỨC
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (deferError) {
        console.error('❌ Cannot defer:', deferError.message);
        return; // Nếu không defer được thì bỏ qua
    }
    
    if (!interaction.customId.startsWith('bet_modal_')) return;
    
    const betType = interaction.customId.replace('bet_modal_', '');
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount').replace(/[^0-9]/g, ''));
    
    const betNames = {
        'tai': '🔵 Tài',
        'xiu': '🔴 Xỉu',
        'chan': '🟣 Chẵn',
        'le': '🟡 Lẻ'
    };
    
    if (!amount || isNaN(amount)) {
        return interaction.editReply({ content: '❌ Số tiền không hợp lệ!' }).catch(() => {});
    }
    
    if (amount < 15000) {
        return interaction.editReply({ content: '❌ Cược tối thiểu 15,000 Mcoin!' }).catch(() => {});
    }
    
    const user = getUser(interaction.user.id);
    
    if (user.balance < amount) {
        return interaction.editReply({ 
            content: `❌ Số dư không đủ! Bạn có: **${user.balance.toLocaleString('en-US')} Mcoin**`
        }).catch(() => {});
    }
    
    if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
        return interaction.editReply({ content: '❌ Phiên cược đã kết thúc!' }).catch(() => {});
    }
    
    if (bettingSession.bets[interaction.user.id]) {
        return interaction.editReply({ content: '❌ Bạn đã đặt cược rồi!' }).catch(() => {});
    }
    
    // Trừ tiền và lưu cược
    user.balance -= amount;
    saveDB();
    
    bettingSession.bets[interaction.user.id] = {
        type: betType,
        amount: amount
    };
    
    database.activeBettingSession.bets[interaction.user.id] = {
        type: betType,
        amount: amount
    };
    saveDB();
    
    await interaction.editReply({ 
        content: `✅ Đã đặt **${amount.toLocaleString('en-US')} Mcoin** vào ${betNames[betType]}!`
    }).catch(() => {});
    
    // Cập nhật số người chơi
    try {
        const channel = await client.channels.fetch(bettingSession.channelId).catch(() => null);
        if (!channel) return;

        const msg = await channel.messages.fetch(bettingSession.messageId).catch(() => null);
        if (!msg || !msg.embeds || !msg.embeds[0]) return;

        const embed = msg.embeds[0];
        const newEmbed = EmbedBuilder.from(embed);

        newEmbed.spliceFields(1, 1, {
            name: "👥 Người chơi",
            value: Object.keys(bettingSession?.bets || {}).length.toString(),
            inline: true
        });

        await msg.edit({ embeds: [newEmbed] });

    } catch (updateError) {
        console.log("⚠️ Không thể cập nhật embed:", updateError.message);
    }
}

module.exports = handleModal;
