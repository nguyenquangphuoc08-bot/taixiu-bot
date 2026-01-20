// index.js - RENDER FREE LITE PLUS

process.removeAllListeners('warning');

const http = require('http');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { TOKEN, ADMIN_ID, GIFTCODE_CHANNEL_ID, BACKUP_CHANNEL_ID } = require('./config');
const { saveDBDebounced, getUser } = require('./utils/database');
const { autoBackup, backupOnStartup, backupOnShutdown, restoreInterruptedSession } = require('./services/backup');

const { handleTaiXiu, handleSoiCau, getBettingSession } = require('./commands/game');
const { handleMcoin, handleSetBg, handleTang, handleDiemDanh } = require('./commands/user');
const { handleDaily, handleClaimAll } = require('./commands/quest');
const { handleDbInfo, handleBackup, handleBackupNow, handleRestore, handleRestoreFile,
        handleSendCode, handleGiveVip, handleRemoveVip, handleGiveTitle,
        handleCreateGiftcode, handleCode, handleDeleteCode, handleDeleteAllCodes, handleDonate } = require('./commands/admin');
const { handleMShop, buyVipPackage, buyTitle } = require('./commands/shop');
const { handleButtonClick } = require('./handlers/buttonHandler');

if (!TOKEN) process.exit(1);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    shardCount: 1,
    shardId: 0
});

// ===== READY =====
client.once('ready', async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    client.user.setPresence({ activities:[{name:'🎲 Tài Xỉu | .help', type:ActivityType.Playing}], status:'online' });

    try { await backupOnStartup(client, BACKUP_CHANNEL_ID); } catch {}
    try { await restoreInterruptedSession(client); } catch {}
});

// ===== MESSAGE =====
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('.')) return;

    const args = message.content.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    try {
        if (cmd === '.ping') return message.reply(`🏓 Pong ${client.ws.ping}ms`);
        if (cmd === '.tx') return handleTaiXiu(message, client);
        if (cmd === '.sc') return handleSoiCau(message);
        if (cmd === '.mcoin') return handleMcoin(message);
        if (cmd === '.setbg') return handleSetBg(message, args);
        if (cmd === '.tang') return handleTang(message, args);
        if (cmd === '.dd') return handleDiemDanh(message);
        if (cmd === '.daily') return handleDaily(message);
        if (cmd === '.claimall') return handleClaimAll(message);
        if (cmd === '.mshop') return handleMShop(message);
        if (cmd === '.giftcode') return handleCreateGiftcode(message, args);
        if (cmd === '.code') return handleCode(message, args);
        if (cmd === '.delcode') return handleDeleteCode(message, args);
        if (cmd === '.delallcode') return handleDeleteAllCodes(message);
        if (cmd === '.dbinfo') return handleDbInfo(message);
        if (cmd === '.backup') return handleBackup(message);
        if (cmd === '.backupnow') return handleBackupNow(message);
        if (cmd === '.restore') return handleRestore(message);
        if (cmd === '.sendcode') return handleSendCode(message, GIFTCODE_CHANNEL_ID);
        if (cmd === '.givevip') return handleGiveVip(message, args);
        if (cmd === '.removevip') return handleRemoveVip(message, args);
        if (cmd === '.givetitle') return handleGiveTitle(message, args);
        if (cmd === '.donate') return handleDonate(message, args);
        if (cmd === '.restart' && message.author.id === ADMIN_ID) process.exit(0);

        if (cmd === '.help') {
    const isAdmin = message.author.id === ADMIN_ID;

    // ===== USER HELP =====
    const userEmbed = {
        color: 0x00ff99,
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
                value: '```\n.mcoin    → Xem profile & số dư\n.setbg    → Đặt ảnh nền\n.dd       → Điểm danh (8h/lần)\n```',
                inline: false
            },
            {
                name: '🎁 Nhiệm Vụ & Quà',
                value: '```\n.daily    → Nhiệm vụ hằng ngày\n.claimall → Nhận hết thưởng\n```',
                inline: false
            },
            {
                name: '💸 Giao Dịch',
                value: '```\n.tang @user [số] → Tặng tiền\n.mshop           → Cửa hàng VIP & danh hiệu\n```',
                inline: false
            },
            {
                name: '🎁 Giftcode',
                value: '```\n.code          → Xem danh sách code\n.code <MÃ>     → Nhập code nhận quà\n```',
                inline: false
            },
            {
                name: '📌 Cách Chơi Tài Xỉu',
                value: '```\n1. Gõ .tx để mở phiên\n2. Bấm nút "Đặt Cược"\n3. Chọn cửa (Tài/Xỉu/Chẵn/Lẻ/Số/Tổng)\n4. Nhập tiền (1k, 5m, 10b)\n```',
                inline: false
            },
            {
                name: '💡 Lưu Ý',
                value: '```\n• Tối thiểu: 1,000 Mcoin\n• Tài: 11-18 | Xỉu: 3-10\n• Số: x3 | Tổng: x5\n```',
                inline: false
            }
        ],
        footer: { text: '🎮 Chúc bạn may mắn!' },
        timestamp: new Date()
    };

    // ===== ADMIN HELP =====
    const adminEmbed = {
        color: 0xff3333,
        title: '⚙️ BẢNG LỆNH ADMIN',
        description: '**Quyền hạn quản trị viên**',
        fields: [
            {
                name: '👥 Lệnh Người Chơi',
                value: '```\n.tx, .mcoin, .setbg, .sc, .tang, .dd\n.daily, .claimall, .mshop, .code\n```',
                inline: false
            },
            {
                name: '🎁 Quản Lý Giftcode',
                value: '```\n.giftcode [tiền] [giờ]\n.sendcode\n.delcode <MÃ>\n.delallcode\n```',
                inline: false
            },
            {
                name: '👑 Quản Lý VIP',
                value: '```\n.givevip @user [1-3]\n.removevip @user\n.givetitle @user [tên]\n```',
                inline: false
            },
            {
                name: '💰 Quản Lý Tiền',
                value: '```\n.donate @user [số]\n```',
                inline: false
            },
            {
                name: '🔧 Quản Lý Database',
                value: '```\n.dbinfo\n.backup\n.backupnow\n.restore\n.restart\n```',
                inline: false
            }
        ],
        footer: { text: '🔒 Chỉ Admin mới thấy bảng này' },
        timestamp: new Date()
    };

    if (isAdmin) {
        await message.reply({ embeds: [userEmbed, adminEmbed] });
    } else {
        await message.reply({ embeds: [userEmbed] });
    }
        }
                
    } catch {
        message.reply('❌ Có lỗi xảy ra!');
    }
});

// ===== INTERACTION =====
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton() || interaction.isStringSelectMenu())
            return handleButtonClick(interaction, getBettingSession());

        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('bet_modal_')) return handleBetModal(interaction);
            if (interaction.customId === 'modal_bet_number') return handleBetNumberModal(interaction);
            if (interaction.customId === 'modal_bet_total') return handleBetTotalModal(interaction);
        }
    } catch {
        if (!interaction.replied && !interaction.deferred)
            interaction.reply({ content:'❌ Có lỗi xảy ra!', flags:64 }).catch(()=>{});
    }
});

// ===== BACKUP 12H =====
setInterval(()=>autoBackup(client, BACKUP_CHANNEL_ID).catch(()=>{}), 12*60*60*1000);

// ===== HTTP =====
http.createServer((req,res)=>{
    if(req.url==='/health') return res.end('OK');
    res.end('BOT ONLINE');
}).listen(process.env.PORT||10000);

// ===== LOGIN =====
client.login(TOKEN);



