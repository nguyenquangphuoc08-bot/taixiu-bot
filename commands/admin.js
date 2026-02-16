// commands/admin.js - FULL CODE (ĐÃ THÊM RESET QUEST)

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database, saveDB, DB_PATH, getUser } = require('../utils/database');
const giftcode = require('../giftcode');
const fs = require('fs');
const https = require('https');

const { ADMIN_ID } = require('../config');

// ========================================
// 🎁 GIFTCODE COMMANDS
// ========================================

async function handleCreateGiftcode(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới tạo được giftcode!');
    }
    
    let customReward = null;
    let customHours = 2;
    
    if (args[1]) {
        customReward = parseInt(args[1]);
        if (isNaN(customReward) || customReward < 1000000) {
            return message.reply('❌ Số tiền phải >= 1,000,000 Mcoin!');
        }
    }
    
    if (args[2]) {
        customHours = parseInt(args[2]);
        if (isNaN(customHours) || customHours < 1 || customHours > 720) {
            return message.reply('❌ Số giờ phải từ 1 đến 720!');
        }
    }
    
    const newCode = giftcode.createGiftcode(message.author.id, customReward, customHours);
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 GIFTCODE MỚI ĐÃ TẠO!')
        .setColor('#f39c12')
        .setDescription(`
**Code:** \`${newCode.code}\`
**Phần thưởng:** ${newCode.reward.toLocaleString('en-US')} Mcoin
**Số lượt:** ${newCode.maxUses} lượt
**Thời hạn:** ${newCode.duration} giờ
        `)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    console.log(`✅ Admin tạo code: ${newCode.code}`);
}

