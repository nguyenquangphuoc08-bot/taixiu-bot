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
            return message.reply('🎲 Gõ `.tx` để chơi Tài Xỉu – bấm nút để đặt cược!');
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

