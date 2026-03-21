// commands/unbox.js
const { EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');

function fmt(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'b';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k';
    return num.toLocaleString('en-US');
}

function openBox() {
    return Math.floor(Math.random() * (2000000 - 10000 + 1)) + 10000;
}

async function handleUnbox(message, args) {
    const user = getUser(message.author.id);
    const boxes = user.boxes || 0;

    if (boxes === 0) {
        return message.reply('❌ Bạn không có hộp nào! Điểm danh `.dd` hoặc hoàn thành quest `.claimall` để nhận hộp.');
    }

    // .unbox all
    let count = 1;
    if (args[1] === 'all') {
        count = boxes;
    } else if (args[1]) {
        count = parseInt(args[1]);
        if (isNaN(count) || count < 1) return message.reply('❌ Số hộp không hợp lệ!');
        if (count > boxes) return message.reply(`❌ Bạn chỉ có **${boxes}** hộp!`);
    }

    let totalReward = 0;
    const results = [];
    for (let i = 0; i < count; i++) {
        const reward = openBox();
        totalReward += reward;
        if (count <= 5) results.push(`📦 Hộp ${i + 1}: **+${fmt(reward)}**`);
    }

    user.boxes -= count;
    user.balance += totalReward;
    saveDB();

    const desc = count <= 5
        ? results.join('\n') + `\n\n🎉 Tổng nhận: **${fmt(totalReward)}**`
        : `🎉 Mở **${count}** hộp, nhận tổng: **${fmt(totalReward)}**`;

    const embed = new EmbedBuilder()
        .setTitle('📦 MỞ HỘP MAY MẮN!')
        .setColor('#f39c12')
        .setDescription(desc)
        .addFields(
            { name: '💰 Số dư mới',    value: fmt(user.balance), inline: true },
            { name: '📦 Hộp còn lại', value: `${user.boxes}`,   inline: true },
        )
        .setFooter({ text: 'Điểm danh mỗi ngày để nhận thêm hộp!' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

module.exports = { handleUnbox };
