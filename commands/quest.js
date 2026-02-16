// commands/quest.js - ĐẦY ĐỦ

const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');
const { checkAllQuestsCompleted } = require('../services/quest');

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

async function handleDaily(message) {
    const user = getUser(message.author.id);
    
    if (!user.dailyQuests || !user.dailyQuests.quests) {
        const { initDailyQuests } = require('../services/quest');
        user.dailyQuests = initDailyQuests();
        saveDB();
    }
    
    const quests = user.dailyQuests.quests;
    
    const embed = new EmbedBuilder()
        .setTitle(`📋 Nhiệm vụ hằng ngày của ${message.author.username}`)
        .setColor('#9b59b6');
    
    let questText = '';
    let completedCount = 0;
    
    quests.forEach(q => {
        const icon = q.completed ? '✅' : '🔲';
        const progress = `(${q.current}/${q.target})`;
        
        questText += `${icon} **${q.name}** ${progress}\n`;
        
        if (q.completed) completedCount++;
    });
    
    embed.setDescription(questText);
    
    const totalQuestReward = quests.reduce((sum, q) => sum + q.reward, 0);
    const bonusReward = 1000000;
    
    let rewardText = `• **${formatNumber(totalQuestReward)}** 💰 cho tất cả nhiệm vụ.\n`;
    rewardText += `• Hoàn thành tất cả thưởng thêm **${formatNumber(bonusReward)}** 💰.`;
    
    embed.addFields({
        name: '🎁 Phần thưởng:',
        value: rewardText,
        inline: false
    });
    
    if (checkAllQuestsCompleted(message.author.id)) {
        embed.addFields({
            name: '🎉 HOÀN THÀNH!',
            value: `Gõ \`.claimall\` để nhận thưởng!`,
            inline: false
        });
    }
    
    embed.setFooter({ 
        text: `Hoàn thành: ${completedCount}/5` 
    });
    
    await message.reply({ embeds: [embed] });
}

async function handleClaimAll(message) {
    const user = getUser(message.author.id);
    
    if (!checkAllQuestsCompleted(message.author.id)) {
        return message.reply('❌ Chưa hoàn thành tất cả!');
    }
    
    const quests = user.dailyQuests.quests;
    const questReward = quests.reduce((sum, q) => sum + q.reward, 0);
    const bonusReward = 1000000;
    const totalReward = questReward + bonusReward;
    
    user.balance += totalReward;
    
    const { initDailyQuests } = require('../services/quest');
    user.dailyQuests = initDailyQuests();
    
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('🎉 NHẬN THƯỞNG THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Chúc mừng!

💰 **Thưởng nhiệm vụ:** ${formatNumber(questReward)}
🎁 **Thưởng hoàn thành:** ${formatNumber(bonusReward)}
        `)
        .addFields({
            name: '💎 Số dư mới',
            value: formatNumber(user.balance)
        })
        .setFooter({ text: 'Nhiệm vụ mới sau 24h' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

module.exports = {
    handleDaily,
    handleClaimAll
};
