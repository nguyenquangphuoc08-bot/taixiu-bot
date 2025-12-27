// index.js - FILE CHÍNH (BẢO TRÌ THÔNG BÁO KÊNH CỐ ĐỊNH)

const http = require('http');
const { Client, GatewayIntentBits } = require('discord.js');
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
    handleDeleteAllCodes
} = require('./commands/admin');
const { handleMShop, buyVipPackage, buyTitle, showVipPackages, showTitles } = require('./commands/shop');

// ✅ Validation token
if (!TOKEN) {
    console.error('❌ CRITICAL ERROR: DISCORD_TOKEN is not set!');
    console.error('📍 Please add DISCORD_TOKEN to your environment variables on Render');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ],
    // ✅ THÊM: WS options để tránh timeout
    ws: {
        properties: {
            browser: 'Discord Android'
        }
    },
    // ✅ THÊM: Retry options
    rest: {
        timeout: 60000,
        retries: 3
    }
});

// ✅ THÊM: Log khi WS connect/disconnect
client.ws.on('debug', (info) => {
    if (info.includes('Session') || info.includes('Identify')) {
        console.log('🔌 WS Debug:', info);
    }
});
// ===== AUTO BACKUP KHI BOT TẮT =====

async function emergencyBackup() {
    try {
        console.log('🚨 PHÁT HIỆN BOT SẮP TẮT - BACKUP KHẨN CẤP...');
        
        if (!client.isReady()) {
            console.log('⚠️ Client chưa ready, bỏ qua backup');
            return;
        }
        
        const channel = await client.channels.fetch(BACKUP_CHANNEL_ID).catch(() => null);
        if (!channel) {
            console.error('❌ Không tìm thấy backup channel');
            return;
        }
        
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
        console.error('❌ Lỗi backup khẩn cấp:', error);
    }
}

// Bắt SIGTERM (Render deploy)
process.on('SIGTERM', async () => {
    console.log('⚠️ Nhận SIGTERM - Bot sắp tắt');
    await emergencyBackup();
    setTimeout(() => process.exit(0), 3000);
});

// Bắt SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
    console.log('⚠️ Nhận SIGINT - Người dùng tắt bot');
    await emergencyBackup();
    setTimeout(() => process.exit(0), 3000);
});

// Bắt SIGHUP (Terminal đóng)
process.on('SIGHUP', async () => {
    console.log('⚠️ Nhận SIGHUP');
    await emergencyBackup();
    setTimeout(() => process.exit(0), 3000);
});

// Bắt lỗi chưa xử lý
process.on('uncaughtException', async (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    await emergencyBackup();
    setTimeout(() => process.exit(1), 3000);
});

process.on('unhandledRejection', async (reason) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
    await emergencyBackup();
    setTimeout(() => process.exit(1), 3000);
});

// ===== BACKUP ĐỊNH KỲ 6 TIẾNG =====
setInterval(async () => {
    console.log('⏰ Đến giờ backup tự động 6 tiếng...');
    
    try {
        if (client.isReady()) {
            await autoBackup(client, BACKUP_CHANNEL_ID);
            console.log('✅ Backup 6 tiếng thành công!');
        } else {
            console.warn('⚠️ Client chưa ready, bỏ qua backup');
        }
    } catch (error) {
        console.error('❌ Lỗi backup định kỳ:', error);
    }
    
    // Kiểm tra memory
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    console.log(`📊 Memory đang dùng: ${memMB}MB`);
    
    if (memMB > 450) {
        console.warn(`⚠️ Memory cao (${memMB}MB) - Backup phòng ngừa`);
        await emergencyBackup();
    }
    
}, 6 * 60 * 60 * 1000); // ✅ 6 TIẾNG = 6 * 60 phút * 60 giây * 1000 ms

// ✅ Bot ready
client.once('ready', () => {
    console.log(`✅ Bot đã online: ${client.user.tag}`);
    client.user.setActivity('🎲 Tài Xỉu | .help', { type: 'PLAYING' });
    
    console.log('✅ Hệ thống backup khẩn cấp đã kích hoạt!');
    console.log('✅ Backup tự động: 6 tiếng/lần');
    console.log('✅ Tất cả hệ thống đã sẵn sàng!');
});

// ===== XỬ LÝ DISCORD DISCONNECT & RECONNECT =====

client.on('shardDisconnect', (event, shardId) => {
    console.warn(`⚠️ Shard ${shardId} bị disconnect!`, event);
});

