// index.js - FULL CODE HOÀN CHỈNH (CÓ LỆNH .donate)



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

    handleDonate // ✅ THÊM DONATE

} = require('./commands/admin');

const { handleMShop, buyVipPackage, buyTitle, showVipPackages, showTitles } = require('./commands/shop');



// ✅ Import buttonHandler

const { handleButtonClick } = require('./handlers/buttonHandler');



// ✅ Validation token

if (!TOKEN) {

    console.error('❌ CRITICAL ERROR: DISCORD_TOKEN is not set!');

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

    ws: {

        properties: {

            browser: 'Discord Android'

        },

        large_threshold: 50

    },

    rest: {

        timeout: 60000,

        retries: 5

    },

    shards: 'auto'

});



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

    await emergencyBackup();

    setTimeout(() => process.exit(0), 3000);

});



process.on('SIGINT', async () => {

    await emergencyBackup();

    setTimeout(() => process.exit(0), 3000);

});



process.on('SIGHUP', async () => {

    await emergencyBackup();

    setTimeout(() => process.exit(0), 3000);

});



process.on('uncaughtException', async (error) => {

    console.error('❌ UNCAUGHT EXCEPTION:', error.message);

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

        await emergencyBackup();

    }

}, 6 * 60 * 60 * 1000);



// ✅ Bot ready

client.once('ready', () => {

    console.log(`✅ Bot online: ${client.user.tag}`);

    

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

    console.warn(`⚠️ Shard ${shardId} disconnect`);

});



client.on('shardReconnecting', (shardId) => {

    console.log(`🔄 Shard ${shardId} reconnecting...`);

});



client.on('shardResume', (shardId) => {

    console.log(`✅ Shard ${shardId} resumed`);

});



client.on('error', (error) => {

    console.error('❌ Client error:', error.message);

});



// Kiểm tra kết nối mỗi 30s

let connectionCheckFailCount = 0;



setInterval(async () => {

    try {

        if (!client.isReady()) {

            connectionCheckFailCount++;

            console.error(`❌ Bot OFFLINE! Lần ${connectionCheckFailCount}`);

            

            if (connectionCheckFailCount >= 3) {

                console.error('🚨 Mất kết nối quá lâu! RESTART...');

                await emergencyBackup();

                client.destroy();

                

                setTimeout(async () => {

                    try {

                        await client.login(TOKEN);

                        console.log('✅ Reconnect thành công!');

                        connectionCheckFailCount = 0;

                    } catch (err) {

                        console.error('❌ Reconnect thất bại:', err.message);

                        process.exit(1);

                    }

                }, 5000);

            }

        } else {

            if (connectionCheckFailCount > 0) {

                console.log('✅ Bot đã online trở lại!');

                connectionCheckFailCount = 0;

            }

        }

    } catch (error) {

        console.error('❌ Check connection error:', error.message);

    }

}, 30 * 1000);



// Heartbeat mỗi 5 phút

setInterval(async () => {

    try {

        if (client.isReady()) {

            const ping = client.ws.ping;

            console.log(`💓 Ping: ${ping}ms`);

            

            if (ping > 1000) {

                console.warn(`⚠️ Ping cao: ${ping}ms`);

            }

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

            await message.reply('🏓 Pong! Bot đang hoạt động!');

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

        // ✅ THÊM LỆNH .donate

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

            

            // ✅ Xử lý nút mở menu cược

            if (customId === 'open_bet_menu') {

                const bettingSession = getBettingSession();

                await handleButtonClick(interaction, bettingSession);

            }

            // Shop buttons (giữ nguyên)

            else if (customId === 'shop_vip') {

                await showVipPackages(interaction);

            }

            else if (customId === 'shop_titles') {

                await showTitles(interaction);

            }

        }

        

        // ===== XỬ LÝ SELECT MENU =====

        else if (interaction.isStringSelectMenu()) {

            // ✅ Menu chọn loại cược

            if (interaction.customId === 'bet_type_select') {

                const bettingSession = getBettingSession();

                await handleButtonClick(interaction, bettingSession);

            }

            // Shop menus (giữ nguyên)

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

            // ✅ Modal cược Tài/Xỉu/Chẵn/Lẻ

            if (interaction.customId.startsWith('bet_modal_')) {

                await handleBetModal(interaction);

            }

            // ✅ Modal cược số

            else if (interaction.customId === 'modal_bet_number') {

                await handleBetNumberModal(interaction);

            }

            // ✅ Modal cược tổng

            else if (interaction.customId === 'modal_bet_total') {

                await handleBetTotalModal(interaction);

            }

        }

    } catch (error) {

        console.error('❌ Interaction error:', error.message);

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

    

    // Validate số

    if (isNaN(number) || number < 1 || number > 6) {

        return interaction.reply({ 

            content: '❌ Số phải từ 1 đến 6!', 

            flags: 64

        });

    }

    

    // Parse số tiền

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

    

    // Validate tổng

    if (isNaN(totalValue) || totalValue < 3 || totalValue > 18) {

        return interaction.reply({ 

            content: '❌ Tổng phải từ 3 đến 18!', 

            flags: 64

        });

    }

    

    // Parse số tiền

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

            status: 'online',

            uptime: process.uptime(),

            botReady: client.isReady(),

            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',

            timestamp: new Date().toISOString()

        }));

    } else {

        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });

        res.end(`🤖 Bot online\n⏰ Uptime: ${Math.floor(process.uptime() / 60)}m\n📊 ${client.isReady() ? '✅ Online' : '❌ Offline'}`);

    }

});



const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {

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

if (TOKEN.length < 50) {

    console.error('❌ Invalid token!');

    process.exit(1);

}



client.login(TOKEN).then(() => {

    console.log('✅ Login thành công!');

}).catch((error) => {

    console.error('❌ Login thất bại:', error.message);

    process.exit(1);

});
