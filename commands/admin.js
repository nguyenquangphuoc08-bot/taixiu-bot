const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database, saveDB, DB_PATH, getUser } = require('../utils/database');
const giftcode = require('../giftcode'); // ✅ Import module giftcode
const fs = require('fs');
const https = require('https');

const { ADMIN_ID } = require('../config');

// ========================================
// 🎁 GIFTCODE COMMANDS (ADMIN)
// ========================================

/**
 * Lệnh: .giftcode (Admin tạo code)
 * Sử dụng: .giftcode [số tiền] [số giờ]
 */
async function handleCreateGiftcode(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới tạo được giftcode!');
    }
    
    let customReward = null;
    let customHours = 2;
    
    // Parse số tiền (args[1])
    if (args[1]) {
        customReward = parseInt(args[1]);
        if (isNaN(customReward) || customReward < 1000000) {
            return message.reply('❌ Số tiền phải >= 1,000,000 Mcoin!\n\n**Cách dùng:**\n`.giftcode [số tiền] [số giờ]`\n\n**Ví dụ:**\n`.giftcode 50000000 5` → 50M Mcoin, 5 giờ\n`.giftcode` → Random 5M-1000M, 2 giờ');
        }
    }
    
    // Parse số giờ (args[2])
    if (args[2]) {
        customHours = parseInt(args[2]);
        if (isNaN(customHours) || customHours < 1 || customHours > 720) {
            return message.reply('❌ Số giờ phải từ 1 đến 720 (30 ngày)!');
        }
    }
    
    // Tạo giftcode
    const newCode = giftcode.createGiftcode(message.author.id, customReward, customHours);
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 GIFTCODE MỚI ĐÃ TẠO!')
        .setColor('#f39c12')
        .setDescription(`
**Code:** \`${newCode.code}\`
**Phần thưởng:** ${newCode.reward.toLocaleString('en-US')} Mcoin
**Số lượt:** ${newCode.maxUses} lượt
**Thời hạn:** ${newCode.duration} giờ
**Hết hạn:** <t:${Math.floor(newCode.expiresAt / 1000)}:R>

📢 **Share code này cho người chơi!**
Họ dùng lệnh: \`.code ${newCode.code}\`
        `)
        .setFooter({ text: `Code tự động xóa sau ${newCode.duration} giờ hoặc hết ${newCode.maxUses} lượt` })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    console.log(`✅ Admin ${message.author.tag} tạo code: ${newCode.code} - ${newCode.reward.toLocaleString('en-US')} Mcoin`);
}

/**
 * Lệnh: .code (Xem danh sách code HOẶC nhập code)
 * Sử dụng: 
 * - .code → Xem danh sách
 * - .code ABC123 → Nhập code
 */
