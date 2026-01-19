const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

const { getUser, saveDB } = require('../utils/database');

async function handleButtonClick(interaction, bettingSession) {
    try {
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.editReply({
                content: '❌ Không có phiên cược nào đang diễn ra!'
            });
        }

        const now = Date.now();
        const elapsed = now - bettingSession.startTime;

        if (elapsed >= bettingSession.duration) {
            return interaction.editReply({
                content: '⏱️ Phiên cược đã kết thúc! Vui lòng chờ phiên tiếp theo.'
            });
        }

        // ===== MỞ MENU ĐẶT CƯỢC =====
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

        // ===== CHỌN CỬA =====
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
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('bet_amount')
                            .setLabel(`Số dư: ${user.balance.toLocaleString()} Mcoin`)
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
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('bet_amount')
                            .setLabel(`Số dư: ${user.balance.toLocaleString()} Mcoin`)
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
                        .setLabel(`Số dư: ${user.balance.toLocaleString()} Mcoin`)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

    } catch (error) {
        console.error('❌ Button handler error:', error);

        try {
            await interaction.editReply({
                content: '❌ Có lỗi xảy ra!'
            });
        } catch {}
    }
}

module.exports = { handleButtonClick };
