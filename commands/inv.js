// commands/inv.js
const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../utils/database');

function fmt(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'b';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k';
    return num.toLocaleString('en-US');
}

async function handleInv(message) {
    const user = getUser(message.author.id);

    const embed = new EmbedBuilder()
        .setTitle(`🎒 TÚI ĐỒ — ${message.author.username}`)
        .setColor('#9b59b6')
        .setThumbnail(message.author.displayAvatarURL({ extension: 'png', size: 128 }))
        .addFields(
            { name: '💰 Mcoin',       value: `**${fmt(user.balance)}**`,           inline: true },
            { name: '💎 Kim Cương',   value: `**${user.diamonds || 0}** KC`,       inline: true },
            { name: '📦 Hộp May Mắn',value: `**${user.boxes || 0}** hộp`,         inline: true },
        )
        .setFooter({ text: 'Dùng .unbox để mở hộp | .mshop để mua vật phẩm' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

module.exports = { handleInv };
