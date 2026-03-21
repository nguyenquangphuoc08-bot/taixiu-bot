// handlers/buttonHandler.js - FIX SHOP BUTTONS

const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

const { getUser, saveDBDebounced } = require('../utils/database');

function formatBalance(balance) {
    return balance.toLocaleString('vi-VN');
}

async function handleButtonClick(interaction, bettingSession) {
    try {
        // ===== SHOP BUTTONS =====
        if (interaction.customId === 'shop_tab_vip') {
            const { showVipPage } = require('../commands/shop');
            return await showVipPage(interaction, 0);
        }
        if (interaction.customId === 'shop_tab_titles') {
            const { showTitlePage } = require('../commands/shop');
            return await showTitlePage(interaction, 0);
        }
        if (interaction.customId === 'shop_vip') {
            const { showVipPage } = require('../commands/shop');
            return await showVipPage(interaction, 0);
        }
        if (interaction.customId === 'shop_titles') {
            const { showTitlePage } = require('../commands/shop');
            return await showTitlePage(interaction, 0);
        }

        if (interaction.customId === 'shop_tab_frames') {
            const { showFramePage } = require('../commands/shop');
            return await showFramePage(interaction, 0);
        }

        // shop_prev_vip_0 / shop_next_title_1 / shop_next_frame_0
        if (interaction.customId.startsWith('shop_prev_') || interaction.customId.startsWith('shop_next_')) {
            const parts = interaction.customId.split('_');
            const dir = parts[1];
            const tab = parts[2]; // vip | title | frame
            const currentPage = parseInt(parts[3]) || 0;
            const newPage = dir === 'next' ? currentPage + 1 : currentPage - 1;
            if (tab === 'vip') {
                const { showVipPage } = require('../commands/shop');
                return await showVipPage(interaction, newPage);
            } else if (tab === 'title') {
                const { showTitlePage } = require('../commands/shop');
                return await showTitlePage(interaction, newPage);
            } else {
                const { showFramePage } = require('../commands/shop');
                return await showFramePage(interaction, newPage);
            }
        }

        // shop_page_frame_0 → modal
        if (interaction.customId.startsWith('shop_page_')) {
            const parts = interaction.customId.split('_');
            const tab = parts[2];
            const modal = new ModalBuilder()
                .setCustomId(`shop_goto_${tab}`)
                .setTitle('Nhập số trang');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('page_number')
                        .setLabel('Số trang')
                        .setPlaceholder('VD: 2')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );
            return interaction.showModal(modal);
        }

        if (interaction.customId === 'buy_vip') {
            const { buyVipPackage } = require('../commands/shop');
            return await buyVipPackage(interaction, interaction.values[0]);
        }
        if (interaction.customId === 'buy_title') {
            const { buyTitle } = require('../commands/shop');
            return await buyTitle(interaction, interaction.values[0]);
        }
        if (interaction.customId === 'buy_frame') {
            const { buyFrame } = require('../commands/shop');
            return await buyFrame(interaction, interaction.values[0]);
        }

        // ===== TÀI XỈU =====
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.reply({ content: '❌ Không có phiên cược nào đang diễn ra!', ephemeral: true }).catch(() => {});
        }
        const elapsed = Date.now() - bettingSession.startTime;
        if (elapsed >= 30000) {
            return interaction.reply({ content: '⏱️ Phiên cược đã kết thúc!', ephemeral: true }).catch(() => {});
        }

        if (interaction.isButton() && interaction.customId === 'open_bet_menu') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bet_type_select')
                .setPlaceholder('⚡ Chọn cửa cược')
                .addOptions([
                    { label: 'Tài',       description: '11-18 | x1.9', value: 'tai',    emoji: '🔵' },
                    { label: 'Xỉu',       description: '3-10 | x1.9',  value: 'xiu',    emoji: '🔴' },
                    { label: 'Chẵn',      description: 'x1.9',          value: 'chan',   emoji: '🟣' },
                    { label: 'Lẻ',        description: 'x1.9',          value: 'le',     emoji: '🟡' },
                    { label: 'Cược Số',   description: '1-6',           value: 'number', emoji: '🎯' },
                    { label: 'Cược Tổng', description: '3-18',          value: 'total',  emoji: '📊' },
                ]);
            return interaction.reply({ content: '⚡ **Chọn cửa để đặt cược**', components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'bet_type_select') {
            const type = interaction.values[0];
            const user = getUser(interaction.user.id);
            if (!user || user.balance <= 0) return interaction.reply({ content: '❌ Bạn không có tiền để cược!', ephemeral: true });

            if (type === 'number') {
                const modal = new ModalBuilder().setCustomId('modal_bet_number').setTitle('🎯 CƯỢC SỐ (1-6)');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('number_value').setLabel('Nhập số (1-6)').setPlaceholder('VD: 3').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bet_amount').setLabel(`💰 ${formatBalance(user.balance)} Mcoin`).setPlaceholder('VD: 1k, 5m, 10b').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return interaction.showModal(modal);
            }
            if (type === 'total') {
                const modal = new ModalBuilder().setCustomId('modal_bet_total').setTitle('📊 CƯỢC TỔNG (3-18)');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('total_value').setLabel('Nhập tổng (3-18)').setPlaceholder('VD: 12').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bet_amount').setLabel(`💰 ${formatBalance(user.balance)} Mcoin`).setPlaceholder('VD: 1k, 5m, 10b').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return interaction.showModal(modal);
            }
            const modal = new ModalBuilder().setCustomId(`bet_modal_${type}`).setTitle('🎲 NHẬP SỐ TIỀN CƯỢC');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('bet_amount').setLabel(`💰 ${formatBalance(user.balance)} Mcoin`).setPlaceholder('VD: 1k, 5m, 10b').setStyle(TextInputStyle.Short).setRequired(true)));
            return interaction.showModal(modal);
        }

    } catch (err) {
        console.error('❌ Button handler error:', err);
        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true }).catch(() => {});
        }
    }
}

module.exports = { handleButtonClick };
