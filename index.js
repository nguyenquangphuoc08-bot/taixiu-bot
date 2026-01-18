// index.js - FULL CODE HOÀN CHỈNH (CÓ RATE LIMIT PROTECTION)

// Tắt warnings
process.removeAllListeners('warning');

const http = require('http');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { TOKEN, ADMIN_ID, GIFTCODE_CHANNEL_ID, BACKUP_CHANNEL_ID } = require('./config');
const { database, saveDB, getUser } = require('./utils/database');
const { autoBackup } = require('./services/backup');

// Import commands
const { handleTaiXiu, handleSoiCau, getBettingSession, setBettingSession } = require('./commands/game');
const { handleMcoin, handleSetBg, handleTang, handleDiemDanh } = require('./commands/user');
const { handleDaily, handleClaimAll } = require('./commands/quest');
const { 
    handleDbInfo, 
    handleBackup, 
    handleBackupNow, 
    handleRestore, 
    handleRestoreFile,
    handleSendCode,
    handleGiveVip,
    handleRemoveVip,
    handleGiveTitle,
    handleCreateGiftcode,
    handleCode,
    handleDeleteCode,
    handleDeleteAllCodes,
    handleDonate
} = require('./commands/admin');
const { handleMShop, buyVipPackage, buyTitle, showVipPackages, showTitles } = require('./commands/shop');

// Import buttonHandler
const { handleButtonClick } = require('./handlers/buttonHandler');

// ✅ Validation token
if (!TOKEN) {
    console.error('❌ CRITICAL ERROR: DISCORD_TOKEN is not set!');
    process.exit(1);
}

if (TOKEN.length < 50) {
    console.error('❌ Invalid token length!');
    process.exit(1);
}

console.log('🔑 Token length:', TOKEN.length);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    ws: {
        properties: {
            browser: 'Discord Client'
        },
        large_threshold: 50
    },
    rest: {
        timeout: 60000,
        retries: 3 // ✅ Giảm retries để tránh rate limit
    },
    shards: 'auto'
});

let isReady = false;
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;

// ===== AUTO BACKUP KHI BOT TẮT =====
async function emergencyBackup() {
    try {
        if (!client.isReady()) return;
        
        const channel = await client.channels.fetch(BACKUP_CHANNEL_ID).catch(() => null);
        if (!channel) return;
        
        const backupData = JSON.stringify(database, null, 2);
        const buffer = Buffer.from(backupData, 'utf-8');
        const timestamp = new Date().toLocaleString('vi-VN');
        const fileName = `emergency_${Date.now()}.json`;
        
        await channel.send({
            content: `🚨 **BACKUP KHẨN CẤP** - Bot đang tắt\n⏰ ${timestamp}`,
            files: [{
                attachment: buffer,
                name: fileName
            }]
        });
        
        console.log('✅ Backup khẩn cấp thành công!');
    } catch (error) {
        console.error('❌ Lỗi backup khẩn cấp:', error.message);
    }
}

process.on('SIGTERM', async () => {
    console.log('🔴 Nhận tín hiệu SIGTERM');
    await emergencyBackup();
    client.destroy();
    setTimeout(() => process.exit(0), 2000);
});

process.on('SIGINT', async () => {
    console.log('🔴 Nhận tín hiệu SIGINT');
    await emergencyBackup();
    client.destroy();
    setTimeout(() => process.exit(0), 2000);
});

process.on('SIGHUP', async () => {
    console.log('🔴 Nhận tín hiệu SIGHUP');
    await emergencyBackup();
    client.destroy();
    setTimeout(() => process.exit(0), 2000);
});

process.on('uncaughtException', async (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    await emergencyBackup();
    setTimeout(() => process.exit(1), 2000);
});

process.on('unhandledRejection', async (reason) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
    await emergencyBackup();
    setTimeout(() => process.exit(1), 2000);
});

// ===== BACKUP ĐỊNH KỲ 6 TIẾNG =====
setInterval(async () => {
    try {
        if (client.isReady()) {
            await autoBackup(client, BACKUP_CHANNEL_ID);
            console.log('✅ Backup 6 tiếng thành công!');
        }
    } catch (error) {
        console.error('❌ Lỗi backup:', error.message);
    }
    
    const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    console.log(`📊 Memory: ${memMB}MB`);
    
    if (memMB > 450) {
        console.warn(`⚠️ Memory cao: ${memMB}MB`);
    }
}, 6 * 60 * 60 * 1000);

