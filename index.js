// index.js - FILE CHÍNH TÍCH HỢP TẤT CẢ

const { Client, GatewayIntentBits } = require('discord.js');
const { TOKEN, ADMIN_ID, GIFTCODE_CHANNEL_ID } = require('./config');

// Import handlers
const { handleTaiXiu, handleLichSu } = require('./handlers/game');
const { handleMcoin, handleTang, handleDiemDanh } = require('./handlers/user');
const { handleDaily, handleClaimAll } = require('./handlers/quest');
const { 
    handleDbInfo, 
    handleBackup, 
    handleBackupNow, 
    handleRestore, 
    handleRestoreFile,
    handleSendCode,
    handleGiveVip,
    handleRemoveVip,
    handleGiveTitle
} = require('./handlers/admin');
const { handleMShop, showVipPackages, showTitles, buyVipPackage, buyTitle } = require('./handlers/shop');
const { handleBetInteraction } = require('./handlers/bet');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot đã online: ${client.user.tag}`);
    client.user.setActivity('🎲 Tài Xỉu | .help', { type: 'PLAYING' });
});

// Xử lý tin nhắn (commands)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    
    // === COMMANDS NGƯỜI CHƠI ===
    if (command === '.tx') {
        await handleTaiXiu(message, client);
    }
    else if (command === '.lichsu') {
        await handleLichSu(message);
    }
    else if (command === '.mcoin') {
        await handleMcoin(message);
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
    
    // === HELP COMMAND ===
    else if (command === '.help') {
        const isAdmin = message.author.id === ADMIN_ID;
        
        const helpText = `
📜 **DANH SÁCH LỆNH**

**👤 Người chơi:**
\`.tx\` - Bắt đầu phiên cược mới
\`.mcoin\` - Xem profile & số dư (có ảnh!)
\`.lichsu\` - Xem biểu đồ lịch sử
\`.tang @user [số]\` - Tặng tiền
\`.dd\` / \`.diemdanh\` - Điểm danh (8h/lần)
\`.daily\` - Xem nhiệm vụ hằng ngày
\`.claimall\` - Nhận thưởng nhiệm vụ
\`.mshop\` - Cửa hàng VIP & danh hiệu

**🎲 Đặt cược:**
Bấm nút Tài/Xỉu/Chẵn/Lẻ → Nhập số tiền
Ví dụ: \`1k\`, \`5m\`, \`10b\`, \`100000000\`
Giới hạn: **1,000** - **100,000,000,000** Mcoin

${isAdmin ? `
**🔧 Admin:**
\`.givevip @user [1-3]\` - Cấp VIP
\`.removevip @user\` - Xóa VIP
\`.givetitle @user [tên]\` - Cấp danh hiệu tùy chỉnh
\`.sendcode\` - Phát giftcode
\`.dbinfo\` - Thông tin database
\`.backup\` - Backup database
\`.backupnow\` - Backup thủ công
\`.restore\` - Hướng dẫn restore
` : ''}
        `;
        
        await message.reply(helpText);
    }
    
    // Xử lý restore file
    if (message.attachments.size > 0 && message.content.toLowerCase().includes('restore confirm')) {
        await handleRestoreFile(message);
    }
});

// Xử lý interactions (buttons & select menus)
client.on('interactionCreate', async (interaction) => {
    try {
        // === BUTTON ĐẶT CƯỢC ===
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('bet_')) {
                await handleBetInteraction(interaction);
            }
            else if (interaction.customId === 'shop_vip') {
                await showVipPackages(interaction);
            }
            else if (interaction.customId === 'shop_title') {
                await showTitles(interaction);
            }
        }
        
        // === SELECT MENU MUA VIP/DANH HIỆU ===
        if (interaction.isStringSelectMenu()) {
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
                ephemeral: true 
            }).catch(() => {});
        }
    }
});

client.login(TOKEN);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});

server.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Server is running to keep Render alive.");
});