async function handleCode(message, args) {
    const code = args[1]?.toUpperCase();
    
    // Nếu KHÔNG có mã code → Hiện danh sách code đang hoạt động
    if (!code) {
        const activeCodes = giftcode.listActiveCodes();
        
        if (activeCodes.length === 0) {
            return message.reply('📭 Hiện không có giftcode nào đang hoạt động!\n\n💡 **Cách dùng:** `.code <MÃ CODE>` để nhập code');
        }
        
        let codeList = '';
        activeCodes.forEach((gc, index) => {
            const usesLeft = gc.maxUses - gc.usedBy.length;
            const expiresIn = Math.floor((gc.expiresAt - Date.now()) / (60 * 1000));
            const hours = Math.floor(expiresIn / 60);
            const minutes = expiresIn % 60;
            
            codeList += `**${index + 1}. \`${gc.code}\`**\n`;
            codeList += `   💰 Thưởng: **${gc.reward.toLocaleString('en-US')} Mcoin**\n`;
            codeList += `   📊 Còn: **${usesLeft}/${gc.maxUses}** lượt\n`;
            codeList += `   ⏰ Hết hạn sau: **${hours}h ${minutes}m**\n\n`;
        });
        
        const stats = giftcode.getStats();
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 DANH SÁCH GIFTCODE ĐANG HOẠT ĐỘNG')
            .setColor('#9b59b6')
            .setDescription(codeList)
            .addFields(
                { 
                    name: '💡 Cách nhập code', 
                    value: '`.code <MÃ CODE>`\n**Ví dụ:** `.code ABC12345`', 
                    inline: false 
                },
                { 
                    name: '📊 Thống kê', 
                    value: `Code hoạt động: **${stats.activeCodes}**\nĐã nhập: **${stats.totalRedeemed}** lần\nTổng thưởng: **${stats.totalRewards.toLocaleString('en-US')}** Mcoin`, 
                    inline: false 
                }
            )
            .setFooter({ text: `Tổng ${activeCodes.length} code đang hoạt động` })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
    
    // Nếu CÓ mã code → Nhập code
    const result = giftcode.redeemGiftcode(code, message.author.id);
    
    if (!result.success) {
        return message.reply(result.message);
    }
    
    const user = getUser(message.author.id);
    user.balance += result.reward;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('🎉 NHẬP CODE THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Bạn đã nhận được **${result.reward.toLocaleString('en-US')} Mcoin**!

💰 **Số dư mới:** ${user.balance.toLocaleString('en-US')} Mcoin
${result.usesLeft > 0 ? `⏳ Code còn **${result.usesLeft} lượt**` : '🔒 Code đã hết lượt và bị xóa!'}
        `)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    console.log(`✅ User ${message.author.tag} nhập code ${code} - ${result.reward.toLocaleString('en-US')} Mcoin`);
}

/**
 * Lệnh: .delcode (Admin xóa code)
 * Sử dụng: .delcode ABC123
 */
async function handleDeleteCode(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới xóa được code!');
    }
    
    const code = args[1]?.toUpperCase();
    
    if (!code) {
        return message.reply('❌ Sử dụng: `.delcode <CODE>`\n\n**Ví dụ:** `.delcode ABC12345`');
    }
    
    const result = giftcode.deleteGiftcode(code);
    
    if (!result.success) {
        return message.reply(`❌ ${result.message}`);
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🗑️ ĐÃ XÓA CODE')
        .setColor('#e74c3c')
        .setDescription(`
**Code đã xóa:** \`${result.code.code}\`
**Phần thưởng:** ${result.code.reward.toLocaleString('en-US')} Mcoin
**Đã dùng:** ${result.code.usedBy.length}/${result.code.maxUses} lượt
        `)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    console.log(`✅ Admin ${message.author.tag} xóa code: ${code}`);
}

/**
 * Lệnh: .delallcode (Admin xóa tất cả code)
 */
async function handleDeleteAllCodes(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới xóa được tất cả code!');
    }
    
    const result = giftcode.deleteAllCodes();
    
    if (result.count === 0) {
        return message.reply('📭 Không có code nào để xóa!');
    }
    
    await message.reply(`✅ Đã xóa **${result.count} code** thành công!`);
    console.log(`✅ Admin ${message.author.tag} xóa tất cả code (${result.count})`);
}

// ========================================
// 👑 VIP & DANH HIỆU COMMANDS (ADMIN)
// ========================================

/**
 * Lệnh: .givevip (Admin cấp VIP cho user)
 */
async function handleGiveVip(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
    }
    
    const targetUser = message.mentions.users.first();
    const vipLevel = parseInt(args[2]);
    
    if (!targetUser) {
        return message.reply('❌ Sử dụng: `.givevip @user [level]`\nVí dụ: `.givevip @Tên 3`');
    }
    
    if (!vipLevel || vipLevel < 1 || vipLevel > 3) {
        return message.reply('❌ VIP level phải từ 1-3!');
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
    
    const embed = new EmbedBuilder()
        .setTitle('⭐ CẤP VIP THÀNH CÔNG!')
        .setColor('#9b59b6')
        .setDescription(`
Admin đã cấp **VIP ${vipLevel}** cho <@${targetUser.id}>!

**Đặc quyền:**
🎁 Điểm danh: +${user.vipBonus.dailyBonus.toLocaleString('en-US')} Mcoin
🎲 Thắng cược: +${user.vipBonus.betBonus}%
        `)
        .setFooter({ text: `Cấp bởi ${message.author.tag}` })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    console.log(`✅ Admin ${message.author.tag} cấp VIP${vipLevel} cho ${targetUser.tag}`);
}

/**
 * Lệnh: .removevip (Admin xóa VIP)
 */
async function handleRemoveVip(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
    }
    
    const targetUser = message.mentions.users.first();
    
    if (!targetUser) {
        return message.reply('❌ Sử dụng: `.removevip @user`');
    }
    
    const user = getUser(targetUser.id);
    
    if (!user.vipLevel || user.vipLevel === 0) {
        return message.reply('❌ User này không có VIP!');
    }
    
    user.vipLevel = 0;
    user.vipBonus = null;
    saveDB();
    
    await message.reply(`✅ Đã xóa VIP của <@${targetUser.id}>!`);
    console.log(`✅ Admin ${message.author.tag} xóa VIP của ${targetUser.tag}`);
}

/**
 * Lệnh: .givetitle (Admin cấp danh hiệu)
 */
