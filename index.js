// index.js - ĐÃ SỬA (XÓA TIMEOUT + GIẢM LOG)

// Tắt warnings
process.removeAllListeners('warning');

const http = require('http');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { TOKEN, ADMIN_ID, GIFTCODE_CHANNEL_ID, BACKUP_CHANNEL_ID } = require('./config');
const { database, saveDB, getUser } = require('./utils/database');
const { autoBackup, backupOnStartup, backupOnShutdown, restoreInterruptedSession } = require('./services/backup');

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
        retries: 3
    },
    shards: 'auto'
});

let isReady = false;
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;

// ===== AUTO BACKUP KHI BOT TẮT =====
let isShuttingDown = false;

async function emergencyBackup() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    try {
        if (!client.isReady()) {
            console.log('⚠️ Bot chưa ready, skip backup');
            return;
        }
        
        await backupOnShutdown(client, BACKUP_CHANNEL_ID);
        saveDB();
        
    } catch (error) {
        console.error('❌ Lỗi backup khẩn cấp:', error.message);
    }
}

// ✅ BẮT SIGTERM VÀ BACKUP TRƯỚC KHI TẮT
process.on('SIGTERM', async () => {
    console.log('🔴 Nhận tín hiệu SIGTERM - Đang backup và tắt...');
    await emergencyBackup();
    setTimeout(() => {
        client.destroy();
        process.exit(0);
    }, 3000);
});

process.on('SIGINT', async () => {
    console.log('🔴 Nhận tín hiệu SIGINT - Đang tắt bot...');
    await emergencyBackup();
    setTimeout(() => {
        client.destroy();
        process.exit(0);
    }, 3000);
});

process.on('SIGHUP', () => {
    console.log('🔴 Nhận tín hiệu SIGHUP - ĐANG BỎ QUA');
});

process.on('uncaughtException', async (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    await emergencyBackup();
    setTimeout(() => process.exit(1), 3000);
});

process.on('unhandledRejection', async (reason) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
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
    console.log(`📊 Memory: ${memMB}MB | Uptime: ${Math.floor(process.uptime() / 60)}m`);
    
    if (memMB > 450) {
        console.warn(`⚠️ Memory cao: ${memMB}MB`);
    }
}, 6 * 60 * 60 * 1000);

// ===== DEBUG LOGS (GIẢM SPAM CHO RENDER) =====
client.on('debug', (info) => {
    // ✅ CHỈ LOG LỖI QUAN TRỌNG
    if (info.includes('Hit a 429')) {
        console.warn('⚠️ RATE LIMITED');
        return;
    }
    // BỎ QUA HẾT CÁC LOG KHÁC
});

client.on('warn', (info) => {
    console.warn('⚠️ WARN:', info);
});

client.on('rateLimit', (info) => {
    console.warn('⏱️ RATE LIMIT:', JSON.stringify(info));
});

// ✅ Bot ready
client.once('ready', async () => {
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
    
    // ✅ BACKUP KHI KHỞI ĐỘNG
    try {
        await backupOnStartup(client, BACKUP_CHANNEL_ID);
    } catch (error) {
        console.error('❌ Lỗi backup khởi động:', error.message);
    }
    
    // ✅ KHÔI PHỤC PHIÊN CƯỢC BỊ GIÁN ĐOẠN
    try {
        await restoreInterruptedSession(client);
    } catch (error) {
        console.error('❌ Lỗi restore session:', error.message);
    }
    
    console.log('✅ Tất cả hệ thống đã sẵn sàng!');
});

