// commands/admin.js - HỖ TRỢ UNLIMITED GIFTCODE

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database, saveDB, DB_PATH, getUser } = require('../utils/database');
const giftcode = require('../giftcode');
const fs = require('fs');
const https = require('https');

const { ADMIN_ID } = require('../config');

// Parse amount helper
function parseAmount(str) {
    str = str.toLowerCase().trim();
    if (str.endsWith('k')) return parseFloat(str) * 1000;
    if (str.endsWith('m')) return parseFloat(str) * 1000000;
    if (str.endsWith('b')) return parseFloat(str) * 1000000000;
    return parseInt(str);
}

// ========================================
// 🎁 GIFTCODE COMMANDS
// ========================================

async function handleCreateGiftcode(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin!');
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
    
    // ===== ADMIN TẠO CODE =====
    if (message.author.id === ADMIN_ID && code && args[2]) {
        const amountStr = args[2];
        let maxUses = args[3] ? (args[3].toLowerCase() === 'unlimit' ? -1 : parseInt(args[3])) : 100;
        let customHours = args[4] ? (args[4].toLowerCase() === 'unlimit' ? -1 : parseInt(args[4])) : 24;
        
        const amount = parseAmount(amountStr);
        
        if (isNaN(amount) || amount < 1000000) {
            return message.reply('❌ Số tiền phải >= 1,000,000 Mcoin!');
        }
        
        if (maxUses !== -1 && (isNaN(maxUses) || maxUses < 1)) {
            return message.reply('❌ Số lượt phải >= 1 hoặc "unlimit"!');
        }
        
        if (customHours !== -1 && (isNaN(customHours) || customHours < 1 || customHours > 720)) {
            return message.reply('❌ Số giờ phải từ 1-720 hoặc "unlimit"!');
        }
        
        const newCode = giftcode.createGiftcodeCustom(message.author.id, code, amount, maxUses, customHours);
        
        if (!newCode.success) {
            return message.reply(`❌ ${newCode.message}`);
        }
        
        const usesText = maxUses === -1 ? 'Unlimited' : `${maxUses} lượt`;
        const timeText = customHours === -1 ? 'Vô hạn' : `${customHours} giờ`;
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 GIFTCODE MỚI ĐÃ TẠO!')
            .setColor('#f39c12')
            .setDescription(`
**Code:** \`${newCode.code}\`
**Phần thưởng:** ${newCode.reward.toLocaleString('en-US')} Mcoin
**Số lượt:** ${usesText}
**Thời hạn:** ${timeText}
            `)
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
    
    // ===== HIỆN DANH SÁCH CODE =====
    if (!code) {
        const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
        const activeCodes = giftcode.listActiveCodes();
        
        if (activeCodes.length === 0) {
            return message.reply('📭 Không có code nào!');
        }
        
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
            rows.push(
                new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
            );
        }
        
        return message.reply({ embeds: [embed], components: rows.slice(0, 5) });
    }
    
    // ===== NHẬP CODE =====
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
    
    if (!targetUser || !vipLevel || vipLevel < 1 || vipLevel > 10) {
        return message.reply('❌ Sử dụng: .givevip @user [1-10]');
    }
    
    const user = getUser(targetUser.id);
    const { VIP_ITEMS } = require('./shop');
    
    const vipItem = VIP_ITEMS[`vip${vipLevel}`];
    
    if (!vipItem) {
        return message.reply('❌ VIP level không hợp lệ!');
    }
    
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
    
    if (!targetUser) {
        return message.reply('❌ Sử dụng: .givetitle @user');
    }
    
    const { TITLE_ITEMS } = require('./shop');
    const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
    
    const options = Object.values(TITLE_ITEMS).map(title => {
        let bonusText = `+${title.dailyBonus}% dd`;
        if (title.betBonus > 0) bonusText += `, +${title.betBonus}% thắng`;
        if (title.jackpotBonus > 0) bonusText += `, +${title.jackpotBonus}% jackpot`;
        
        return {
            label: title.titleName,
            description: bonusText,
            value: `givetitle_${targetUser.id}_${title.id}`
        };
    });
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('admin_givetitle')
        .setPlaceholder('Chọn danh hiệu để cấp...')
        .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const embed = new EmbedBuilder()
        .setTitle('👑 CẤP DANH HIỆU')
        .setColor('#e91e63')
        .setDescription(`Chọn danh hiệu để cấp cho <@${targetUser.id}>:`)
        .setFooter({ text: 'Chọn từ menu bên dưới' });
    
    await message.reply({ embeds: [embed], components: [row] });
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
    
    const amount = parseAmount(amountStr);
    
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
