// handlers/buttonHandler.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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
        
        // ✅ XỬ LÝ NÚT MENU CHÍNH
        if (interaction.customId === 'open_bet_menu') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('bet_type_select')
                .setPlaceholder('⚡ Chọn cửa và đặt cược tại đây!')
                .addOptions([
                    {
                        label: 'Tài',
                        description: 'Cược Tài (11-18) - Tỷ lệ x1.9',
                        value: 'tai',
                        emoji: '🔵'
                    },
                    {
                        label: 'Xỉu',
                        description: 'Cược Xỉu (3-10) - Tỷ lệ x1.9',
                        value: 'xiu',
                        emoji: '🔴'
                    },
                    {
                        label: 'Chẵn',
                        description: 'Cược Chẵn - Tỷ lệ x1.9',
                        value: 'chan',
                        emoji: '🟣'
                    },
                    {
                        label: 'Lẻ',
                        description: 'Cược Lẻ - Tỷ lệ x1.9',
                        value: 'le',
                        emoji: '🟡'
                    },
                    {
                        label: 'Cược Số',
                        description: 'Cược vào số (1-6) - Tỷ lệ x3',
                        value: 'number',
                        emoji: '🎯'
                    },
                    {
                        label: 'Cược Tổng',
                        description: 'Cược vào tổng (3-18) - Tỷ lệ x5',
                        value: 'total',
                        emoji: '📊'
                    }
                ]);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            return await interaction.reply({
                content: '⚡ **Chọn cửa và đặt cược tại đây!**',
                components: [row],
                ephemeral: true
            });
        }
        
        // ✅ XỬ LÝ CHỌN TỪ MENU
        if (interaction.isStringSelectMenu() && interaction.customId === 'bet_type_select') {
            const betType = interaction.values[0];
            const user = getUser(interaction.user.id);
            
            // ✅ Nếu chọn Cược Số
            if (betType === 'number') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bet_number')
                    .setTitle('🎯 CƯỢC VÀO SỐ (1-6)');
                
                const numberInput = new TextInputBuilder()
                    .setCustomId('number_value')
                    .setLabel('Chọn số từ 1 đến 6')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ví dụ: 4')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(1);
                
                const amountInput = new TextInputBuilder()
                    .setCustomId('bet_amount')
                    .setLabel(`Số dư: ${user.balance.toLocaleString('en-US')} Mcoin`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('VD: 1k, 5m, 10b')
                    .setRequired(true);
                
                const firstRow = new ActionRowBuilder().addComponents(numberInput);
                const secondRow = new ActionRowBuilder().addComponents(amountInput);
                
                modal.addComponents(firstRow, secondRow);
                await interaction.showModal(modal);
                return;
            }
            
            // ✅ Nếu chọn Cược Tổng
            if (betType === 'total') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bet_total')
                    .setTitle('📊 CƯỢC VÀO TỔNG (3-18)');
                
                const totalInput = new TextInputBuilder()
                    .setCustomId('total_value')
                    .setLabel('Chọn tổng từ 3 đến 18')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ví dụ: 15')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(2);
                
                const amountInput = new TextInputBuilder()
                    .setCustomId('bet_amount')
                    .setLabel(`Số dư: ${user.balance.toLocaleString('en-US')} Mcoin`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('VD: 1k, 5m, 10b')
                    .setRequired(true);
                
                const firstRow = new ActionRowBuilder().addComponents(totalInput);
                const secondRow = new ActionRowBuilder().addComponents(amountInput);
                
                modal.addComponents(firstRow, secondRow);
                await interaction.showModal(modal);
                return;
            }
            
            // ✅ Nếu chọn Tài/Xỉu/Chẵn/Lẻ
            const betNames = {
                'tai': { name: 'TÀI', emoji: '🔵' },
                'xiu': { name: 'XỈU', emoji: '🔴' },
                'chan': { name: 'CHẴN', emoji: '🟣' },
                'le': { name: 'LẺ', emoji: '🟡' }
            };
            
            const betInfo = betNames[betType];
            
            const modal = new ModalBuilder()
                .setCustomId(`bet_modal_${betType}`)
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
        }
        
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

module.exports = { handleButtonClick };