// ===== DEBUG LOGS (chặn spam) =====
client.on('debug', (info) => {
    // Chặn spam logs
    if (info.includes('Heartbeat')) return;
    if (info.includes('Hit a 429')) {
        console.warn('⚠️ RATE LIMITED:', info);
        return;
    }
    if (info.includes('Remaining')) return;
    
    console.log('🐛 DEBUG:', info);
});

client.on('warn', (info) => {
    console.warn('⚠️ WARN:', info);
});

client.on('rateLimit', (info) => {
    console.warn('⏱️ RATE LIMIT:', JSON.stringify(info));
});

// ✅ Bot ready
client.once('ready', () => {
    isReady = true;
    reconnectAttempts = 0;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Bot online: ${client.user.tag}`);
    console.log(`🆔 Bot ID: ${client.user.id}`);
    console.log(`🎮 Servers: ${client.guilds.cache.size}`);
    console.log(`👥 Users: ${client.users.cache.size}`);
    console.log(`🏓 Ping: ${client.ws.ping}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    client.user.setPresence({
        activities: [{
            name: '🎲 Tài Xỉu | .help',
            type: ActivityType.Playing
        }],
        status: 'online'
    });
    
    console.log('✅ Tất cả hệ thống đã sẵn sàng!');
});

// ===== DISCORD ERROR HANDLERS =====
client.on('shardDisconnect', (event, shardId) => {
    console.warn(`⚠️ Shard ${shardId} disconnect - Code: ${event.code}`);
    
    if (event.code === 1000) return; // Normal close
    
    reconnectAttempts++;
    if (reconnectAttempts > MAX_RECONNECT) {
        console.error('🚨 Too many reconnect attempts! Exiting to avoid rate limit.');
        process.exit(0);
    }
});

client.on('shardReconnecting', (shardId) => {
    console.log(`🔄 Shard ${shardId} reconnecting...`);
});

client.on('shardResume', (shardId) => {
    console.log(`✅ Shard ${shardId} resumed`);
    reconnectAttempts = 0;
});