// ===== DISCORD ERROR HANDLERS =====
client.on('shardDisconnect', (event, shardId) => {
    console.warn(`⚠️ Shard ${shardId} disconnect - Code: ${event.code}`);
    
    if (event.code === 1000) return;
    
    reconnectAttempts++;
    if (reconnectAttempts > MAX_RECONNECT) {
        console.error('🚨 Too many reconnect attempts!');
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
});

// ===== XỬ LÝ TIN NHẮN (ĐÃ XÓA TIMEOUT) =====
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    
    if (command.startsWith('.')) {
        try {
            if (command === '.ping') {
                await message.reply(`🏓 Pong! Bot đang hoạt động!\n⏱️ Ping: ${client.ws.ping}ms\n⏰ Uptime: ${Math.floor(process.uptime() / 60)}m`);
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
                    const embed = {
                        color: 0x00ff00,
                        title: '📋 HƯỚNG DẪN SỬ DỤNG BOT',
                        description: '**Chào mừng bạn đến với hệ thống Tài Xỉu!**',
                        fields: [
                            {
                                name: '🎲 Game',
                                value: '```\n.tx       → Bắt đầu phiên cược Tài Xỉu\n.sc       → Xem lịch sử kết quả\n```',
                                inline: false
                            },
                            {
                                name: '👤 Tài Khoản',
                                value: '```\n.mcoin    → Xem profile & số dư\n.setbg    → Đặt ảnh nền (upload + gõ lệnh)\n.dd       → Điểm danh (8h/lần)\n```',
                                inline: false
                            },
                            {
                                name: '🎁 Nhiệm Vụ & Quà',
                                value: '```\n.daily    → Nhiệm vụ hằng ngày\n.claimall → Nhận hết thưởng\n```',
                                inline: false
                            },
                            {
                                name: '💸 Giao Dịch',
                                value: '```\n.tang @user [số] → Tặng tiền cho người khác\n.mshop           → Cửa hàng VIP & danh hiệu\n```',
                                inline: false
                            },
                            {
                                name: '🎁 Giftcode',
                                value: '```\n.code          → Xem danh sách code có sẵn\n.code <MÃ>     → Nhập code để nhận quà\n```',
                                inline: false
                            },
                            {
                                name: '📌 Cách Đặt Cược',
                                value: '```\n1. Gõ .tx để mở phiên cược\n2. Bấm nút "Đặt Cược"\n3. Chọn cửa (Tài/Xỉu/Chẵn/Lẻ/Số/Tổng)\n4. Nhập số tiền (VD: 1k, 5m, 10b)\n```',
                                inline: false
                            },
                            {
                                name: '💡 Lưu Ý',
                                value: '• Tối thiểu cược: **1,000 Mcoin**\n• Tài: 11-18 điểm | Xỉu: 3-10 điểm\n• Chẵn/Lẻ: Tổng chẵn/lẻ\n• Cược số (1-6): x3 tiền\n• Cược tổng (3-18): x5 tiền',
                                inline: false
                            }
                        ],
                        footer: {
                            text: '🎮 Chúc bạn may mắn!'
                        },
                        timestamp: new Date()
                    };
                    
                    await message.reply({ embeds: [embed] });
                } else {
                    const embed = {
                        color: 0xff0000,
                        title: '⚙️ BẢNG LỆNH ADMIN',
                        description: '**Quyền hạn quản trị viên**',
                        fields: [
                            {
                                name: '👥 Lệnh Người Chơi (Dùng được)',
                                value: '```\n.tx, .mcoin, .setbg, .sc, .tang, .dd\n.daily, .claimall, .mshop, .code\n```',
                                inline: false
                            },
                            {
                                name: '🎁 Quản Lý Giftcode',
                                value: '```fix\n.giftcode [tiền] [giờ]  → Tạo code mới\n.sendcode               → Gửi code vào channel\n.delcode <MÃ>           → Xóa 1 code\n.delallcode             → Xóa tất cả code\n```',
                                inline: false
                            },
                            {
                                name: '👑 Quản Lý VIP',
                                value: '```yaml\n.givevip @user [1-3]   → Cấp VIP (1,2,3)\n.removevip @user       → Xóa VIP\n.givetitle @user [tên] → Cấp danh hiệu\n```',
                                inline: false
                            },
                            {
                                name: '💰 Quản Lý Tiền',
                                value: '```css\n.donate @user [số] → Tặng tiền\n(VD: .donate @ai 100m)\n```',
                                inline: false
                            },
                            {
                                name: '🔧 Quản Lý Database',
                                value: '```arduino\n.dbinfo     → Xem thông tin DB\n.backup     → Xem hướng dẫn backup\n.backupnow  → Backup ngay lập tức\n.restore    → Khôi phục DB\n.restart    → Khởi động lại bot\n```',
                                inline: false
                            },
                            {
                                name: '📊 Thông Tin Hệ Thống',
                                value: `\`\`\`\n📶 Ping: ${client.ws.ping}ms\n⏰ Uptime: ${Math.floor(process.uptime() / 60)}m\n💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\`\`\``,
                                inline: false
                            }
                        ],
                        footer: {
                            text: '🔒 Chỉ Admin mới thấy bảng này'
                        },
                        timestamp: new Date()
                    };
                    
                    await message.reply({ embeds: [embed] });
                }
            }
            
        } catch (error) {
            console.error(`❌ Command error:`, error.message);
            
            try {
                await message.reply('❌ Có lỗi xảy ra! Vui lòng thử lại.');
            } catch {}
        }
    }
    
    if (message.attachments.size > 0 && message.content.toLowerCase().includes('restore confirm')) {
        await handleRestoreFile(message);
    }
});

