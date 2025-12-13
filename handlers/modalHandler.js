const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB, database } = require('../utils/database');

async function handleModal(interaction, bettingSession, client) {
    // ✅ Kiểm tra interaction còn valid không
    if (!interaction.isModalSubmit()) return;
    
    // ✅ DEFER NGAY LẬP TỨC - Bắt lỗi nếu interaction đã hết hạn
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }
    } catch (deferError) {
        // Nếu lỗi 10062 (Unknown interaction) = interaction đã hết hạn
        if (deferError.code === 10062) {
            console.log('⚠️ Interaction đã hết hạn (token expired)');
            return; // Không làm gì cả
        }
        console.error('❌ Lỗi defer:', deferError.message);
        return;
    }
    
    if (!interaction.customId.startsWith('bet_modal_')) return;
    
    const betType = interaction.customId.replace('bet_modal_', '');
    const amountInput = interaction.fields.getTextInputValue('bet_amount').replace(/[^0-9]/g, '');
    const amount = parseInt(amountInput);
    
    const betNames = {
        'tai': '🔵 Tài',
        'xiu': '🔴 Xỉu',
        'chan': '🟣 Chẵn',
        'le': '🟡 Lẻ'
    };
    
    // ✅ Helper function để reply an toàn
    async function safeReply(content) {
        try {
            if (interaction.deferred) {
                await interaction.editReply({ content });
            } else if (!interaction.replied) {
                await interaction.reply({ content, ephemeral: true });
            }
        } catch (err) {
            console.log('⚠️ Không thể reply:', err.message);
        }
    }
    
    // Validate số tiền
    if (!amount || isNaN(amount)) {
        return safeReply('❌ Số tiền không hợp lệ!');
    }
    
    if (amount < 15000) {
        return safeReply('❌ Cược tối thiểu 15,000 Mcoin!');
    }
    
    const user = getUser(interaction.user.id);
    
    if (user.balance < amount) {
        return safeReply(`❌ Số dư không đủ! Bạn có: **${user.balance.toLocaleString('en-US')} Mcoin**`);
    }
    
    // Kiểm tra phiên cược
    if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
        return safeReply('❌ Phiên cược đã kết thúc!');
    }
    
    if (bettingSession.bets[interaction.user.id]) {
        return safeReply('❌ Bạn đã đặt cược rồi!');
    }
    
    // ✅ Xử lý cược
    try {
        // Trừ tiền
        user.balance -= amount;
        saveDB();
        
        // Lưu cược
        bettingSession.bets[interaction.user.id] = {
            type: betType,
            amount: amount
        };
        
        database.activeBettingSession.bets[interaction.user.id] = {
            type: betType,
            amount: amount
        };
        saveDB();
        
        await safeReply(`✅ Đã đặt **${amount.toLocaleString('en-US')} Mcoin** vào ${betNames[betType]}!`);
        
        // Cập nhật embed (không chặn flow chính)
        updateBettingEmbed(bettingSession, client).catch(err => {
            console.log('⚠️ Không cập nhật được embed:', err.message);
        });
        
    } catch (error) {
        console.error('❌ Lỗi xử lý cược:', error);
        // Hoàn tiền nếu có lỗi
        user.balance += amount;
        saveDB();
        await safeReply('❌ Có lỗi xảy ra! Vui lòng thử lại.');
    }
}

// ✅ Hàm cập nhật embed riêng (async, không blocking)
async function updateBettingEmbed(bettingSession, client) {
    try {
        const channel = await client.channels.fetch(bettingSession.channelId).catch(() => null);
        if (!channel) return;
        
        const msg = await channel.messages.fetch(bettingSession.messageId).catch(() => null);
        if (!msg || !msg.embeds || !msg.embeds[0]) return;
        
        const embed = msg.embeds[0];
        const newEmbed = EmbedBuilder.from(embed);
        
        const playerCount = Object.keys(bettingSession?.bets || {}).length;
        
        newEmbed.spliceFields(1, 1, {
            name: "👥 Người chơi",
            value: playerCount.toString(),
            inline: true
        });
        
        await msg.edit({ embeds: [newEmbed] });
    } catch (error) {
        // Không log lỗi nữa vì đã xử lý ở trên
    }
}

module.exports = handleModal;