client.on('shardReconnecting', (shardId) => {
    console.log(`🔄 Shard ${shardId} đang reconnect...`);
});

client.on('shardResume', (shardId, replayedEvents) => {
    console.log(`✅ Shard ${shardId} đã reconnect! Events: ${replayedEvents}`);
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

client.on('warn', (info) => {
    console.warn('⚠️ Discord warning:', info);
});

// Kiểm tra kết nối Discord mỗi 30 giây
let connectionCheckFailCount = 0;

setInterval(async () => {
    try {
        if (!client.isReady()) {
            connectionCheckFailCount++;
            console.error(`❌ Bot OFFLINE! Lần thứ ${connectionCheckFailCount} phát hiện mất kết nối`);
            
            // Nếu mất kết nối 3 lần liên tiếp (1.5 phút) thì restart
            if (connectionCheckFailCount >= 3) {
                console.error('🚨 Bot mất kết nối quá lâu! Đang RESTART...');
                
                // Backup trước khi restart
                await emergencyBackup();
                
                // Destroy client cũ và login lại
                client.destroy();
                
                setTimeout(async () => {
                    try {
                        await client.login(TOKEN);
                        console.log('✅ Reconnect thành công!');
                        connectionCheckFailCount = 0;
                    } catch (err) {
                        console.error('❌ Reconnect thất bại:', err);
                        process.exit(1); // Render sẽ tự động restart
                    }
                }, 5000);
            }
        } else {
            // Reset counter nếu bot online
            if (connectionCheckFailCount > 0) {
                console.log('✅ Bot đã online trở lại!');
                connectionCheckFailCount = 0;
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi check connection:', error);
    }
}, 30 * 1000); // Check mỗi 30 giây

// Heartbeat: Ping Discord API mỗi 5 phút để giữ kết nối
setInterval(async () => {
    try {
        if (client.isReady()) {
            const ping = client.ws.ping;
            console.log(`💓 Heartbeat: Ping = ${ping}ms`);
            
            // Nếu ping quá cao (>1000ms) thì cảnh báo
            if (ping > 1000) {
                console.warn(`⚠️ Ping cao bất thường: ${ping}ms`);
            }
        }
    } catch (error) {
        console.error('❌ Heartbeat error:', error);
    }
}, 5 * 60 * 1000); // Mỗi 5 phút

// Xử lý tin nhắn (commands)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // ✅ LOG ĐỂ DEBUG
    console.log(`📨 Nhận tin nhắn từ ${message.author.tag}: ${message.content}`);
    
    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    
    try {
        // === COMMANDS NGƯỜI CHƠI ===
        if (command === '.tx') {
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
        
        // === GIFTCODE COMMANDS ===
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
        
        // === COMMANDS ADMIN ===
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
        
        // === ADMIN RESTART COMMAND ===
        else if (command === '.restart' && message.author.id === ADMIN_ID) {
            await message.reply('🔄 Đang restart bot...');
            await emergencyBackup();
            process.exit(0); // Render sẽ tự động restart
        }
        
        // === HELP COMMAND ===
        else if (command === '.help') {
            const isAdmin = message.author.id === ADMIN_ID;
            
            // ✅ HELP CHO NGƯỜI CHƠI THƯỜNG (KHÔNG THẤY ADMIN COMMANDS)
            if (!isAdmin) {
                const helpText = `
📜 **DANH SÁCH LỆNH**

**👤 Người chơi:**
\`.tx\` - Bắt đầu phiên cược mới
\`.mcoin\` - Xem profile card (ảnh đẹp!)
\`.setbg\` - Đặt ảnh nền profile (upload ảnh + gõ lệnh)
\`.setbg reset\` - Xóa ảnh nền, về mặc định
\`.sc\` / \`.soicau\` - Xem biểu đồ lịch sử
\`.tang @user [số]\` - Tặng tiền
\`.dd\` / \`.diemdanh\` - Điểm danh (8h/lần)
\`.daily\` - Xem nhiệm vụ hằng ngày
\`.claimall\` - Nhận thưởng nhiệm vụ
\`.mshop\` - Cửa hàng VIP & danh hiệu

**🎁 Giftcode:**
\`.code\` - Xem danh sách code đang hoạt động
\`.code <MÃ>\` - Nhập giftcode
Ví dụ: \`.code ABC12345\`

**🎲 Đặt cược:**
Bấm nút Tài/Xỉu/Chẵn/Lẻ → Nhập số tiền
Ví dụ: \`1k\`, \`5m\`, \`10b\`, \`100000000\`
Giới hạn: **1,000** - **100,000,000,000** Mcoin
                `;
                
                return await message.reply(helpText);
            }
            
            // ✅ HELP CHO ADMIN (CÓ THÊM ADMIN COMMANDS)
            const adminHelpText = `
📜 **DANH SÁCH LỆNH**

**👤 Người chơi:**
\`.tx\` - Bắt đầu phiên cược mới
\`.mcoin\` - Xem profile card (ảnh đẹp!)
\`.setbg\` - Đặt ảnh nền profile (upload ảnh + gõ lệnh)
\`.setbg reset\` - Xóa ảnh nền, về mặc định
\`.sc\` / \`.soicau\` - Xem biểu đồ lịch sử
\`.tang @user [số]\` - Tặng tiền
\`.dd\` / \`.diemdanh\` - Điểm danh (8h/lần)
\`.daily\` - Xem nhiệm vụ hằng ngày
\`.claimall\` - Nhận thưởng nhiệm vụ
\`.mshop\` - Cửa hàng VIP & danh hiệu

**🎁 Giftcode:**
\`.code\` - Xem danh sách code đang hoạt động
\`.code <MÃ>\` - Nhập giftcode
Ví dụ: \`.code ABC12345\`

**🎲 Đặt cược:**
Bấm nút Tài/Xỉu/Chẵn/Lẻ → Nhập số tiền
Ví dụ: \`1k\`, \`5m\`, \`10b\`, \`100000000\`
Giới hạn: **1,000** - **100,000,000,000** Mcoin

**🔧 Admin - Giftcode:**
\`.giftcode\` - Tạo code random (5M-1000M, 2h)
\`.giftcode [số tiền] [giờ]\` - Tạo code tùy chỉnh
  Ví dụ: \`.giftcode 50000000 5\` (50M, 5 giờ)
\`.sendcode\` - Phát code công khai
\`.delcode <MÃ>\` - Xóa code cụ thể
\`.delallcode\` - Xóa tất cả code

**🔧 Admin - VIP & Title:**
\`.givevip @user [1-3]\` - Cấp VIP
\`.removevip @user\` - Xóa VIP
\`.givetitle @user [tên]\` - Cấp danh hiệu tùy chỉnh

**🔧 Admin - Database:**
\`.dbinfo\` - Thông tin database
\`.backup\` - Backup database
\`.backupnow\` - Backup thủ công
\`.restore\` - Hướng dẫn restore
\`.restart\` - Restart bot (khẩn cấp)
            `;
            
            await message.reply(adminHelpText);
        }
        
        // Xử lý restore file
        if (message.attachments.size > 0 && message.content.toLowerCase().includes('restore confirm')) {
            await handleRestoreFile(message);
        }
        
    } catch (error) {
        console.error('❌ Command error:', error);
        await message.reply('❌ Có lỗi xảy ra khi xử lý lệnh!').catch(() => {});
    }
});

// ✅ XỬ LÝ INTERACTIONS (buttons & modals)
client.on('interactionCreate', async (interaction) => {
    try {
        // === XỬ LÝ BUTTON ===
        if (interaction.isButton()) {
            const { customId } = interaction;
            
            // Button đặt cược Tài Xỉu
            if (['bet_tai', 'bet_xiu', 'bet_chan', 'bet_le'].includes(customId)) {
                await handleBetButton(interaction);
            }
            // Button Shop VIP
            else if (customId === 'shop_vip') {
                await showVipPackages(interaction);
            }
            // Button Shop Danh hiệu
            else if (customId === 'shop_titles') {
                await showTitles(interaction);
            }
        }
            
        // === XỬ LÝ MODAL ===
        else if (interaction.isModalSubmit()) {
            const { customId } = interaction;
            
            // Modal đặt cược
            if (customId.startsWith('bet_amount_')) {
                await handleBetModal(interaction);
            }
        }
        
        // === XỬ LÝ SELECT MENU (shop) ===
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'buy_vip') {
                const vipId = interaction.values[0];
                await buyVipPackage(interaction, vipId);
            }
            else if (interaction.customId === 'buy_title') {
                const titleId = interaction.values[0];
                await buyTitle(interaction, titleId);
            }
        }
        
    } catch (error) {
        console.error('❌ Interaction error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Có lỗi xảy ra!', 
                flags: 64
            }).catch(() => {});
        }
    }
});

