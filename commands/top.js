// commands/top.js
const { AttachmentBuilder } = require('discord.js');
const { database } = require('../utils/database');
const { createTopImage } = require('../utils/canvasTop');

async function handleTop(message) {
    try {
        const loadMsg = await message.reply('⏳ Đang tạo bảng xếp hạng...');

        const txTop5 = Object.entries(database.users)
            .map(([id, u]) => ({ id, win: u.txWinningsToday || 0, name: u.displayName || id }))
            .filter(u => u.win > 0)
            .sort((a, b) => b.win - a.win)
            .slice(0, 5);

        const xdTop5 = Object.entries(database.users)
            .map(([id, u]) => ({ id, win: u.xdWinningsToday || 0, name: u.displayName || id }))
            .filter(u => u.win > 0)
            .sort((a, b) => b.win - a.win)
            .slice(0, 5);

        // Lay ten Discord thuc
        for (const entry of [...txTop5, ...xdTop5]) {
            try {
                const member = await message.guild.members.fetch(entry.id).catch(() => null);
                if (member) entry.name = member.displayName || member.user.username;
            } catch {}
        }

        const imgBuffer = await createTopImage(txTop5, xdTop5);
        const attachment = new AttachmentBuilder(imgBuffer, { name: 'top.png' });

        await loadMsg.edit({ content: null, files: [attachment] });

    } catch (err) {
        console.error('handleTop error:', err);
        message.reply('❌ Lỗi tạo bảng xếp hạng!').catch(() => {});
    }
}

module.exports = { handleTop };

