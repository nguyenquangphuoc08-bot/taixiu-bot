// services/maintenance.js - BẢO TRÌ TỰ ĐỘNG 00:00

const { EmbedBuilder } = require('discord.js');
const { database, saveDB } = require('../utils/database');

let maintenanceMode = false;
let maintenanceEndTime = null;

// ===== TẠO GIFTCODE =====
function createGiftcode(amount, hours) {
    const code = `MAINT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expireTime = Date.now() + (hours * 60 * 60 * 1000);
    
    if (!database.giftcodes) database.giftcodes = {};
    
    database.giftcodes[code] = {
        amount: amount,
        expireTime: expireTime,
        used: false,
        usedBy: null,
        createdAt: Date.now(),
        type: 'maintenance'
    };
    
    saveDB();
    
    console.log(`🎁 Tạo giftcode bảo trì: ${code} - ${amount.toLocaleString('en-US')} Mcoin`);
    
    return { code, amount, expireTime };
}

// ===== KHỞI ĐỘNG BẢO TRÌ TỰ ĐỘNG =====
function initMaintenanceScheduler(client, maintenanceChannelId) {
    console.log('🔧 Hệ thống bảo trì tự động đã khởi động (00:00 mỗi ngày)');
    
    // Kiểm tra mỗi phút
    setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Bảo trì vào 00:00
        if (hours === 0 && minutes === 0 && !maintenanceMode) {
            startMaintenance(client, maintenanceChannelId);
        }
        
        // Kết thúc bảo trì sau 1 tiếng
        if (maintenanceMode && Date.now() >= maintenanceEndTime) {
            endMaintenance(client, maintenanceChannelId);
        }
    }, 60000); // Check mỗi phút
    
    // Khôi phục trạng thái nếu bot restart trong lúc bảo trì
    if (database.maintenanceMode && database.maintenanceEndTime) {
        if (Date.now() < database.maintenanceEndTime) {
            maintenanceMode = true;
            maintenanceEndTime = database.maintenanceEndTime;
            console.log('⚠️ Khôi phục trạng thái bảo trì...');
        } else {
            database.maintenanceMode = false;
            database.maintenanceEndTime = null;
            saveDB();
        }
    }
}

// ===== BẮT ĐẦU BẢO TRÌ =====
async function startMaintenance(client, maintenanceChannelId) {
    maintenanceMode = true;
    maintenanceEndTime = Date.now() + 60 * 60 * 1000; // 1 tiếng
    
    database.maintenanceMode = true;
    database.maintenanceEndTime = maintenanceEndTime;
    saveDB();
    
    console.log('🔧 BẮT ĐẦU BẢO TRÌ - 00:00');
    
    // Thông báo vào kênh cố định
    if (maintenanceChannelId) {
        try {
            const channel = await client.channels.fetch(maintenanceChannelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle('🔧 HỆ THỐNG BẢO TRÌ')
                    .setColor('#e74c3c')
                    .setDescription(`
**Server đang bảo trì để cập nhật!**

⏰ **Thời gian:** 1 tiếng (đến 01:00)
🎁 **Phần thưởng:** Giftcode 10M sau khi bảo trì
⚙️ **Nội dung:** Cập nhật tính năng mới

Hẹn gặp lại sau! 💖
                    `)
                    .setFooter({ text: 'Tự động bảo trì vào 00:00 mỗi ngày' })
                    .setTimestamp();
                
                await channel.send({ 
                    content: '@everyone', // Ping everyone
                    embeds: [embed] 
                });
                console.log('✅ Đã gửi thông báo bảo trì');
            }
        } catch (error) {
            console.error('❌ Không thể gửi thông báo bảo trì:', error);
        }
    }
}

// ===== KẾT THÚC BẢO TRÌ =====
async function endMaintenance(client, maintenanceChannelId) {
    maintenanceMode = false;
    maintenanceEndTime = null;
    
    database.maintenanceMode = false;
    database.maintenanceEndTime = null;
    saveDB();
    
    console.log('✅ KẾT THÚC BẢO TRÌ - 01:00');
    
    // Tạo giftcode 10M (hết hạn sau 24h)
    const giftcode = createGiftcode(10000000, 24);
    
    // Thông báo vào kênh cố định
    if (maintenanceChannelId) {
        try {
            const channel = await client.channels.fetch(maintenanceChannelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ BẢO TRÌ HOÀN TẤT!')
                    .setColor('#2ecc71')
                    .setDescription(`
**Hệ thống đã hoạt động trở lại!**

🎁 **GIFTCODE BẢO TRÌ**
\`\`\`${giftcode.code}\`\`\`

💰 **Giá trị:** 10,000,000 Mcoin
⏰ **Hết hạn:** 24 giờ
📝 **Dùng:** \`.code ${giftcode.code}\`

Cảm ơn bạn đã kiên nhẫn chờ đợi! 💖
                    `)
                    .setFooter({ text: 'Chúc bạn chơi vui vẻ!' })
                    .setTimestamp();
                
                await channel.send({ 
                    content: '@everyone', // Ping everyone
                    embeds: [embed] 
                });
                console.log('✅ Đã gửi thông báo kết thúc bảo trì');
            }
        } catch (error) {
            console.error('❌ Không thể gửi thông báo kết thúc bảo trì:', error);
        }
    }
}

// ===== KIỂM TRA BẢO TRÌ =====
function isMaintenanceMode() {
    return maintenanceMode;
}

function getMaintenanceTimeLeft() {
    if (!maintenanceMode) return 0;
    return Math.ceil((maintenanceEndTime - Date.now()) / 60000); // phút
}

// ===== DỌN DẸP GIFTCODE HẾT HẠN =====
function cleanExpiredGiftcodes() {
    if (!database.giftcodes) return;
    
    let cleaned = 0;
    const now = Date.now();
    
    for (const [code, data] of Object.entries(database.giftcodes)) {
        if (now > data.expireTime) {
            delete database.giftcodes[code];
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        saveDB();
        console.log(`🧹 Đã dọn dẹp ${cleaned} giftcode hết hạn`);
    }
}

module.exports = {
    initMaintenanceScheduler,
    isMaintenanceMode,
    getMaintenanceTimeLeft,
    cleanExpiredGiftcodes
};
