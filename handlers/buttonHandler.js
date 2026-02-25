// handlers/buttonHandler.js - HIỆN SỐ DƯ ĐẦY ĐỦ

const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

const { getUser, saveDBDebounced } = require('../utils/database');

// ===== FORMAT SỐ ĐẦY ĐỦ =====
function formatBalance(balance) {
    return balance.toLocaleString('vi-VN');
}

async function handleButtonClick(interaction, bettingSession) {
    try {
        // ===== XỬ LÝ BUTTON SHOP =====
        if (interaction.customId === 'shop_vip') {
            const { showVipPackages } = require('../commands/shop');
            return await showVipPackages(interaction);
        }

        if (interaction.customId === 'shop_titles') {
            const { showTitles } = require('../commands/shop');
            return await showTitles(interaction);
        }

        // ===== XỬ LÝ SELECT MENU SHOP =====
        if (interaction.customId === 'buy_vip') {
            const { buyVipPackage } = require('../commands/shop');
            const vipId = interaction.values[0];
            return await buyVipPackage(interaction, vipId);
        }

        if (interaction.customId === 'buy_title') {
            const { buyTitle } = require('../commands/shop');
            const titleId = interaction.values[0];
            return await buyTitle(interaction, titleId);
        }

        // ===== XỬ LÝ TÀI XỈU =====
        
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.reply({
                content: '❌ Không có phiên cược nào đang diễn ra!',
                ephemeral: true
            }).catch(() => {});
        }

        const elapsed = Date.now() - bettingSession.startTime;
        const BETTING_TIME = 30000;
        
        if (elapsed >= BETTING_TIME) {
            return interaction.reply({
                content: '⏱️ Phiên cược đã kết thúc!',
                ephemeral: true
            }).catch(() => {});
        }

        // ===== BUTTON "OPEN BET MENU" =====
        if (interaction.isButton() && interaction.customId === 'open_bet_menu') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bet_type_select')
                .setPlaceholder('⚡ Chọn cửa cược')
                .addOptions([
                    { label: 'Tài', description: '11-18 | x1.9', value: 'tai', emoji: '🔵' },
                    { label: 'Xỉu', description: '3-10 | x1.9', value: 'xiu', emoji: '🔴' },
                    { label: 'Chẵn', description: 'x1.9', value: 'chan', emoji: '🟣' },
                    { label: 'Lẻ', description: 'x1.9', value: 'le', emoji: '🟡' },
                    { label: 'Cược Số', description: '1-6 ', value: 'number', emoji: '🎯' },
                    { label: 'Cược Tổng', description: '3-18 ', value: 'total', emoji: '📊' }
                ]);

            return interaction.reply({
                content: '⚡ **Chọn cửa để đặt cược**',
                components: [new ActionRowBuilder().addComponents(selectMenu)],
                ephemeral: true
            });
        }

        // ===== SELECT MENU "BET TYPE SELECT" =====
        if (interaction.isStringSelectMenu() && interaction.customId === 'bet_type_select') {
            const type = interaction.values[0];
            const user = getUser(interaction.user.id);

            if (!user || user.balance <= 0) {
                return interaction.reply({
                    content: '❌ Bạn không có tiền để cược!',
                    ephemeral: true
                });
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
                            .setPlaceholder('VD: 3')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('bet_amount')
                            .setLabel(`💰 ${formatBalance(user.balance)} Mcoin`)
                            .setPlaceholder('VD: 1k, 5m, 10b')
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
                            .setPlaceholder('VD: 12')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('bet_amount')
                            .setLabel(`💰 ${formatBalance(user.balance)} Mcoin`)
                            .setPlaceholder('VD: 1k, 5m, 10b')
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
                        .setLabel(`💰 ${formatBalance(user.balance)} Mcoin`)
                        .setPlaceholder('VD: 1k, 5m, 10b')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

    } catch (err) {
        console.error('❌ Button handler error:', err);
        
        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({ 
                content: '❌ Có lỗi xảy ra!', 
                ephemeral: true 
            }).catch(() => {});
        }
    }
}

module.exports = { handleButtonClick };

