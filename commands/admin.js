// commands/admin.js

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database, saveDB, DB_PATH, getUser } = require('../utils/database');
const giftcode = require('../giftcode');
const fs = require('fs');
const https = require('https');

const { ADMIN_ID } = require('../config');

function parseAmount(str) {
    if (!str) return NaN;
    str = str.toString().toLowerCase().trim().replace(/[,._]/g, '');
    if (str.endsWith('k')) return parseFloat(str) * 1000;
    if (str.endsWith('m')) return parseFloat(str) * 1000000;
    if (str.endsWith('b') || str.endsWith('t')) return parseFloat(str) * 1000000000;
    const n = parseFloat(str);
    return isNaN(n) ? NaN : n;
}

// ========================================
// 🚫 BLOCK LỆNH THEO KÊNH
// ========================================

// database.blockedCommands = { channelId: ['.xd', '.tx', ...] }

async function handleBlock(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    // .block → xem danh sách đang block
    if (!args[1]) {
        if (!database.blockedCommands) database.blockedCommands = {};
        const channelId = message.channel.id;
        const blocked = database.blockedCommands[channelId] || [];

        if (blocked.length === 0) {
            return message.reply(`📋 Kênh này chưa block lệnh nào.\n\n**Cách dùng:**\n\`.block .xd .tx .sc\` → Block lệnh\n\`.unblock .xd\` → Bỏ block lệnh\n\`.unblock all\` → Bỏ tất cả`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🚫 LỆNH BỊ BLOCK TRONG KÊNH NÀY')
            .setColor('#e74c3c')
            .setDescription(blocked.map(c => `• \`${c}\``).join('\n'))
            .setFooter({ text: `Kênh: #${message.channel.name}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    // .block .xd .tx ... → block các lệnh
    const cmdsToBlock = args.slice(1).map(c => c.toLowerCase().startsWith('.') ? c.toLowerCase() : '.' + c.toLowerCase());

    if (!database.blockedCommands) database.blockedCommands = {};
    if (!database.blockedCommands[message.channel.id]) database.blockedCommands[message.channel.id] = [];

    const added = [];
    const already = [];

    for (const cmd of cmdsToBlock) {
        if (!database.blockedCommands[message.channel.id].includes(cmd)) {
            database.blockedCommands[message.channel.id].push(cmd);
            added.push(cmd);
        } else {
            already.push(cmd);
        }
    }

    saveDB();

    let msg = '';
    if (added.length > 0) msg += `✅ Đã block: ${added.map(c => `\`${c}\``).join(', ')}\n`;
    if (already.length > 0) msg += `⚠️ Đã block rồi: ${already.map(c => `\`${c}\``).join(', ')}`;

    return message.reply(msg || '❌ Không có gì thay đổi!');
}

async function handleUnblock(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    if (!database.blockedCommands) database.blockedCommands = {};
    const channelId = message.channel.id;

    if (!args[1]) return message.reply('❌ Sử dụng: `.unblock .xd` hoặc `.unblock all`');

    // .unblock all → bỏ hết
    if (args[1].toLowerCase() === 'all') {
        database.blockedCommands[channelId] = [];
        saveDB();
        return message.reply('✅ Đã bỏ block tất cả lệnh trong kênh này!');
    }

    const cmdsToUnblock = args.slice(1).map(c => c.toLowerCase().startsWith('.') ? c.toLowerCase() : '.' + c.toLowerCase());

    if (!database.blockedCommands[channelId]) {
        return message.reply('📋 Kênh này chưa block lệnh nào!');
    }

    const removed = [];
    const notFound = [];

    for (const cmd of cmdsToUnblock) {
        const idx = database.blockedCommands[channelId].indexOf(cmd);
        if (idx !== -1) {
            database.blockedCommands[channelId].splice(idx, 1);
            removed.push(cmd);
        } else {
            notFound.push(cmd);
        }
    }

    saveDB();

    let msg = '';
    if (removed.length > 0) msg += `✅ Đã bỏ block: ${removed.map(c => `\`${c}\``).join(', ')}\n`;
    if (notFound.length > 0) msg += `⚠️ Không tìm thấy: ${notFound.map(c => `\`${c}\``).join(', ')}`;

    return message.reply(msg || '❌ Không có gì thay đổi!');
}

// Hàm check block - dùng trong index.js
function isCommandBlocked(channelId, cmd) {
    if (!database.blockedCommands) return false;
    const blocked = database.blockedCommands[channelId] || [];
    return blocked.includes(cmd.toLowerCase());
}

// ========================================
// 🎁 GIFTCODE COMMANDS
// ========================================

async function handleCreateGiftcode(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    // .giftcode [TÊN] [TIỀN] [LƯỢT] [GIỜ]
    // Detect: args[1] là tên hay tiền?
    // Nếu args[1] parse ra số hợp lệ => không có tên, args[1]=tiền
    // Nếu args[1] không phải số => là tên code, args[2]=tiền

    let codeName = null;
    let amountStr = null;
    let maxUses = 100;
    let customHours = 24;

    const firstVal = parseAmount(args[1]);
    if (!isNaN(firstVal) && firstVal >= 1000000) {
        // .giftcode 2b [lượt] [giờ]
        amountStr = args[1];
        if (args[2]) maxUses = args[2].toLowerCase() === 'unlimit' ? -1 : parseInt(args[2]);
        if (args[3]) customHours = args[3].toLowerCase() === 'unlimit' ? -1 : parseInt(args[3]);
    } else if (args[1] && args[2]) {
        // .giftcode TÊNCODE 2b [lượt] [giờ]
        codeName = args[1].toUpperCase();
        amountStr = args[2];
        if (args[3]) maxUses = args[3].toLowerCase() === 'unlimit' ? -1 : parseInt(args[3]);
        if (args[4]) customHours = args[4].toLowerCase() === 'unlimit' ? -1 : parseInt(args[4]);
    } else {
        return message.reply('❌ Cú pháp: `.giftcode [TÊN] [TIỀN] [LƯỢT] [GIỜ]`\nVD: `.giftcode THANG3 2b 100 24`\nVD: `.giftcode 2b 50 48`');
    }

    const amount = parseAmount(amountStr);
    if (isNaN(amount) || amount < 1000000)
        return message.reply('❌ Số tiền phải >= 1,000,000 Mcoin!');
    if (maxUses !== -1 && (isNaN(maxUses) || maxUses < 1))
        return message.reply('❌ Số lượt không hợp lệ!');
    if (customHours !== -1 && (isNaN(customHours) || customHours < 1 || customHours > 720))
        return message.reply('❌ Số giờ phải từ 1-720!');

    let newCode;
    if (codeName) {
        newCode = giftcode.createGiftcodeCustom(message.author.id, codeName, amount, maxUses, customHours);
        if (!newCode.success) return message.reply(`❌ ${newCode.message}`);
    } else {
        newCode = giftcode.createGiftcode(message.author.id, amount, customHours === -1 ? 999999 : customHours);
    }

    const usesText = (newCode.maxUses === -1 || newCode.maxUses >= 999999) ? 'Unlimited' : `${newCode.maxUses} lượt`;
    const timeText = (customHours === -1 || customHours >= 999999) ? 'Vô hạn' : `${customHours} giờ`;

    const embed = new EmbedBuilder()
        .setTitle('🎁 GIFTCODE MỚI ĐÃ TẠO!')
        .setColor('#f39c12')
        .setDescription(`**Code:** \`${newCode.code}\`\n**Phần thưởng:** ${amount.toLocaleString('en-US')} Mcoin\n**Số lượt:** ${usesText}\n**Thời hạn:** ${timeText}`)
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleCode(message, args) {
    const code = args[1]?.toUpperCase();

    if (message.author.id === ADMIN_ID && code && args[2]) {
        const amountStr = args[2];
        let maxUses = args[3] ? (args[3].toLowerCase() === 'unlimit' ? -1 : parseInt(args[3])) : 100;
        let customHours = args[4] ? (args[4].toLowerCase() === 'unlimit' ? -1 : parseInt(args[4])) : 24;

        const amount = parseAmount(amountStr);

        if (isNaN(amount) || amount < 1000000) return message.reply('❌ Số tiền phải >= 1,000,000 Mcoin!');
        if (maxUses !== -1 && (isNaN(maxUses) || maxUses < 1)) return message.reply('❌ Số lượt phải >= 1 hoặc "unlimit"!');
        if (customHours !== -1 && (isNaN(customHours) || customHours < 1 || customHours > 720)) return message.reply('❌ Số giờ phải từ 1-720 hoặc "unlimit"!');

        const newCode = giftcode.createGiftcodeCustom(message.author.id, code, amount, maxUses, customHours);
        if (!newCode.success) return message.reply(`❌ ${newCode.message}`);

        const usesText = maxUses === -1 ? 'Unlimited' : `${maxUses} lượt`;
        const timeText = customHours === -1 ? 'Vô hạn' : `${customHours} giờ`;

        const embed = new EmbedBuilder()
            .setTitle('🎁 GIFTCODE MỚI ĐÃ TẠO!')
            .setColor('#f39c12')
            .setDescription(`**Code:** \`${newCode.code}\`\n**Phần thưởng:** ${newCode.reward.toLocaleString('en-US')} Mcoin\n**Số lượt:** ${usesText}\n**Thời hạn:** ${timeText}`)
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    if (!code) {
        const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
        const activeCodes = giftcode.listActiveCodes();

        if (activeCodes.length === 0) return message.reply('📭 Không có code nào!');

        let codeList = '';
        const buttons = [];

        activeCodes.forEach((gc, index) => {
            const usesLeft = gc.maxUses === -1 ? '∞' : (gc.maxUses - gc.usedBy.length);
            codeList += `**${index + 1}. \`${gc.code}\`** - ${gc.reward.toLocaleString('en-US')} Mcoin (${usesLeft} lượt)\n`;
            if (buttons.length < 25) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`copy_code_${gc.code}`)
                        .setLabel(gc.code)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📋')
                );
            }
        });

        const embed = new EmbedBuilder()
            .setTitle('🎁 CODE MCOIN')
            .setColor('#9b59b6')
            .setDescription(codeList + '\n📋 **Bấm nút để copy code!**')
            .setTimestamp();

        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        return message.reply({ embeds: [embed], components: rows.slice(0, 5) });
    }

    const result = giftcode.redeemGiftcode(code, message.author.id);
    if (!result.success) return message.reply(result.message);

    const user = getUser(message.author.id);
    user.balance += result.reward;
    saveDB();

    await message.reply(`✅ Nhận được ${result.reward.toLocaleString('en-US')} Mcoin!`);
}

async function handleDeleteCode(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');
    const code = args[1]?.toUpperCase();
    if (!code) return message.reply('❌ Sử dụng: .delcode <CODE>');
    const result = giftcode.deleteGiftcode(code);
    if (!result.success) return message.reply(`❌ ${result.message}`);
    await message.reply(`✅ Đã xóa code ${code}!`);
}

async function handleDeleteAllCodes(message) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');
    const result = giftcode.deleteAllCodes();
    await message.reply(`✅ Đã xóa ${result.count} code!`);
}

// ========================================
// 👑 VIP & DANH HIỆU
// ========================================

async function handleGiveVip(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    const targetUser = message.mentions.users.first();
    const vipLevel = parseInt(args[2]);

    if (!targetUser || !vipLevel || vipLevel < 1 || vipLevel > 10)
        return message.reply('❌ Sử dụng: .givevip @user [1-10]');

    const { VIP_ITEMS } = require('./shop');
    const vipItem = VIP_ITEMS[`vip${vipLevel}`];
    if (!vipItem) return message.reply('❌ VIP level không hợp lệ!');

    const user = getUser(targetUser.id);
    user.vipLevel = vipLevel;
    user.vipBonus = {
        dailyBonus: vipItem.dailyBonus,
        betBonus: vipItem.betBonus,
        extraBonus: vipItem.extraBonus || 0
    };
    saveDB();

    await message.reply(`✅ Đã cấp ${vipItem.name} cho <@${targetUser.id}>!`);
}

async function handleRemoveVip(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Sử dụng: .removevip @user');

    const user = getUser(targetUser.id);
    user.vipLevel = 0;
    user.vipBonus = null;
    saveDB();

    await message.reply(`✅ Đã xóa VIP của <@${targetUser.id}>!`);
}

async function handleGiveTitle(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Sử dụng: .givetitle @user');

    const { TITLE_ITEMS } = require('./shop');
    const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

    const options = Object.values(TITLE_ITEMS).map(title => {
        let bonusText = `+${title.dailyBonus}% dd`;
        if (title.betBonus > 0) bonusText += `, +${title.betBonus}% thắng`;
        if (title.jackpotBonus > 0) bonusText += `, +${title.jackpotBonus}% jackpot`;
        return { label: title.titleName, description: bonusText, value: `givetitle_${targetUser.id}_${title.id}` };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('admin_givetitle')
        .setPlaceholder('Chọn danh hiệu để cấp...')
        .addOptions(options);

    const embed = new EmbedBuilder()
        .setTitle('👑 CẤP DANH HIỆU')
        .setColor('#e91e63')
        .setDescription(`Chọn danh hiệu để cấp cho <@${targetUser.id}>:`)
        .setFooter({ text: 'Chọn từ menu bên dưới' });

    await message.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
}

// ========================================
// 🎰 NỔ HŨ ADMIN
// ========================================

async function handleNoHu(message) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    const { setForceJackpot } = require('./game');
    setForceJackpot(true);

    const { database } = require('../utils/database');
    const currentJackpot = database.jackpot || 0;
    const chanceText = currentJackpot >= 3_000_000_000 ? '100%' : currentJackpot >= 1_000_000_000 ? '70%' : '5%';

    const embed = new EmbedBuilder()
        .setTitle('🎲 ĐÃ KÍCH HOẠT .NOHU!')
        .setColor('#FFD700')
        .setDescription(`✅ **Ván TX tiếp theo xúc xắc sẽ ra bộ ba!**\n\n🎰 Xác suất nổ hũ: **${chanceText}**\n💰 Hũ hiện tại: **${currentJackpot.toLocaleString('en-US')}**\n\n⚠️ Tự động tắt sau ván đó.`)
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

// ========================================
// 💰 DONATE
// ========================================

async function handleDonate(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Sử dụng: .donate @user [số tiền]\nVD: .donate @ai 100m');

    const amountStr = args[2]?.toLowerCase().trim();
    if (!amountStr) return message.reply('❌ Nhập số tiền! VD: 100m, 5b');

    const amount = parseAmount(amountStr);
    if (isNaN(amount) || amount <= 0) return message.reply('❌ Số tiền không hợp lệ!');

    const user = getUser(targetUser.id);
    const oldBalance = user.balance;
    user.balance += amount;
    saveDB();

    const embed = new EmbedBuilder()
        .setTitle('💰 ADMIN TẶNG TIỀN!')
        .setColor('#2ecc71')
        .setDescription(`Admin tặng **${amount.toLocaleString('en-US')} Mcoin** cho <@${targetUser.id}>!\n\n💰 Số dư cũ: ${oldBalance.toLocaleString('en-US')}\n✨ Số dư mới: **${user.balance.toLocaleString('en-US')}**`)
        .setTimestamp();

    await message.reply({ embeds: [embed] });

    try { await targetUser.send(`🎁 Admin tặng bạn **${amount.toLocaleString('en-US')} Mcoin**!`); } catch {}
}

// ========================================
// 🔄 RESET QUEST
// ========================================

async function handleResetQuest(message, args) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('❌ Sử dụng: `.resetquest @user`');

    const user = getUser(targetUser.id);
    const { initDailyQuests } = require('../services/quest');
    user.dailyQuests = initDailyQuests();
    saveDB();

    const embed = new EmbedBuilder()
        .setTitle('🔄 RESET NHIỆM VỤ THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`Đã reset nhiệm vụ của <@${targetUser.id}>!\n\nNgười chơi có thể gõ \`.daily\` để xem nhiệm vụ mới.`)
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

// ========================================
// 📤 SENDCODE
// ========================================

async function handleSendCode(message, GIFTCODE_CHANNEL_ID) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    try {
        const reward = Math.floor(Math.random() * 99000000 + 1000000);
        const newCode = giftcode.createGiftcode(message.author.id, reward, 2);
        const channel = await message.client.channels.fetch(GIFTCODE_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setTitle('🎁 GIFTCODE MỚI!')
            .setColor('#f39c12')
            .setDescription(`Code: \`${newCode.code}\`\nThưởng: ${newCode.reward.toLocaleString('en-US')} Mcoin\nGõ: \`.code ${newCode.code}\``)
            .setTimestamp();

        await channel.send({ content: '@everyone', embeds: [embed] });
        await message.reply(`✅ Đã phát code ${newCode.code}!`);
    } catch (e) {
        return message.reply(`❌ Lỗi: ${e.message}`);
    }
}

// ========================================
// 🗄️ DATABASE
// ========================================

async function handleDbInfo(message) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');

    const totalUsers = Object.keys(database.users).length;
    const totalBalance = Object.values(database.users).reduce((sum, u) => sum + u.balance, 0);

    const embed = new EmbedBuilder()
        .setTitle('🗄️ DATABASE INFO')
        .setColor('#3498db')
        .addFields(
            { name: 'Người chơi', value: `${totalUsers}`, inline: true },
            { name: 'Tổng tiền', value: `${totalBalance.toLocaleString('en-US')}`, inline: true },
            { name: 'Hũ TX', value: `${(database.jackpot || 0).toLocaleString('en-US')}`, inline: true },
            { name: 'Hũ XD', value: `${(database.xdJackpot || 0).toLocaleString('en-US')}`, inline: true }
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleBackup(message) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');
    const backup = JSON.stringify(database, null, 2);
    const attachment = new AttachmentBuilder(Buffer.from(backup), { name: `backup_${Date.now()}.json` });
    await message.reply({ content: '📦 Backup database:', files: [attachment] });
}

async function handleBackupNow(message) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');
    try {
        const backup = JSON.stringify(database, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(backup), { name: `manual_${Date.now()}.json` });
        await message.reply({ files: [attachment] });
    } catch (e) {
        return message.reply(`❌ Lỗi: ${e.message}`);
    }
}

async function handleRestore(message) {
    if (message.author.id !== ADMIN_ID) return message.reply('❌ Chỉ admin!');
    return message.reply('📥 Gửi file .json + gõ "restore confirm"');
}

async function handleRestoreFile(message) {
    if (message.author.id !== ADMIN_ID) return;
    if (!message.content.toLowerCase().includes('restore confirm')) return;
    if (message.attachments.size === 0) return;

    const attachment = message.attachments.first();
    if (!attachment.name.endsWith('.json')) return message.reply('❌ File phải là .json!');

    const processingMsg = await message.reply('⏳ Đang restore...');

    try {
        const backupData = await new Promise((resolve, reject) => {
            https.get(attachment.url, (res) => {
                let data = '';
                if (res.statusCode !== 200) { reject(new Error(`HTTP Error: ${res.statusCode}`)); return; }
                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error('JSON không hợp lệ')); }
                });
            }).on('error', e => reject(new Error(`Lỗi tải: ${e.message}`)));
        });

        if (!backupData.users) return processingMsg.edit('❌ Thiếu cấu trúc users!');

        Object.assign(database, backupData);
        saveDB();

        await processingMsg.edit('✅ Restore thành công!');
    } catch (error) {
        return processingMsg.edit(`❌ Lỗi: ${error.message}`);
    }
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    handleCreateGiftcode,
    handleCode,
    handleDeleteCode,
    handleDeleteAllCodes,
    handleSendCode,
    handleGiveVip,
    handleRemoveVip,
    handleGiveTitle,
    handleNoHu,
    handleDonate,
    handleResetQuest,
    handleDbInfo,
    handleBackup,
    handleBackupNow,
    handleRestore,
    handleRestoreFile,
    handleBlock,
    handleUnblock,
    isCommandBlocked
};

