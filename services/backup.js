const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { database } = require('../utils/database');

// Backup khi khởi động
async function backupOnStartup(client, BACKUP_CHANNEL_ID) {
    try {
        const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
        
        const backup = JSON.stringify(database, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `startup_backup_${Date.now()}.json` 
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🚀 BOT VỪA KHỞI ĐỘNG')
            .setColor('#2ecc71')
            .setDescription(`
Bot đã online và tạo backup khởi động!

**Database hiện tại:**
👥 Người chơi: ${Object.keys(database.users).length}
📊 Lịch sử: ${database.history.length} phiên  
🎰 Hũ: ${database.jackpot.toLocaleString('en-US')} Mcoin
            `)
            .setFooter({ text: 'Backup khi khởi động' })
            .setTimestamp();
        
        await channel.send({ embeds: [embed], files: [attachment] });
        console.log('✅ Backup khởi động thành công!');
        
    } catch (e) {
        console.error('❌ Lỗi backup khởi động:', e.message);
    }
}

// Auto backup mỗi 6 giờ
async function autoBackup(client, BACKUP_CHANNEL_ID) {
    try {
        const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
        
        const backup = JSON.stringify(database, null, 2);
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `auto_backup_${timestamp}.json` 
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🤖 AUTO BACKUP - 6 GIỜ')
            .setColor('#3498db')
            .setDescription(`
**Thống kê database:**
👥 Tổng người chơi: **${Object.keys(database.users).length}**
📊 Lịch sử phiên: **${database.history.length}** phiên
🎰 Hũ hiện tại: **${database.jackpot.toLocaleString('en-US')}** Mcoin
💰 Tổng tiền hệ thống: **${Object.values(database.users).reduce((sum, u) => sum + u.balance, 0).toLocaleString('en-US')}** Mcoin
⏳ Phiên đang chạy: ${database.activeBettingSession ? '✅ Có' : '❌ Không'}
            `)
            .setFooter({ text: 'Backup tự động mỗi 6 giờ' })
            .setTimestamp();
        
        await channel.send({ embeds: [embed], files: [attachment] });
        console.log(`✅ [${new Date().toLocaleString('vi-VN')}] Auto backup thành công!`);
        
    } catch (e) {
        console.error('❌ Lỗi auto backup:', e.message);
    }
}

// Backup khi bot tắt
async function backupOnShutdown(client, BACKUP_CHANNEL_ID) {
    try {
        const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
        
        const backup = JSON.stringify(database, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `shutdown_backup_${Date.now()}.json` 
        });
        
        const embed = new EmbedBuilder()
            .setTitle('⚠️ BACKUP KHẨN CẤP - BOT TẮT')
            .setColor('#e74c3c')
            .setDescription(`
Bot đang tắt (deploy/restart), đã backup data!

**Thống kê:**
👥 Người chơi: ${Object.keys(database.users).length}
📊 Lịch sử: ${database.history.length} phiên
🎰 Hũ: ${database.jackpot.toLocaleString('en-US')} Mcoin
            `)
            .setTimestamp();
        
        await channel.send({ embeds: [embed], files: [attachment] });
        console.log('✅ Backup trước khi tắt thành công!');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (e) {
        console.error('❌ Lỗi backup trước khi tắt:', e.message);
    }
}

// Khôi phục phiên cược bị gián đoạn
async function restoreInterruptedSession(client) {
    const { database, getUser, saveDB } = require('../utils/database');
    
    if (database.activeBettingSession) {
        console.log('🔄 Phát hiện phiên cược bị gián đoạn, đang hoàn tiền...');
        
        const session = database.activeBettingSession;
        
        for (const [userId, bet] of Object.entries(session.bets)) {
            const user = getUser(userId);
            user.balance += bet.amount;
            console.log(`💰 Hoàn ${bet.amount} Mcoin cho user ${userId}`);
        }
        
        saveDB();
        
        try {
            const channel = await client.channels.fetch(session.channelId);
            const embed = new EmbedBuilder()
                .setTitle('⚠️ PHIÊN CƯỢC BỊ GIÁN ĐOẠN')
                .setColor('#e67e22')
                .setDescription(`
Bot đã được cập nhật/restart trong lúc có phiên cược đang chạy.

**✅ ĐÃ HOÀN TIỀN CHO TẤT CẢ NGƯỜI CHƠI**

Vui lòng bắt đầu phiên mới bằng lệnh \`.tx\`
                `)
                .setTimestamp();
            
            await channel.send({ embeds: [embed] });
        } catch (e) {
            console.error('Không thể gửi thông báo hoàn tiền:', e);
        }
        
        database.activeBettingSession = null;
        saveDB();
    }
}

module.exports = {
    backupOnStartup,
    autoBackup,
    backupOnShutdown,
    restoreInterruptedSession
};
