const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

const { getUser } = require('../utils/database');

async function handleButtonClick(interaction, bettingSession) {
    try {

        const isOpenModal =
            interaction.customId === 'bet_type_select' ||
            interaction.customId === 'open_bet_menu';

        // Defer reply đúng chuẩn để dùng editReply()
        if (!isOpenModal && !interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        // ===== KIỂM TRA PHIÊN =====
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.editReply({
                content: '❌ Không có phiên cược nào đang diễn ra!',
                components: []
            });
        }

        const elapsed = Date.now() - bettingSession.startTime;
        if (elapsed >= bettingSession.duration) {
            return interaction.editReply({
                content: '⏱️ Phiên cược đã kết thúc!',
                components: []
            });
        }

        // ===== MỞ MENU =====
        if (interaction.customId === 'open_bet_menu') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bet_type_select')
                .setPlaceholder('⚡ Chọn cửa cược')
                .addOptions([
                    { label: 'Tài', description: '11-18 | x1.9', value: 'tai', emoji: '🔵' },
                    { label: 'Xỉu', description: '3-10 | x1.9', value: 'xiu', emoji: '🔴' },
                    { label: 'Chẵn', description: 'x1.9', value: 'chan', emoji: '🟣' },
                    { label: 'Lẻ', description: 'x1.9', value: 'le', emoji: '🟡' },
                    { label: 'Cược Số', description: '1-6 | x3', value: 'number', emoji: '🎯' },
                    { label: 'Cược Tổng', description: '3-18 | x5', value: 'total', emoji: '📊' }
                ]);

            return interaction.editReply({
                content: '⚡ **Chọn cửa để đặt cược**',
                components: [new ActionRowBuilder().addComponents(selectMenu)]
            });
        }

        // ===== CHỌN CỬA =====
        if (interaction.customId === 'bet_type_select') {
            const type = interaction.values[0];
            const user = getUser(interaction.user.id);

            if (!user || user.balance <= 0) {
                return interaction.editReply('❌ Bạn không có tiền để cược!');
            }

            // ---- CƯỢC SỐ ----
            if (type === 'number') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bet_number')
                    .setTitle('🎯 CƯỢC SỐ (1-6)');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('number_value')
                            .setLabel('Nhập số (1-6)')
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

            // ---- CƯỢC TỔNG ----
            if (type === 'total') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bet_total')
                    .setTitle('📊 CƯỢC TỔNG (3-18)');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('total_value')
                            .setLabel('Nhập tổng (3-18)')
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

            // ---- TÀI / XỈU / CHẴN / LẺ ----
            const modal = new ModalBuilder()
                .setCustomId(`bet_modal_${type}`)
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

    } catch (err) {
        console.error('❌ Button handler error:', err);

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true });
            } else {
                await interaction.editReply({ content: '❌ Có lỗi xảy ra!', components: [] });
            }
        } catch {}
    }
}

module.exports = { handleButtonClick };
