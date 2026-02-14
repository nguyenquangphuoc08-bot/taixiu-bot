// commands/quest.js - ĐƠN GIẢN (Chỉ tiền, bỏ kim cương, bỏ lượt reset)

const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');
const { checkAllQuestsCompleted } = require('../services/quest');

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
    const totalReward = totalQuestReward + bonusReward;
    
    let rewardText = `• **${(totalQuestReward / 1000000).toFixed(1)}M** 💰 cho tất cả nhiệm vụ.\n`;
    rewardText += `• Hoàn thành tất cả nhiệm vụ thưởng thêm **${(bonusReward / 1000000).toFixed(1)}M** 💰.\n`;
    rewardText += `━━━━━━━━━━━━━━━━\n`;
    rewardText += `• **TỔNG: ${(totalReward / 1000000).toFixed(1)}M** 💰`;
    
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
        return message.reply('❌ Bạn chưa hoàn thành tất cả nhiệm vụ!');
    }
    
    const quests = user.dailyQuests.quests;
    const questReward = quests.reduce((sum, q) => sum + q.reward, 0);
    const bonusReward = 1000000;
    const totalReward = questReward + bonusReward;
    
    user.balance += totalReward;
    
    // Reset nhiệm vụ sau 24h
    const { initDailyQuests } = require('../services/quest');
    user.dailyQuests = initDailyQuests();
    
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('🎉 NHẬN THƯỞNG THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Chúc mừng bạn đã hoàn thành tất cả nhiệm vụ!

💰 **Thưởng nhiệm vụ:** ${questReward.toLocaleString('en-US')} Mcoin
🎁 **Thưởng hoàn thành:** ${bonusReward.toLocaleString('en-US')} Mcoin
━━━━━━━━━━━━━━━━
✨ **TỔNG:** ${totalReward.toLocaleString('en-US')} Mcoin
        `)
        .addFields({
            name: '💎 Số dư mới',
            value: `${user.balance.toLocaleString('en-US')} Mcoin`
        })
        .setFooter({ text: 'Nhiệm vụ mới sẽ có sau 24 giờ' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

module.exports = {
    handleDaily,
    handleClaimAll
};