async function handleGiveTitle(message, args) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
    }
    
    const targetUser = message.mentions.users.first();
    const titleName = args.slice(2).join(' ');
    
    if (!targetUser) {
        return message.reply('❌ Sử dụng: `.givetitle @user [tên danh hiệu]`\nVí dụ: `.givetitle @Tên Huyền Thoại`');
    }
    
    if (!titleName || titleName.length < 2) {
        return message.reply('❌ Tên danh hiệu phải có ít nhất 2 ký tự!');
    }
    
    const user = getUser(targetUser.id);
    user.vipTitle = titleName;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('👑 CẤP DANH HIỆU THÀNH CÔNG!')
        .setColor('#e91e63')
        .setDescription(`
Admin đã cấp danh hiệu **"${titleName}"** cho <@${targetUser.id}>!

✨ Danh hiệu sẽ hiển thị trên profile!
        `)
        .setFooter({ text: `Cấp bởi ${message.author.tag}` })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    console.log(`✅ Admin ${message.author.tag} cấp danh hiệu "${titleName}" cho ${targetUser.tag}`);
}

// ========================================
// 📤 SENDCODE - PHÁT CODE CÔNG KHAI
// ========================================

/**
 * Lệnh: .sendcode
 * Admin phát giftcode vào channel công khai
 */
async function handleSendCode(message, GIFTCODE_CHANNEL_ID) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới phát code được!');
    }
    
    try {
        const reward = Math.floor(Math.random() * (100000000 - 1000000 + 1)) + 1000000;
        const newCode = giftcode.createGiftcode(message.author.id, reward, 2);
        
        const channel = await message.client.channels.fetch(GIFTCODE_CHANNEL_ID);
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 GIFTCODE MỚI!')
            .setColor('#f39c12')
            .setDescription(`
Admin vừa phát hành code mới!

**🎟️ Code:** \`${newCode.code}\`
**💰 Phần thưởng:** ${newCode.reward.toLocaleString('en-US')} Mcoin
**👥 Số lượt:** ${newCode.maxUses} người
**⏰ Hết hạn:** <t:${Math.floor(newCode.expiresAt / 1000)}:R>

📢 **Nhanh tay nhập code ngay!**
Gõ: \`.code ${newCode.code}\`
            `)
            .setFooter({ text: `Phát bởi ${message.author.tag}` })
            .setTimestamp();
        
        await channel.send({ 
            content: '@everyone 🎉 **CODE MỚI ĐÃ XUẤT HIỆN!**',
            embeds: [embed] 
        });
        
        await message.reply(`✅ Đã phát code **${newCode.code}** (${newCode.reward.toLocaleString('en-US')} Mcoin) vào <#${GIFTCODE_CHANNEL_ID}>!`);
        console.log(`✅ Admin ${message.author.tag} phát code: ${newCode.code}`);
        
    } catch (e) {
        console.error('❌ Lỗi sendcode:', e);
        return message.reply(`❌ Lỗi khi phát code: \`${e.message}\``);
    }
}

// ========================================
// 🗄️ DATABASE COMMANDS
// ========================================

/**
 * Lệnh: .dbinfo
 */
async function handleDbInfo(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
    }
    
    const totalUsers = Object.keys(database.users).length;
    const totalBalance = Object.values(database.users).reduce((sum, u) => sum + u.balance, 0);
    const totalHistory = database.history.length;
    const dbExists = fs.existsSync(DB_PATH);
    
    let dbSize = 0;
    if (dbExists) {
        const stats = fs.statSync(DB_PATH);
        dbSize = (stats.size / 1024).toFixed(2);
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🗄️ THÔNG TIN DATABASE')
        .setColor('#3498db')
        .setDescription(`
**File:** ${dbExists ? '✅ Tồn tại' : '❌ Không tồn tại'}
**Đường dẫn:** \`${DB_PATH}\`
**Kích thước:** ${dbSize} KB
        `)
        .addFields(
            { name: '👥 Tổng người chơi', value: `${totalUsers}`, inline: true },
            { name: '💰 Tổng tiền hệ thống', value: `${totalBalance.toLocaleString('en-US')}`, inline: true },
            { name: '📊 Lịch sử phiên', value: `${totalHistory}`, inline: true },
            { name: '🎰 Hũ hiện tại', value: `${database.jackpot.toLocaleString('en-US')}`, inline: true },
            { name: '⏳ Phiên đang chạy', value: database.activeBettingSession ? '✅ Có' : '❌ Không', inline: true },
            { name: '⏰ Uptime', value: `${Math.floor(process.uptime() / 60)} phút`, inline: true }
        )
        .setFooter({ text: `Bot: ${message.client.user.tag}` })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

/**
 * Lệnh: .backup
 */
async function handleBackup(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
    }
    
    const backup = JSON.stringify(database, null, 2);
    const attachment = new AttachmentBuilder(Buffer.from(backup), { 
        name: `backup_${new Date().toISOString().split('T')[0]}.json` 
    });
    
    const embed = new EmbedBuilder()
        .setTitle('📦 DATABASE BACKUP')
        .setColor('#2ecc71')
        .setDescription(`
Backup được tạo lúc: ${new Date().toLocaleString('vi-VN')}

**Thống kê:**
- Người chơi: ${Object.keys(database.users).length}
- Lịch sử: ${database.history.length} phiên
- Hũ: ${database.jackpot.toLocaleString('en-US')} Mcoin

**Lưu ý:** Tải file này về và giữ an toàn!
        `)
        .setTimestamp();
    
    await message.reply({ 
        embeds: [embed],
        files: [attachment] 
    });
}

