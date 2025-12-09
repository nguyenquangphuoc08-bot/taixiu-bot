require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

// Import utils
const { loadDB } = require('./utils/database');

// Import handlers
const handleButton = require('./handlers/buttonHandler');
const handleModal = require('./handlers/modalHandler');

// Import commands
const { handleTaiXiu, handleLichSu, getBettingSession } = require('./commands/game');
const { handleMcoin, handleTang, handleDiemDanh } = require('./commands/user');
const { handleDaily, handleClaimAll } = require('./commands/quest');
const { 
    handleCreateGiftcode, 
    handleRedeemCode, 
    handleCodeList, 
    handleDeleteCode, 
    handleDeleteAllCodes 
} = require('./commands/giftcode');
const { 
    handleDbInfo, 
    handleBackup, 
    handleBackupNow, 
    handleRestore, 
    handleRestoreFile 
} = require('./commands/admin');

// Import services
const { backupOnStartup, autoBackup, backupOnShutdown, restoreInterruptedSession } = require('./services/backup');

// ===== CẤU HÌNH =====
const ADMIN_ID = '1100660298073002004';
const BACKUP_CHANNEL_ID = '1447477880329338962';

// ===== KHỞI TẠO CLIENT =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Load database khi khởi động
loadDB();

// ===== BOT READY =====
client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} đã online!`);
    client.user.setActivity('.tx để chơi | .daily nhiệm vụ', { type: 'PLAYING' });
    
    // Khôi phục phiên cược bị gián đoạn
    await restoreInterruptedSession(client);
    
    // Backup khi khởi động
    await backupOnStartup(client, BACKUP_CHANNEL_ID);
});

// ===== AUTO BACKUP MỖI 6 GIỜ =====
setInterval(() => autoBackup(client, BACKUP_CHANNEL_ID), 6 * 60 * 60 * 1000);

// ===== BACKUP KHI BOT TẮT =====
process.on('SIGTERM', async () => {
    console.log('⚠️ Bot nhận tín hiệu tắt, đang backup...');
    await backupOnShutdown(client, BACKUP_CHANNEL_ID);
    process.exit(0);
});

// ===== XỬ LÝ LỆNH =====
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();
    
    // ===== GAME COMMANDS =====
    if (command === '.tx') {
        await handleTaiXiu(message, client);
    }
    
    if (command === '.lichsu' || command === '.ls') {
        await handleLichSu(message);
    }
    
    // ===== USER COMMANDS =====
    if (command === '.mcoin') {
        await handleMcoin(message);
    }
    
    if (command === '.tang' || command === '.give') {
        await handleTang(message, args);
    }
    
    if (command === '.diemdanh' || command === '.dd') {
        await handleDiemDanh(message);
    }
    
    // ===== QUEST COMMANDS =====
    if (command === '.daily') {
        await handleDaily(message);
    }
    
    if (command === '.claimall') {
        await handleClaimAll(message);
    }
    
    // ===== GIFTCODE COMMANDS =====
    if (command === '.giftcode' || command === '.gc') {
        await handleCreateGiftcode(message, args);
    }
    
    if (command === '.code') {
        await handleRedeemCode(message, args);
    }
    
    if (command === '.codelist' || command === '.gclist') {
        await handleCodeList(message);
    }
    
    if (command === '.delcode' || command === '.xoacode') {
        await handleDeleteCode(message, args);
    }
    
    if (command === '.delallcode' || command === '.xoatatca') {
        await handleDeleteAllCodes(message);
    }
    
    // ===== ADMIN COMMANDS =====
    if (command === '.dbinfo') {
        await handleDbInfo(message);
    }
    
    if (command === '.backup') {
        await handleBackup(message);
    }
    
    if (command === '.backupnow') {
        await handleBackupNow(message);
    }
    
    if (command === '.restore') {
        await handleRestore(message);
    }
    
    // Xử lý restore file
    if (message.content.toLowerCase().includes('restore confirm') && message.attachments.size > 0) {
        await handleRestoreFile(message);
    }
    
    // ===== HELP COMMAND =====
    if (command === '.help' || command === '.h') {
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setTitle('📚 HƯỚNG DẪN SỬ DỤNG BOT')
            .setColor('#3498db')
            .setDescription('**Danh sách lệnh:**')
            .addFields(
                { 
                    name: '🎲 Game Tài Xỉu', 
                    value: '`.tx` - Bắt đầu phiên cược mới\n`.lichsu` hoặc `.ls` - Xem lịch sử 20 phiên', 
                    inline: false 
                },
                { 
                    name: '💰 Quản lý tiền', 
                    value: '`.mcoin` - Xem số dư và thống kê\n`.tang @user [số tiền]` - Tặng tiền cho người khác\n`.diemdanh` hoặc `.dd` - Điểm danh nhận 3M (8h/lần)', 
                    inline: false 
                },
                { 
                    name: '📋 Nhiệm vụ', 
                    value: '`.daily` - Xem nhiệm vụ hằng ngày\n`.claimall` - Nhận thưởng khi hoàn thành tất cả', 
                    inline: false 
                },
                { 
                    name: '🎁 Giftcode', 
                    value: '`.code <code>` - Nhập giftcode nhận thưởng', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Chúc bạn chơi vui vẻ! 🎉' })
            .setTimestamp();
        
        if (message.author.id === ADMIN_ID) {
            embed.addFields(
                {
                    name: '🔧 Lệnh Admin',
                    value: '`.dbinfo` - Thông tin database\n`.backup` - Tạo backup\n`.backupnow` - Backup thủ công\n`.restore` - Khôi phục database',
                    inline: false
                },
                {
                    name: '🎁 Quản lý Giftcode (Admin)',
                    value: '`.giftcode [tiền] [giờ]` - Tạo code\n`.codelist` - Xem danh sách code\n`.delcode <code>` - Xóa 1 code\n`.delallcode` - Xóa tất cả code',
                    inline: false
                }
            );
        }
        
        await message.reply({ embeds: [embed] });
    }
});

// ===== XỬ LÝ INTERACTION (BUTTON & MODAL) =====
client.on('interactionCreate', async (interaction) => {
    try {
        const bettingSession = getBettingSession();
        
        if (interaction.isButton()) {
            await handleButton(interaction, bettingSession);
        }
        
        if (interaction.isModalSubmit()) {
            await handleModal(interaction, bettingSession, client);
        }
        
    } catch (error) {
        console.error('❌ LỖI trong interactionCreate:', error);
        
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ Có lỗi xảy ra! Vui lòng thử lại.', 
                    flags: 64 
                }).catch(() => {});
            }
        } catch (replyError) {
            console.error('Không thể gửi error message:', replyError);
        }
    }
});

// ===== LOGIN & KEEP ALIVE =====
client.login(process.env.TOKEN);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});

server.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Server is running to keep Render alive.");
});
