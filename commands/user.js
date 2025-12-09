const { EmbedBuilder } = require('discord.js');
const { database, getUser, saveDB } = require('../utils/database');

// Lệnh: .mcoin
async function handleMcoin(message) {
    const user = getUser(message.author.id);
    const streak = user.dailyQuests.streak;
    const completedQuests = user.dailyQuests.quests.filter(q => q.completed).length;
    
    const embed = new EmbedBuilder()
        .setTitle('💰 SỐ DƯ CỦA BẠN')
        .setColor('#2ecc71')
        .setDescription(`**${user.balance.toLocaleString('en-US')} Mcoin**`)
        .addFields(
            { name: '🔵 Tài', value: `${user.tai}`, inline: true },
            { name: '🔴 Xỉu', value: `${user.xiu}`, inline: true },
            { name: '🟣 Chẵn', value: `${user.chan}`, inline: true },
            { name: '🟡 Lẻ', value: `${user.le}`, inline: true },
            { name: '🎰 Nổ hũ', value: `${user.jackpotWins} lần`, inline: true },
            { name: '💎 Hũ hiện tại', value: `${(database.jackpot || 0).toLocaleString('en-US')}`, inline: true },
            { name: '🔥 Chuỗi ngày', value: `${streak} ngày ${streak >= 3 ? '(x2 DD!)' : ''}`, inline: true },
            { name: '📋 Nhiệm vụ hôm nay', value: `${completedQuests}/5`, inline: true }
        )
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Lệnh: .tang
async function handleTang(message, args) {
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[2]);
    
    if (!targetUser) {
        return message.reply('❌ Sử dụng: `.tang @user [số tiền]`\nVí dụ: `.tang @Tên 100000`');
    }
    
    if (!amount || amount < 10000) {
        return message.reply('❌ Số tiền phải ít nhất 10,000 Mcoin!');
    }
    
    const sender = getUser(message.author.id);
    
    if (sender.balance < amount) {
        return message.reply(`❌ Số dư không đủ! Bạn có: **${sender.balance.toLocaleString('en-US')} Mcoin**`);
    }
    
    if (targetUser.id === message.author.id) {
        return message.reply('❌ Không thể tặng tiền cho chính mình!');
    }
    
    const receiver = getUser(targetUser.id);
    sender.balance -= amount;
    receiver.balance += amount;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('💝 TẶNG TIỀN THÀNH CÔNG!')
        .setColor('#e91e63')
        .setDescription(`<@${message.author.id}> đã tặng **${amount.toLocaleString('en-US')} Mcoin** cho <@${targetUser.id}>!`)
        .addFields(
            { name: '💰 Số dư người gửi', value: `${sender.balance.toLocaleString('en-US')} Mcoin`, inline: true },
            { name: '💰 Số dư người nhận', value: `${receiver.balance.toLocaleString('en-US')} Mcoin`, inline: true }
        )
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Lệnh: .diemdanh
async function handleDiemDanh(message) {
    const userId = message.author.id;
    const now = Date.now();
    const lastCheckin = database.lastCheckin[userId] || 0;
    const timeLeft = lastCheckin + (8 * 60 * 60 * 1000) - now;
    
    if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        return message.reply(`⏰ Bạn đã điểm danh rồi! Quay lại sau **${hours}h ${minutes}phút**`);
    }
    
    const user = getUser(userId);
    const streak = user.dailyQuests.streak;
    const multiplier = streak >= 3 ? 2 : 1;
    const reward = 3000000 * multiplier;
    
    user.balance += reward;
    database.lastCheckin[userId] = now;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 ĐIỂM DANH THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Bạn nhận được **${reward.toLocaleString('en-US')} Mcoin**!
${multiplier === 2 ? '\n✨ **X2 nhờ chuỗi 3+ ngày làm nhiệm vụ!**' : ''}
        `)
        .addFields(
            {
                name: '💰 Số dư mới',
                value: `${user.balance.toLocaleString('en-US')} Mcoin`
            },
            {
                name: '🔥 Chuỗi nhiệm vụ',
                value: `${streak} ngày ${streak >= 3 ? '(Đang x2!)' : '(Cần 3+ ngày để x2)'}`
            }
        )
        .setFooter({ text: 'Quay lại sau 8 giờ | Làm .daily để giữ chuỗi!' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

module.exports = {
    handleMcoin,
    handleTang,
    handleDiemDanh
};
