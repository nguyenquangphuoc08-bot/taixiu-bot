const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');
const { checkAllQuestsCompleted } = require('../services/quest');

// Lệnh: .daily
async function handleDaily(message) {
    const user = getUser(message.author.id);
    const quests = user.dailyQuests.quests;
    const streak = user.dailyQuests.streak;
    
    const embed = new EmbedBuilder()
        .setTitle('📋 NHIỆM VỤ HẰNG NGÀY')
        .setColor('#9b59b6')
        .setDescription(`
🔥 **Chuỗi ngày: ${streak} ngày** ${streak >= 3 ? '(x2 điểm danh!)' : ''}
${streak >= 3 ? '✨ Làm đủ nhiệm vụ hôm nay để giữ chuỗi và nhận x2 điểm danh!' : ''}
${streak < 3 ? '⚠️ Làm đủ nhiệm vụ 3 ngày liên tục để nhận x2 điểm danh!' : ''}
        `);
    
    let questText = '';
    let completedCount = 0;
    
    quests.forEach(q => {
        const status = q.completed ? '✅' : '⏳';
        const progress = `${q.current}/${q.target}`;
        questText += `${status} **${q.name}**\n`;
        questText += `   └ Tiến độ: ${progress} | Thưởng: ${q.reward.toLocaleString('en-US')} Mcoin\n\n`;
        if (q.completed) completedCount++;
    });
    
    embed.addFields({
        name: `📊 Tiến độ: ${completedCount}/5 nhiệm vụ`,
        value: questText,
        inline: false
    });
    
    if (checkAllQuestsCompleted(message.author.id)) {
        const bonusReward = 5000000;
        const totalReward = quests.reduce((sum, q) => sum + q.reward, 0) + bonusReward;
        
        embed.addFields({
            name: '🎉 HOÀN THÀNH TẤT CẢ!',
            value: `Tổng thưởng: **${totalReward.toLocaleString('en-US')} Mcoin**\nGõ \`.claimall\` để nhận thưởng!`,
            inline: false
        });
    }
    
    embed.setFooter({ text: 'Reset lúc 00:00 hằng ngày | Không làm = mất chuỗi' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// Lệnh: .claimall
async function handleClaimAll(message) {
    const user = getUser(message.author.id);
    
    if (!checkAllQuestsCompleted(message.author.id)) {
        return message.reply('❌ Bạn chưa hoàn thành tất cả nhiệm vụ!');
    }
    
    const quests = user.dailyQuests.quests;
    const questReward = quests.reduce((sum, q) => sum + q.reward, 0);
    const bonusReward = 5000000;
    const totalReward = questReward + bonusReward;
    
    user.balance += totalReward;
    user.dailyQuests.streak++;
    user.dailyQuests.lastCompleted = new Date().toDateString();
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('🎉 NHẬN THƯỞNG THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Chúc mừng bạn đã hoàn thành tất cả nhiệm vụ hôm nay!

💰 **Thưởng nhiệm vụ:** ${questReward.toLocaleString('en-US')} Mcoin
🎁 **Thưởng hoàn thành:** ${bonusReward.toLocaleString('en-US')} Mcoin
✨ **TỔNG:** ${totalReward.toLocaleString('en-US')} Mcoin

🔥 **Chuỗi ngày mới:** ${user.dailyQuests.streak} ngày
${user.dailyQuests.streak >= 3 ? '🎊 Bạn được nhận **X2 điểm danh** khi gõ .diemdanh!' : ''}
        `)
        .addFields({
            name: '💎 Số dư mới',
            value: `${user.balance.toLocaleString('en-US')} Mcoin`
        })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

module.exports = {
    handleDaily,
    handleClaimAll
};
