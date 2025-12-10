const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database, saveDB, DB_PATH } = require('../utils/database');
const fs = require('fs');
const https = require('https');

const ADMIN_ID = '1100660298073002004';

// Lệnh: .sendcode (Admin phát code ngay lập tức)
async function handleSendCode(message, channelId) {
    if (message.author.id !== ADMIN_ID) {
        return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
    }
    
    try {
        const giftcodeModule = require('../giftcode');
        
        // Random số tiền từ 1M đến 100M
        const reward = Math.floor(Math.random() * (100000000 - 1000000 + 1)) + 1000000;
        
        // Tạo code mới (2 giờ)
        const newCode = giftcodeModule.createGiftcode(message.author.id, reward, 2);
        
        const targetChannel = await message.client.channels.fetch(channelId);
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 GIFTCODE TỰ ĐỘNG!')
            .setColor('#f39c12')
            .setDescription(`
Bot vừa phát hành code mới!

**🎟️ Code:** \`${newCode.code}\`
**💰 Phần thưởng:** ${newCode.reward.toLocaleString('en-US')} Mcoin
**👥 Số lượt:** ${newCode.maxUses} người
**⏰ Hết hạn:** <t:${Math.floor(newCode.expiresAt / 1000)}:R>

📢 **Nhanh tay nhập code ngay!**
Gõ: \`.code ${newCode.code}\`
            `)
            .setFooter({ text: 'Code phát bởi admin' })
            .setTimestamp();
        
        await targetChannel.send({ 
            content: '@everyone 🎉 **CODE MỚI ĐÃ XUẤT HIỆN!**',
            embeds: [embed] 
        });
        
        await message.reply(`✅ Đã phát code **${newCode.code}** (${reward.toLocaleString('en-US')} Mcoin) tại <#${channelId}>!`);
        
    } catch (e) {
        return message.reply(`❌ Lỗi phát code: \`${e.message}\``);
    }
}

const ADMIN_ID = '1100660298073002004';

// Lệnh: .dbinfo
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

// Lệnh: .backup
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

// Lệnh: .backupnow
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

// Lệnh: .restore
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

// Xử lý restore khi gửi file
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
                        reject(new Error('File JSON không hợp lệ hoặc bị lỗi'));
                    }
                });
            }).on('error', (e) => {
                reject(new Error(`Không thể tải file: ${e.message}`));
            });
        });
        
        if (!backupData.users || typeof backupData.users !== 'object') {
            return processingMsg.edit('❌ File backup thiếu hoặc sai cấu trúc `users`!');
        }
        
        if (!Array.isArray(backupData.history)) {
            return processingMsg.edit('❌ File backup thiếu hoặc sai cấu trúc `history`!');
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
        if (database.activeBettingSession !== null && typeof database.activeBettingSession !== 'object') {
            database.activeBettingSession = null;
        }
        
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('✅ RESTORE THÀNH CÔNG!')
            .setColor('#2ecc71')
            .setDescription(`
Database đã được khôi phục từ backup!

**Thống kê sau restore:**
👥 Người chơi: **${Object.keys(database.users).length}**
📊 Lịch sử: **${database.history.length}** phiên
🎰 Hũ: **${database.jackpot.toLocaleString('en-US')}** Mcoin
⏳ Phiên đang chạy: ${database.activeBettingSession ? '✅ Có' : '❌ Không'}

🔒 **Data cũ đã backup tại:** \`./database/backup_before_restore.json\`
            `)
            .setFooter({ text: 'Đã restore lúc' })
            .setTimestamp();
        
        await processingMsg.edit({ content: null, embeds: [embed] });
        
        console.log('✅ Database restored successfully by', message.author.tag);
        
    } catch (error) {
        console.error('❌ Lỗi restore:', error);
        return processingMsg.edit({
            content: `❌ **Lỗi khi restore database:**\n\`\`\`${error.message}\`\`\`\n\n💡 Kiểm tra:\n- File JSON có đúng format không?\n- File có bị lỗi/hỏng không?`
        });
    }
}

module.exports = {
    handleDbInfo,
    handleBackup,
    handleBackupNow,
    handleRestore,
    handleRestoreFile
};
