// commands/quest.js
const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');
const { checkAllQuestsCompleted, initDailyQuests, shouldReset, getTimeLeftToMidnightVN } = require('../services/quest');

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

async function handleDaily(message) {
    const user = getUser(message.author.id);
    if (!user.dailyQuests || !user.dailyQuests.quests || shouldReset(user.dailyQuests.lastReset)) {
        user.dailyQuests = initDailyQuests();
        saveDB();
    }
    const quests = user.dailyQuests.quests;
    const timeLeftStr = getTimeLeftToMidnightVN();
    let questText = '';
    let completedCount = 0;
    quests.forEach(q => {
        const icon = q.completed ? '✅' : '🔲';
        questText += `${icon} **${q.name}** (${q.current}/${q.target}) — 💰 ${formatNumber(q.reward)}\n`;
        if (q.completed) completedCount++;
    });
    const totalQuestReward = quests.reduce((sum, q) => sum + q.reward, 0);
    const bonusReward = 1000000;
    const allDone = checkAllQuestsCompleted(message.author.id);
    const embed = new EmbedBuilder()
        .setTitle('📋 NHIỆM VỤ HẰNG NGÀY')
        .setColor('#9b59b6')
        .setThumbnail(message.author.displayAvatarURL({ extension: 'png', size: 256 }))
        .setDescription(`**${message.author.username}** | 🔄 Reset lúc 0h VN (còn **${timeLeftStr}**)\n\n${questText}`)
        .addFields({
            name: '🎁 Tổng thưởng',
            value: `• Hoàn thành từng nhiệm vụ: **${formatNumber(totalQuestReward)}**\n• Hoàn thành tất cả: **+${formatNumber(bonusReward)} bonus + 📦 1-30 hộp**\n• Tổng cộng: **${formatNumber(totalQuestReward + bonusReward)}**`,
            inline: false
        })
        .setFooter({ text: `Hoàn thành: ${completedCount}/5 ${allDone ? '— Gõ .claimall để nhận!' : ''} | Reset 0h giờ VN` })
        .setTimestamp();
    if (allDone) embed.addFields({ name: '🎉 ĐÃ HOÀN THÀNH TẤT CẢ!', value: 'Gõ `.claimall` để nhận thưởng!', inline: false });
    await message.reply({ embeds: [embed] });
}

async function handleClaimAll(message) {
    const user = getUser(message.author.id);
    if (!user.dailyQuests || shouldReset(user.dailyQuests.lastReset)) {
        user.dailyQuests = initDailyQuests();
        saveDB();
        return message.reply('🔄 Nhiệm vụ vừa được reset! Hãy hoàn thành nhiệm vụ mới nhé.');
    }
    if (!checkAllQuestsCompleted(message.author.id)) {
        const quests = user.dailyQuests.quests;
        const remaining = quests.filter(q => !q.completed).map(q => `🔲 ${q.name} (${q.current}/${q.target})`).join('\n');
        return message.reply(`❌ Chưa hoàn thành tất cả!\n\n**Còn lại:**\n${remaining}`);
    }
    const quests = user.dailyQuests.quests;
    const questReward = quests.reduce((sum, q) => sum + q.reward, 0);
    const bonusReward = 1000000;
    const totalReward = questReward + bonusReward;

    // Hộp may mắn random 1-30
    const boxes = Math.floor(Math.random() * 30) + 1;

    user.balance += totalReward;
    user.boxes = (user.boxes || 0) + boxes;
    user.dailyQuests = initDailyQuests();
    saveDB();

    const embed = new EmbedBuilder()
        .setTitle('🎉 NHẬN THƯỞNG NHIỆM VỤ THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setThumbnail(message.author.displayAvatarURL({ extension: 'png', size: 256 }))
        .setDescription('Chúc mừng bạn đã hoàn thành tất cả nhiệm vụ hôm nay!')
        .addFields(
            { name: '💰 Thưởng nhiệm vụ',  value: formatNumber(questReward),          inline: true },
            { name: '🎁 Bonus hoàn thành',  value: formatNumber(bonusReward),          inline: true },
            { name: '🏆 Tổng nhận',         value: `**${formatNumber(totalReward)}**`, inline: true },
            { name: '📦 Hộp nhận được',     value: `+${boxes} hộp`,                   inline: true },
            { name: '📦 Tổng hộp',          value: `${user.boxes} hộp`,               inline: true },
            { name: '💎 Số dư mới',         value: formatNumber(user.balance),         inline: true },
        )
        .setFooter({ text: 'Dùng .unbox để mở hộp! | Nhiệm vụ mới reset lúc 0h!' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

module.exports = { handleDaily, handleClaimAll };