/**
 * Lệnh: .backupnow
 */
async function handleBackupNow(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
    }
    
    try {
        const backup = JSON.stringify(database, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `manual_backup_${Date.now()}.json` 
        });
        
        const embed = new EmbedBuilder()
            .setTitle('💾 BACKUP THỦ CÔNG')
            .setColor('#9b59b6')
            .setDescription(`
**Backup được tạo bởi:** <@${message.author.id}>

**Thống kê:**
👥 Người chơi: ${Object.keys(database.users).length}
📊 Lịch sử: ${database.history.length} phiên
🎰 Hũ: ${database.jackpot.toLocaleString('en-US')} Mcoin
💰 Tổng tiền: ${Object.values(database.users).reduce((sum, u) => sum + u.balance, 0).toLocaleString('en-US')} Mcoin
⏳ Phiên chạy: ${database.activeBettingSession ? '✅ Có' : '❌ Không'}
            `)
            .setFooter({ text: 'Backup thủ công' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed], files: [attachment] });
        
    } catch (e) {
        return message.reply(`❌ Lỗi tạo backup: \`${e.message}\``);
    }
}

/**
 * Lệnh: .restore
 */
async function handleRestore(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
    }
    
    return message.reply(`
📥 **HƯỚNG DẪN RESTORE DATABASE:**

1️⃣ Gửi file backup \`.json\` vào channel này
2️⃣ Kèm theo comment: \`restore confirm\`
3️⃣ Bot sẽ tự động restore

⚠️ **Cảnh báo:** Restore sẽ GHI ĐÈ toàn bộ data hiện tại!
    `);
}

/**
 * Xử lý restore file
 */
async function handleRestoreFile(message) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới được restore database!');
    }
    
    if (!message.content.toLowerCase().includes('restore confirm')) return;
    if (message.attachments.size === 0) return;
    
    const attachment = message.attachments.first();
    
    if (!attachment.name.endsWith('.json')) {
        return message.reply('❌ File phải có định dạng `.json`!');
    }
    
    const processingMsg = await message.reply('⏳ Đang xử lý restore...');
    
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
                        reject(new Error('File JSON không hợp lệ'));
                    }
                });
            }).on('error', (e) => {
                reject(new Error(`Không thể tải file: ${e.message}`));
            });
        });
        
        if (!backupData.users || typeof backupData.users !== 'object') {
            return processingMsg.edit('❌ File backup thiếu cấu trúc `users`!');
        }
        
        if (!Array.isArray(backupData.history)) {
            return processingMsg.edit('❌ File backup thiếu cấu trúc `history`!');
        }
        
        const oldBackup = JSON.stringify(database, null, 2);
        const backupDir = './database';
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        fs.writeFileSync('./database/backup_before_restore.json', oldBackup);
        
        Object.assign(database, backupData);
        
        if (typeof database.jackpot !== 'number') database.jackpot = 0;
        if (!database.lastCheckin) database.lastCheckin = {};
        
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('✅ RESTORE THÀNH CÔNG!')
            .setColor('#2ecc71')
            .setDescription(`
Database đã được khôi phục!

**Thống kê:**
👥 Người chơi: **${Object.keys(database.users).length}**
📊 Lịch sử: **${database.history.length}** phiên
🎰 Hũ: **${database.jackpot.toLocaleString('en-US')}** Mcoin

🔒 **Data cũ backup tại:** \`./database/backup_before_restore.json\`
            `)
            .setTimestamp();
        
        await processingMsg.edit({ content: null, embeds: [embed] });
        
        console.log('✅ Database restored by', message.author.tag);
        
    } catch (error) {
        console.error('❌ Lỗi restore:', error);
        return processingMsg.edit(`❌ **Lỗi:**\n\`\`\`${error.message}\`\`\``);
    }
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    // Giftcode
    handleCreateGiftcode,
    handleCode,
    handleDeleteCode,
    handleDeleteAllCodes,
    handleSendCode,
    
    // VIP & Title
    handleGiveVip,
    handleRemoveVip,
    handleGiveTitle,
    
    // Database
    handleDbInfo,
    handleBackup,
    handleBackupNow,
    handleRestore,
    handleRestoreFile
};