async function handleCode(message, args) {
    const code = args[1]?.toUpperCase();
    
    if (!code) {
        const activeCodes = giftcode.listActiveCodes();
        
        if (activeCodes.length === 0) {
            return message.reply('📭 Không có code nào!');
        }
        
        let codeList = '';
        activeCodes.forEach((gc, index) => {
            const usesLeft = gc.maxUses - gc.usedBy.length;
            codeList += `**${index + 1}. \`${gc.code}\`** - ${gc.reward.toLocaleString('en-US')} Mcoin (${usesLeft} lượt)\n`;
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 DANH SÁCH GIFTCODE')
            .setColor('#9b59b6')
            .setDescription(codeList)
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
    
    const result = giftcode.redeemGiftcode(code, message.author.id);
    
    if (!result.success) {
        return message.reply(result.message);
    }
    
    const user = getUser(message.author.id);
    user.balance += result.reward;
    saveDB();
    
    await message.reply(`✅ Nhận được ${result.reward.toLocaleString('en-US')} Mcoin!`);
}

async function handleDeleteCode(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const code = args[1]?.toUpperCase();
    if (!code) {
        return message.reply('❌ Sử dụng: .delcode <CODE>');
    }
    
    const result = giftcode.deleteGiftcode(code);
    
    if (!result.success) {
        return message.reply(`❌ ${result.message}`);
    }
    
    await message.reply(`✅ Đã xóa code ${code}!`);
}

async function handleDeleteAllCodes(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const result = giftcode.deleteAllCodes();
    await message.reply(`✅ Đã xóa ${result.count} code!`);
}

// ========================================
// 👑 VIP & DANH HIỆU
// ========================================

async function handleGiveVip(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const targetUser = message.mentions.users.first();
    const vipLevel = parseInt(args[2]);
    
    if (!targetUser || !vipLevel || vipLevel < 1 || vipLevel > 3) {
        return message.reply('❌ Sử dụng: .givevip @user [1-3]');
    }
    
    const user = getUser(targetUser.id);
    const vipData = {
        1: { dailyBonus: 2000000, betBonus: 5 },
        2: { dailyBonus: 5000000, betBonus: 10 },
        3: { dailyBonus: 15000000, betBonus: 20 }
    };
    
    user.vipLevel = vipLevel;
    user.vipBonus = vipData[vipLevel];
    saveDB();
    
    await message.reply(`✅ Đã cấp VIP ${vipLevel} cho <@${targetUser.id}>!`);
}

async function handleRemoveVip(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
        return message.reply('❌ Sử dụng: .removevip @user');
    }
    
    const user = getUser(targetUser.id);
    user.vipLevel = 0;
    user.vipBonus = null;
    saveDB();
    
    await message.reply(`✅ Đã xóa VIP của <@${targetUser.id}>!`);
}

async function handleGiveTitle(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const targetUser = message.mentions.users.first();
    const titleName = args.slice(2).join(' ');
    
    if (!targetUser || !titleName) {
        return message.reply('❌ Sử dụng: .givetitle @user [tên]');
    }
    
    const user = getUser(targetUser.id);
    user.vipTitle = titleName;
    saveDB();
    
    await message.reply(`✅ Đã cấp danh hiệu "${titleName}" cho <@${targetUser.id}>!`);
}

// ========================================
// 💰 DONATE
// ========================================

async function handleDonate(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
        return message.reply('❌ Sử dụng: .donate @user [số tiền]\nVD: .donate @ai 100m');
    }
    
    let amountStr = args[2]?.toLowerCase().trim();
    if (!amountStr) {
        return message.reply('❌ Nhập số tiền! VD: 100m, 5b');
    }
    
    let amount = 0;
    if (amountStr.endsWith('k')) {
        amount = parseFloat(amountStr) * 1000;
    } else if (amountStr.endsWith('m')) {
        amount = parseFloat(amountStr) * 1000000;
    } else if (amountStr.endsWith('b')) {
        amount = parseFloat(amountStr) * 1000000000;
    } else {
        amount = parseInt(amountStr);
    }
    
    if (isNaN(amount) || amount <= 0) {
        return message.reply('❌ Số tiền không hợp lệ!');
    }
    
    const user = getUser(targetUser.id);
    const oldBalance = user.balance;
    user.balance += amount;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('💰 ADMIN TẶNG TIỀN!')
        .setColor('#2ecc71')
        .setDescription(`
Admin tặng **${amount.toLocaleString('en-US')} Mcoin** cho <@${targetUser.id}>!

💰 Số dư cũ: ${oldBalance.toLocaleString('en-US')}
✨ Số dư mới: **${user.balance.toLocaleString('en-US')}**
        `)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
    try {
        await targetUser.send(`🎁 Admin tặng bạn **${amount.toLocaleString('en-US')} Mcoin**!`);
    } catch (e) {}
    
    console.log(`✅ Admin donate ${amount.toLocaleString('en-US')} cho ${targetUser.tag}`);
}

// ========================================
// 🔄 RESET QUEST
// ========================================

async function handleResetQuest(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const targetUser = message.mentions.users.first();
    
    if (!targetUser) {
        return message.reply('❌ Sử dụng: `.resetquest @user`');
    }
    
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
    
    console.log(`✅ Admin reset quest cho ${targetUser.tag}`);
}

// ========================================
// 📤 SENDCODE
// ========================================

async function handleSendCode(message, GIFTCODE_CHANNEL_ID) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    try {
        const reward = Math.floor(Math.random() * 99000000 + 1000000);
        const newCode = giftcode.createGiftcode(message.author.id, reward, 2);
        
        const channel = await message.client.channels.fetch(GIFTCODE_CHANNEL_ID);
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 GIFTCODE MỚI!')
            .setColor('#f39c12')
            .setDescription(`
Code: \`${newCode.code}\`
Thưởng: ${newCode.reward.toLocaleString('en-US')} Mcoin
Gõ: \`.code ${newCode.code}\`
            `)
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
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const totalUsers = Object.keys(database.users).length;
    const totalBalance = Object.values(database.users).reduce((sum, u) => sum + u.balance, 0);
    
    const embed = new EmbedBuilder()
        .setTitle('🗄️ DATABASE INFO')
        .setColor('#3498db')
        .addFields(
            { name: 'Người chơi', value: `${totalUsers}`, inline: true },
            { name: 'Tổng tiền', value: `${totalBalance.toLocaleString('en-US')}`, inline: true },
            { name: 'Hũ', value: `${database.jackpot.toLocaleString('en-US')}`, inline: true }
        )
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function handleBackup(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    const backup = JSON.stringify(database, null, 2);
    const attachment = new AttachmentBuilder(Buffer.from(backup), { 
        name: `backup_${Date.now()}.json` 
    });
    
    await message.reply({ 
        content: '📦 Backup database:',
        files: [attachment] 
    });
}

async function handleBackupNow(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    try {
        const backup = JSON.stringify(database, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `manual_${Date.now()}.json` 
        });
        
        await message.reply({ files: [attachment] });
    } catch (e) {
        return message.reply(`❌ Lỗi: ${e.message}`);
    }
}

async function handleRestore(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
    }
    
    return message.reply('📥 Gửi file .json + gõ "restore confirm"');
}

async function handleRestoreFile(message) {
    if (message.author.id !== ADMIN_ID) return;
    if (!message.content.toLowerCase().includes('restore confirm')) return;
    if (message.attachments.size === 0) return;
    
    const attachment = message.attachments.first();
    
    if (!attachment.name.endsWith('.json')) {
        return message.reply('❌ File phải là .json!');
    }
    
    const processingMsg = await message.reply('⏳ Đang restore...');
    
    try {
        const backupData = await new Promise((resolve, reject) => {
            https.get(attachment.url, (res) => {
                let data = '';
                
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP Error: ${res.statusCode}`));
                    return;
                }
                
                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('JSON không hợp lệ'));
                    }
                });
            }).on('error', (e) => {
                reject(new Error(`Lỗi tải: ${e.message}`));
            });
        });
        
        if (!backupData.users) {
            return processingMsg.edit('❌ Thiếu cấu trúc users!');
        }
        
        Object.assign(database, backupData);
        saveDB();
        
        await processingMsg.edit('✅ Restore thành công!');
        console.log('✅ Database restored');
        
    } catch (error) {
        console.error('❌ Restore error:', error);
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
    handleDonate,
    handleResetQuest,
    handleDbInfo,
    handleBackup,
    handleBackupNow,
    handleRestore,
    handleRestoreFile
};