// ✅ HANDLER: Xử lý button đặt cược
async function handleBetButton(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    
    const bettingSession = getBettingSession();
    
    if (!bettingSession) {
        return interaction.reply({ 
            content: '❌ Không có phiên cược nào đang diễn ra!', 
            flags: 64
        });
    }
    
    const userId = interaction.user.id;
    const user = getUser(userId);
    
    // Kiểm tra đã đặt cược chưa
    if (bettingSession.bets[userId]) {
        return interaction.reply({ 
            content: '⚠️ Bạn đã đặt cược rồi!', 
            flags: 64
        });
    }
    
    // Hiển thị modal nhập số tiền
    const modal = new ModalBuilder()
        .setCustomId(`bet_amount_${interaction.customId}`)
        .setTitle('💰 Nhập số tiền cược');
    
    const amountInput = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel(`Số dư hiện tại: ${user.balance.toLocaleString('en-US')} Mcoin`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Nhập số tiền (tối đa: ${user.balance.toLocaleString('en-US')})`)
        .setRequired(true);
    
    const row = new ActionRowBuilder().addComponents(amountInput);
    modal.addComponents(row);
    
    await interaction.showModal(modal);
}

// ✅ HANDLER: Xử lý modal đặt cược
async function handleBetModal(interaction) {
    const customId = interaction.customId;
    let amountStr = interaction.fields.getTextInputValue('amount').toLowerCase().trim();
    const userId = interaction.user.id;
    const user = getUser(userId);
    const bettingSession = getBettingSession();
    
    if (!bettingSession) {
        return interaction.reply({ 
            content: '❌ Phiên cược đã kết thúc!', 
            flags: 64
        });
    }
    
    // Parse số tiền (hỗ trợ 1k, 5m, 10b)
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
    
    // Validate
    if (isNaN(amount) || amount < 1000) {
        return interaction.reply({ 
            content: '❌ Số tiền không hợp lệ! Tối thiểu **1,000** Mcoin\nVí dụ: `1k`, `5m`, `10b`', 
            flags: 64
        });
    }
    
    if (amount > 100000000000000) {
        return interaction.reply({ 
            content: '❌ Số tiền quá lớn! Tối đa **100,000,000,000,000** Mcoin', 
            flags: 64
        });
    }
    
    if (user.balance < amount) {
        return interaction.reply({ 
            content: `❌ Bạn không đủ tiền!\n💰 Số dư: **${user.balance.toLocaleString('en-US')}** Mcoin`, 
            flags: 64
        });
    }
    
    // Trừ tiền
    user.balance -= amount;
    
    // Lưu cược
    const betType = customId.replace('bet_amount_bet_', '');
    bettingSession.bets[userId] = { amount, type: betType };
    
    saveDB();
    
    const typeEmoji = {
        'tai': '🔵 Tài',
        'xiu': '🔴 Xỉu',
        'chan': '🟣 Chẵn',
        'le': '🟡 Lẻ'
    };
    
    await interaction.reply({ 
        content: `✅ Đặt cược **${amount.toLocaleString('en-US')} Mcoin** vào **${typeEmoji[betType]}** thành công!\n💰 Số dư còn: **${user.balance.toLocaleString('en-US')} Mcoin**`, 
        flags: 64
    });
    
    // Cập nhật số người chơi trong embed
    try {
        const message = await interaction.channel.messages.fetch(bettingSession.messageId);
        const embed = message.embeds[0];
        const playerCount = Object.keys(bettingSession.bets).length;
        
        embed.fields[1].value = `${playerCount}`;
        await message.edit({ embeds: [embed] });
    } catch (err) {
        console.error('Cannot update player count:', err);
    }
}

// ===== HTTP SERVER ĐỂ RENDER KHÔNG TẮT BOT =====
const server = http.createServer((req, res) => {
    // Endpoint health check
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            uptime: process.uptime(),
            botReady: client.isReady(),
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`
🤖 Discord Bot đang chạy!
⏰ Uptime: ${Math.floor(process.uptime() / 60)} phút
📊 Status: ${client.isReady() ? '✅ Online' : '❌ Offline'}
        `);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 HTTP Server chạy trên port ${PORT}`);
});