client.on('error', (error) => {
    console.error('❌ Client error:', error.message);
    if (error.stack) {
        console.error('Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
});

// Heartbeat mỗi 5 phút
setInterval(async () => {
    try {
        if (client.isReady()) {
            const ping = client.ws.ping;
            console.log(`💓 Heartbeat | Ping: ${ping}ms | Status: ${client.ws.status}`);
            
            if (ping > 1000) {
                console.warn(`⚠️ Ping cao: ${ping}ms`);
            }
        } else {
            console.warn('⚠️ Bot not ready!');
        }
    } catch (error) {
        console.error('❌ Heartbeat error:', error.message);
    }
}, 5 * 60 * 1000);

// ===== XỬ LÝ TIN NHẮN =====
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    
    try {
        if (command === '.ping') {
            await message.reply(`🏓 Pong! Bot đang hoạt động!\n⏱️ Ping: ${client.ws.ping}ms`);
        }
        else if (command === '.tx') {
            await handleTaiXiu(message, client);
        }
        else if (command === '.sc' || command === '.soicau') {
            await handleSoiCau(message);
        }
        else if (command === '.mcoin') {
            await handleMcoin(message);
        }
        else if (command === '.setbg') {
            await handleSetBg(message, args);
        }
        else if (command === '.tang') {
            await handleTang(message, args);
        }
        else if (command === '.diemdanh' || command === '.dd') {
            await handleDiemDanh(message);
        }
        else if (command === '.daily') {
            await handleDaily(message);
        }
        else if (command === '.claimall') {
            await handleClaimAll(message);
        }
        else if (command === '.mshop') {
            await handleMShop(message);
        }
        else if (command === '.giftcode' || command === '.gc') {
            await handleCreateGiftcode(message, args);
        }
        else if (command === '.code') {
            await handleCode(message, args);
        }
        else if (command === '.delcode' || command === '.xoacode') {
            await handleDeleteCode(message, args);
        }
        else if (command === '.delallcode' || command === '.xoatatca') {
            await handleDeleteAllCodes(message);
        }
        else if (command === '.dbinfo') {
            await handleDbInfo(message);
        }
        else if (command === '.backup') {
            await handleBackup(message);
        }
        else if (command === '.backupnow') {
            await handleBackupNow(message);
        }
        else if (command === '.restore') {
            await handleRestore(message);
        }
        else if (command === '.sendcode') {
            await handleSendCode(message, GIFTCODE_CHANNEL_ID);
        }
        else if (command === '.givevip') {
            await handleGiveVip(message, args);
        }
        else if (command === '.removevip') {
            await handleRemoveVip(message, args);
        }
        else if (command === '.givetitle') {
            await handleGiveTitle(message, args);
        }
        else if (command === '.donate') {
            await handleDonate(message, args);
        }
        else if (command === '.restart' && message.author.id === ADMIN_ID) {
            await message.reply('🔄 Đang restart...');
            await emergencyBackup();
            process.exit(0);
        }
        else if (command === '.help') {
            const isAdmin = message.author.id === ADMIN_ID;
            
            if (!isAdmin) {
                const helpText = `📜 DANH SÁCH LỆNH

👤 Người chơi:
- .tx - Bắt đầu phiên cược
- .mcoin - Xem profile
- .setbg - Đặt ảnh nền (upload + gõ lệnh)
- .sc - Xem lịch sử
- .tang @user [số] - Tặng tiền
- .dd - Điểm danh (8h/lần)
- .daily - Nhiệm vụ hằng ngày
- .claimall - Nhận thưởng
- .mshop - Cửa hàng VIP

🎁 Giftcode:
- .code - Xem danh sách code
- .code <MÃ> - Nhập code

🎲 Đặt cược: Bấm nút → Chọn cửa → Nhập tiền
(VD: 1k, 5m, 10b)`;
                
                await message.reply(helpText);
            } else {
                const adminHelpText = `📜 DANH SÁCH LỆNH

👤 Người chơi:
- .tx, .mcoin, .setbg, .sc, .tang, .dd, .daily, .claimall, .mshop

🎁 Giftcode:
- .code - Xem/Nhập code

🔧 Admin - Giftcode:
- .giftcode [tiền] [giờ] - Tạo code
- .sendcode - Phát code
- .delcode <MÃ> - Xóa code
- .delallcode - Xóa tất cả

🔧 Admin - VIP:
- .givevip @user [1-3] - Cấp VIP
- .removevip @user - Xóa VIP
- .givetitle @user [tên] - Cấp danh hiệu

💰 Admin - Tiền:
- .donate @user [số tiền] - Tặng tiền (VD: .donate @ai 100m)

🔧 Admin - Database:
- .dbinfo, .backup, .backupnow, .restore, .restart`;
                
                await message.reply(adminHelpText);
            }
        }
        
        if (message.attachments.size > 0 && message.content.toLowerCase().includes('restore confirm')) {
            await handleRestoreFile(message);
        }
        
    } catch (error) {
        console.error('❌ Command error:', error.message);
        console.error('Stack:', error.stack);
        
        try {
            await message.reply('❌ Có lỗi xảy ra!');
        } catch {}
    }
});

// ===== INTERACTIONS =====
client.on('interactionCreate', async (interaction) => {
    try {
        // ===== XỬ LÝ BUTTON =====
        if (interaction.isButton()) {
            const { customId } = interaction;
            
            if (customId === 'open_bet_menu') {
                const bettingSession = getBettingSession();
                await handleButtonClick(interaction, bettingSession);
            }
            else if (customId === 'shop_vip') {
                await showVipPackages(interaction);
            }
            else if (customId === 'shop_titles') {
                await showTitles(interaction);
            }
        }
        
        // ===== XỬ LÝ SELECT MENU =====
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'bet_type_select') {
                const bettingSession = getBettingSession();
                await handleButtonClick(interaction, bettingSession);
            }
            else if (interaction.customId === 'buy_vip') {
                const vipId = interaction.values[0];
                await buyVipPackage(interaction, vipId);
            }
            else if (interaction.customId === 'buy_title') {
                const titleId = interaction.values[0];
                await buyTitle(interaction, titleId);
            }
        }
        
        // ===== XỬ LÝ MODAL =====
        else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('bet_modal_')) {
                await handleBetModal(interaction);
            }
            else if (interaction.customId === 'modal_bet_number') {
                await handleBetNumberModal(interaction);
            }
            else if (interaction.customId === 'modal_bet_total') {
                await handleBetTotalModal(interaction);
            }
        }
    } catch (error) {
        console.error('❌ Interaction error:', error.message);
        console.error('Stack:', error.stack);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Có lỗi xảy ra!', 
                flags: 64
            }).catch(() => {});
        }
    }
});

