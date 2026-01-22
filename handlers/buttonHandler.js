onst { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

const { getUser, saveDBDebounced } = require('../utils/database');

// ✅ HÀM RÚT GỌN SỐ TIỀN
function formatBalance(balance) {
    if (balance >= 1e24) return (balance / 1e24).toFixed(1) + 'Y';
    if (balance >= 1e21) return (balance / 1e21).toFixed(1) + 'Z';
    if (balance >= 1e18) return (balance / 1e18).toFixed(1) + 'E';
    if (balance >= 1e15) return (balance / 1e15).toFixed(1) + 'P';
    if (balance >= 1e12) return (balance / 1e12).toFixed(1) + 'T';
    if (balance >= 1e9) return (balance / 1e9).toFixed(1) + 'B';
    if (balance >= 1e6) return (balance / 1e6).toFixed(1) + 'M';
    if (balance >= 1e3) return (balance / 1e3).toFixed(1) + 'K';
    return balance.toString();
}

async function handleButtonClick(interaction, bettingSession) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
        
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.editReply({
                content: '❌ Không có phiên cược nào đang diễn ra!',
                components: []
            });
        }

        const now = Date.now();
        const elapsed = now - bettingSession.startTime;

        if (elapsed >= bettingSession.duration) {
            return interaction.editReply({
                content: '⏱️ Phiên cược đã kết thúc! Vui lòng chờ phiên tiếp theo.',
                components: []
            });
        }

        if (interaction.customId === 'open_bet_menu') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bet_type_select')
                .setPlaceholder('⚡ Chọn cửa và đặt cược tại đây!')
                .addOptions([
                    { label: 'Tài', description: '11-18 | x1.9', value: 'tai', emoji: '🔵' },
                    { label: 'Xỉu', description: '3-10 | x1.9', value: 'xiu', emoji: '🔴' },
                    { label: 'Chẵn', description: 'x1.9', value: 'chan', emoji: '🟣' },
                    { label: 'Lẻ', description: 'x1.9', value: 'le', emoji: '🟡' },
                    { label: 'Cược Số', description: '1-6 | x3', value: 'number', emoji: '🎯' },
                    { label: 'Cược Tổng', description: '3-18 | x5', value: 'total', emoji: '📊' }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            return interaction.editReply({
                content: '⚡ **Chọn cửa và đặt cược tại đây!**',
                components: [row]
            });
        }

        if (interaction.customId === 'bet_type_select') {
            const betType = interaction.values[0];
            const user = getUser(interaction.user.id);

            if (betType === 'number') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bet_number')
                    .setTitle('🎯 CƯỢC VÀO SỐ (1-6)');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('number_value')
                            .setLabel('Chọn số (1-6)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('VD: 3')
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('bet_amount')
                            .setLabel(`💰 ${formatBalance(user.balance)} Mcoin`) // ✅ ĐÃ SỬA
                            .setPlaceholder('VD: 1k, 5m, 10b')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

                return interaction.showModal(modal);
            }

            if (betType === 'total') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bet_total')
                    .setTitle('📊 CƯỢC VÀO TỔNG (3-18)');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('total_value')
                            .setLabel('Chọn tổng (3-18)')
                            .setPlaceholder('VD: 12')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('bet_amount')
                            .setLabel(`💰 ${formatBalance(user.balance)} Mcoin`) // ✅ ĐÃ SỬA
                            .setPlaceholder('VD: 1k, 5m, 10b')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

                return interaction.showModal(modal);
            }

            const modal = new ModalBuilder()
                .setCustomId(`bet_modal_${betType}`)
                .setTitle('🎲 NHẬP SỐ TIỀN CƯỢC');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('bet_amount')
                        .setLabel(`💰 ${formatBalance(user.balance)} Mcoin`) // ✅ ĐÃ SỬA
                        .setPlaceholder('VD: 1k, 5m, 10b, 100000')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

    } catch (error) {
        console.error('❌ Button handler error:', error);

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Có lỗi xảy ra!',
                    flags: 64
                });
            } else {
                await interaction.editReply({
                    content: '❌ Có lỗi xảy ra!',
                    components: []
                });
            }
        } catch (err) {
            console.error('Failed to send error message:', err);
        }
    }
}

module.exports = { handleButtonClick };