// ===== PING ĐỊNH KỲ ĐỂ RENDER KHÔNG TẮT =====
// Tự ping chính mình mỗi 5 phút
setInterval(() => {
    let url = process.env.RENDER_EXTERNAL_URL;
    
    // ✅ FIX: Kiểm tra URL có protocol chưa
    if (!url) {
        console.log('⚠️ RENDER_EXTERNAL_URL chưa set, bỏ qua self-ping');
        return;
    }
    
    // ✅ Đảm bảo URL có https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    // ✅ Bỏ trailing slash nếu có
    url = url.replace(/\/$/, '');
    
    const pingUrl = url + '/health';
    
    console.log(`🔄 Self-ping đến: ${pingUrl}`);
    
    const https = require('https');
    const protocol = url.startsWith('https') ? https : require('http');
    
    protocol.get(pingUrl, (res) => {
        console.log(`✅ Self-ping thành công - Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('📊 Health check:', data);
        });
    }).on('error', (err) => {
        console.error('❌ Self-ping lỗi:', err.message);
    });
    
}, 5 * 60 * 1000); // Ping mỗi 5 phút

// ===== KIỂM TRA TOKEN TRƯỚC KHI LOGIN =====
console.log('===========================================');
console.log('🔍 KIỂM TRA TOKEN VÀ MÔI TRƯỜNG');
console.log('===========================================');
console.log('✅ Token exists:', !!TOKEN);
console.log('📏 Token length:', TOKEN ? TOKEN.length : 0);
console.log('🔤 Token preview:', TOKEN ? TOKEN.substring(0, 30) + '...' : 'MISSING');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('===========================================');

// Kiểm tra token hợp lệ
if (!TOKEN) {
    console.error('❌ CRITICAL: DISCORD_TOKEN is missing!');
    process.exit(1);
}

if (TOKEN.length < 50) {
    console.error('❌ CRITICAL: DISCORD_TOKEN too short (invalid)!');
    console.error('📍 Please check your token on Render Environment Variables');
    process.exit(1);
}

// Login bot với retry logic
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 3;

async function loginBot() {
    loginAttempts++;
    
    console.log('');
    console.log('===========================================');
    console.log(`🔄 LOGIN ATTEMPT #${loginAttempts}/${MAX_LOGIN_ATTEMPTS}`);
    console.log('⏰ Time:', new Date().toISOString());
    console.log('===========================================');
    
    try {
        console.log('📡 Connecting to Discord Gateway...');
        
        // ✅ THÊM TIMEOUT 30 GIÂY
        const loginPromise = client.login(TOKEN);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Login timeout after 30 seconds')), 30000);
        });
        
        await Promise.race([loginPromise, timeoutPromise]);
        
        console.log('');
        console.log('✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
        console.log('✅         LOGIN SUCCESSFUL!        ✅');
        console.log('✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅');
        console.log('');
        
        loginAttempts = 0;
        
    } catch (error) {
        console.log('');
        console.log('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
        console.log('❌         LOGIN FAILED!          ❌');
        console.log('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
        console.log('');
        console.error('📋 Error Details:');
        console.error('   - Name:', error.name);
        console.error('   - Message:', error.message);
        console.error('   - Code:', error.code);
        console.error('   - Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
        console.log('');
        
        // Token invalid
        if (error.code === 'TokenInvalid' || error.message.includes('token')) {
            console.error('🚨 INVALID TOKEN!');
            console.error('📍 Go to: https://discord.com/developers/applications');
            console.error('📍 Reset token and update DISCORD_TOKEN on Render');
            process.exit(1);
        }
        
        // Timeout → Likely network/websocket issue
        if (error.message.includes('timeout')) {
            console.error('🚨 CONNECTION TIMEOUT!');
            console.error('📍 Possible issues:');
            console.error('   - Render network blocking Discord Gateway');
            console.error('   - Discord API is down');
            console.error('   - WebSocket connection blocked');
        }
        
        // Max attempts
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            console.error(`🚨 FAILED AFTER ${MAX_LOGIN_ATTEMPTS} ATTEMPTS!`);
            console.error('📍 Bot will exit and Render will restart it');
            process.exit(1);
        }
        
        // Retry
        const retryDelay = 15;
        console.log(`🔄 Retrying in ${retryDelay} seconds...`);
        console.log('===========================================');
        
        setTimeout(() => {
            loginBot();
        }, retryDelay * 1000);
    }
}

loginBot();