// ===== XỬ LÝ MODAL CƯỢC SỐ =====
async function handleBetNumberModal(interaction) {
    const numberStr = interaction.fields.getTextInputValue('number_value').trim();
    let amountStr = interaction.fields.getTextInputValue('bet_amount').toLowerCase().trim();
    
    const number = parseInt(numberStr);
    const userId = interaction.user.id;
    const user = getUser(userId);
    const bettingSession = getBettingSession();
    
    if (!bettingSession) {
        return interaction.reply({ 
            content: '❌ Phiên đã kết thúc!', 
            flags: 64
        });
    }
    
    if (isNaN(number) || number < 1 || number > 6) {
        return interaction.reply({ 
            content: '❌ Số phải từ 1 đến 6!', 
            flags: 64
        });
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
    
    if (isNaN(amount) || amount < 1000) {
        return interaction.reply({ 
            content: '❌ Số tiền không hợp lệ! Tối thiểu 1,000 Mcoin', 
            flags: 64
        });
    }
    
    if (amount > 100000000000000) {
        return interaction.reply({ 
            content: '❌ Số tiền quá lớn! Tối đa 100,000,000,000,000 Mcoin', 
            flags: 64
        });
    }
    
    if (user.balance < amount) {
        return interaction.reply({ 
            content: `❌ Không đủ tiền!\n💰 Số dư: ${user.balance.toLocaleString('en-US')} Mcoin`, 
            flags: 64
        });
    }
    
    user.balance -= amount;
    bettingSession.bets[userId] = { 
        amount, 
        type: 'number',
        value: number 
    };
    
    saveDB();
    
    await interaction.reply({ 
        content: `✅ Đặt cược **${amount.toLocaleString('en-US')}** Mcoin vào số **${number}** thành công!\n🎯 Thắng nhận: **${(amount * 3).toLocaleString('en-US')}** Mcoin (x3)\n💰 Số dư còn: ${user.balance.toLocaleString('en-US')} Mcoin`, 
        flags: 64
    });
}

// ===== XỬ LÝ MODAL CƯỢC TỔNG =====
async function handleBetTotalModal(interaction) {
    const totalStr = interaction.fields.getTextInputValue('total_value').trim();
    let amountStr = interaction.fields.getTextInputValue('bet_amount').toLowerCase().trim();
    
    const totalValue = parseInt(totalStr);
    const userId = interaction.user.id;
    const user = getUser(userId);
    const bettingSession = getBettingSession();
    
    if (!bettingSession) {
        return interaction.reply({ 
            content: '❌ Phiên đã kết thúc!', 
            flags: 64
        });
    }
    
    if (isNaN(totalValue) || totalValue < 3 || totalValue > 18) {
        return interaction.reply({ 
            content: '❌ Tổng phải từ 3 đến 18!', 
            flags: 64
        });
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
    
    if (isNaN(amount) || amount < 1000) {
        return interaction.reply({ 
            content: '❌ Số tiền không hợp lệ! Tối thiểu 1,000 Mcoin', 
            flags: 64
        });
    }
    
    if (amount > 100000000000000) {
        return interaction.reply({ 
            content: '❌ Số tiền quá lớn! Tối đa 100,000,000,000,000 Mcoin', 
            flags: 64
        });
    }
    
    if (user.balance < amount) {
        return interaction.reply({ 
            content: `❌ Không đủ tiền!\n💰 Số dư: ${user.balance.toLocaleString('en-US')} Mcoin`, 
            flags: 64
        });
    }
    
    user.balance -= amount;
    bettingSession.bets[userId] = { 
        amount, 
        type: 'total',
        value: totalValue 
    };
    
    saveDB();
    
    await interaction.reply({ 
        content: `✅ Đặt cược **${amount.toLocaleString('en-US')}** Mcoin vào tổng **${totalValue}** thành công!\n📊 Thắng nhận: **${(amount * 5).toLocaleString('en-US')}** Mcoin (x5)\n💰 Số dư còn: ${user.balance.toLocaleString('en-US')} Mcoin`, 
        flags: 64
    });
}

// ===== XỬ LÝ MODAL TÀI/XỈU/CHẴN/LẺ =====
async function handleBetModal(interaction) {
    const customId = interaction.customId;
    let amountStr = interaction.fields.getTextInputValue('bet_amount').toLowerCase().trim();
    const userId = interaction.user.id;
    const user = getUser(userId);
    const bettingSession = getBettingSession();
    
    if (!bettingSession) {
        return interaction.reply({ 
            content: '❌ Phiên đã kết thúc!', 
            flags: 64
        });
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
    
    if (isNaN(amount) || amount < 1000) {
        return interaction.reply({ 
            content: '❌ Số tiền không hợp lệ! Tối thiểu 1,000 Mcoin', 
            flags: 64
        });
    }
    
    if (amount > 100000000000000) {
        return interaction.reply({ 
            content: '❌ Số tiền quá lớn! Tối đa 100,000,000,000,000 Mcoin', 
            flags: 64
        });
    }
    
    if (user.balance < amount) {
        return interaction.reply({ 
            content: `❌ Không đủ tiền!\n💰 Số dư: ${user.balance.toLocaleString('en-US')} Mcoin`, 
            flags: 64
        });
    }
    
    user.balance -= amount;
    
    const betType = customId.replace('bet_modal_', '');
    bettingSession.bets[userId] = { amount, type: betType };
    
    saveDB();
    
    const typeEmoji = {
        'tai': '🔵 Tài',
        'xiu': '🔴 Xỉu',
        'chan': '🟣 Chẵn',
        'le': '🟡 Lẻ'
    };
    
    await interaction.reply({ 
        content: `✅ Đặt cược ${amount.toLocaleString('en-US')} Mcoin vào ${typeEmoji[betType]} thành công!\n💰 Số dư còn: ${user.balance.toLocaleString('en-US')} Mcoin`, 
        flags: 64
    });
}

// ===== HTTP SERVER =====
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: client.isReady() ? 'online' : 'offline',
            uptime: process.uptime(),
            botReady: client.isReady(),
            wsStatus: client.ws.status,
            ping: client.ws.ping,
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`🤖 Bot ${client.isReady() ? 'online' : 'offline'}\n⏰ Uptime: ${Math.floor(process.uptime() / 60)}m\n🏓 Ping: ${client.ws.ping}ms`);
    }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP Server: port ${PORT}`);
});

// ===== SELF-PING =====
setInterval(() => {
    let url = process.env.RENDER_EXTERNAL_URL;
    if (!url) return;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    url = url.replace(/\/$/, '');
    const pingUrl = url + '/health';
    
    const https = require('https');
    const protocol = url.startsWith('https') ? https : require('http');
    
    protocol.get(pingUrl, (res) => {
        // Silent ping
    }).on('error', () => {});
}, 5 * 60 * 1000);

// ===== LOGIN =====
console.log('🚀 Starting login...');

client.login(TOKEN).then(() => {
    console.log('✅ Login request sent!');
}).catch((error) => {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ LOGIN FAILED!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (error.message && error.message.includes('429')) {
        console.error('🚨 RATE LIMITED! Wait 10-15 minutes, then reset token.');
    } else if (error.code === 'TokenInvalid') {
        console.error('🚨 TOKEN INVALID! Reset token in Discord Developer Portal!');
    } else if (error.code === 'DisallowedIntents') {
        console.error('🚨 INTENTS NOT ENABLED! Enable all 3 intents in Developer Portal!');
    }
    
    process.exit(1);
});