// ===== INTERACTIONS =====
client.on('interactionCreate', async (interaction) => {
    try {
        // ===== XỬ if (interaction.isButton() || 
        interaction.isStringSelectMenu()) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.customId === 'open_bet_menu' || interaction.customId === 'bet_type_select') {
        const bettingSession = getBettingSession();
        return handleButtonClick(interaction, bettingSession);
    }
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
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Có lỗi xảy ra!', 
                ephemeral: true
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
            ephemeral: true
        });
    }
    
    if (isNaN(number) || number < 1 || number > 6) {
        return interaction.reply({ 
            content: '❌ Số phải từ 1 đến 6!', 
            ephemeral: true
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
            ephemeral: true
        });
    }
    
    if (amount > 100000000000000) {
        return interaction.reply({ 
            content: '❌ Số tiền quá lớn! Tối đa 100,000,000,000,000 Mcoin', 
            ephemeral: true
        });
    }
    
    if (user.balance < amount) {
        return interaction.reply({ 
            content: `❌ Không đủ tiền!\n💰 Số dư: ${user.balance.toLocaleString('en-US')} Mcoin`, 
            ephemeral: true
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
        ephemeral: true
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
            ephemeral: true
        });
    }
    
    if (isNaN(totalValue) || totalValue < 3 || totalValue > 18) {
        return interaction.reply({ 
            content: '❌ Tổng phải từ 3 đến 18!', 
            ephemeral: true
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
            ephemeral: true
        });
    }
    
    if (amount > 100000000000000) {
        return interaction.reply({ 
            content: '❌ Số tiền quá lớn! Tối đa 100,000,000,000,000 Mcoin', 
            ephemeral: true
        });
    }
    
    if (user.balance < amount) {
        return interaction.reply({ 
            content: `❌ Không đủ tiền!\n💰 Số dư: ${user.balance.toLocaleString('en-US')} Mcoin`, 
            ephemeral: true
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
        ephemeral: true
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
            ephemeral: true
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
            ephemeral: true
        });
    }
    
    if (amount > 100000000000000) {
        return interaction.reply({ 
            content: '❌ Số tiền quá lớn! Tối đa 100,000,000,000,000 Mcoin', 
            ephemeral: true
        });
    }
    
    if (user.balance < amount) {
        return interaction.reply({ 
            content: `❌ Không đủ tiền!\n💰 Số dư: ${user.balance.toLocaleString('en-US')} Mcoin`, 
            ephemeral: true
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
        ephemeral: true
    });
}

// ===== HTTP SERVER =====
const server = http.createServer((req, res) => {
    // ✅ KHÔNG LOG REQUEST - GIẢM SPAM
    
    if (req.url === '/health' || req.url === '/') {
        const status = {
            status: client.isReady() ? 'online' : 'offline',
            uptime: Math.floor(process.uptime()),
            botReady: client.isReady(),
            ping: client.ws.ping,
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            timestamp: new Date().toISOString()
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`🤖 Bot ${client.isReady() ? 'ONLINE ✅' : 'OFFLINE ❌'}\n⏰ Uptime: ${Math.floor(process.uptime() / 60)}m\n🏓 Ping: ${client.ws.ping}ms`);
    }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP Server listening on 0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
    console.error('❌ HTTP Server error:', err);
    process.exit(1);
});

// ===== SELF-PING (3 PHÚT) - KHÔNG LOG =====
setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL;
    if (!url) return;
    
    let pingUrl = url.startsWith('http') ? url : 'https://' + url;
    pingUrl = pingUrl.replace(/\/$/, '') + '/health';
    
    const https = require('https');
    https.get(pingUrl, () => {
        // ✅ KHÔNG LOG - GIẢM SPAM
    }).on('error', () => {
        // ✅ KHÔNG LOG LỖI PING
    });
}, 3 * 60 * 1000);

// ===== LOGIN =====
console.log('🔑 Token:', TOKEN ? TOKEN.substring(0, 20) + '...' : 'MISSING');

let attempts = 0;
async function loginBot() {
    attempts++;
    console.log(`\n🔄 LOGIN #${attempts}/5`);
    
    try {
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        
        await Promise.race([client.login(TOKEN), timeout]);
        console.log('✅✅✅ LOGIN SUCCESS ✅✅✅\n');
        attempts = 0;
        
    } catch (error) {
        console.log('❌❌❌ LOGIN FAILED ❌❌❌');
        console.error('Error:', error.message);
        
        if (error.code === 'TokenInvalid') {
            console.error('🚨 TOKEN SAI! Reset token trên Discord Portal');
            process.exit(1);
        }
        
        if (attempts >= 5) {
            console.error('🚨 Quá 5 lần thử, thoát...');
            process.exit(1);
        }
        
        console.log(`🔄 Retry sau ${attempts * 10}s...\n`);
        setTimeout(loginBot, attempts * 10000);
    }
}

loginBot();

