// index.js

process.removeAllListeners('warning');

const http = require('http');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { TOKEN, ADMIN_ID, GIFTCODE_CHANNEL_ID, BACKUP_CHANNEL_ID } = require('./config');
const { saveDB, getUser } = require('./utils/database');
const { autoBackup, backupOnShutdown, restoreInterruptedSession } = require('./services/backup');

const { handleTaiXiu, handleSoiCau, getBettingSession, cleanupSession } = require("./commands/game");
const { handleMcoin, handleSetBg, handleTang, handleDiemDanh, handleInfo, updateMessageStats } = require('./commands/user');
const { handleDaily, handleClaimAll } = require('./commands/quest');
const { handleDbInfo, handleBackup, handleBackupNow, handleRestore, handleRestoreFile,
        handleSendCode, handleGiveVip, handleRemoveVip, handleGiveTitle, handleNoHu,
        handleCreateGiftcode, handleCode, handleDeleteCode, handleDeleteAllCodes, handleDonate, handleResetQuest } = require('./commands/admin');
const { handleMShop } = require('./commands/shop');
const { handleButtonClick } = require('./handlers/buttonHandler');
const { handleVipBonus } = require('./services/vipbonus');
const { handleXocDia, handleXDButton, handleXDModal } = require('./commands/xocdia');

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

client.once('ready', async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: '🎲 Tài Xỉu | .help', type: ActivityType.Playing }],
        status: 'online'
    });
    try { cleanupSession(); console.log('🧹 Đã xóa phiên cược cũ'); } catch {}
    try { await restoreInterruptedSession(client); } catch {}
});

// ===== MESSAGE =====
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.attachments.size > 0 && message.content.toLowerCase().includes('restore confirm')) {
        return handleRestoreFile(message);
    }

    try { updateMessageStats(message.author.id, message.channel); } catch {}
    try {
        const { updateQuest } = require('./services/quest');
        updateQuest(message.author.id, 4);
    } catch {}

    if (!message.content.startsWith('.')) return;

    const args = message.content.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    try {
        if (cmd === '.ping')       return message.reply(`🏓 Pong ${client.ws.ping}ms`);
        if (cmd === '.tx')         return handleTaiXiu(message, client);
        if (cmd === '.xd')         return handleXocDia(message);
        if (cmd === '.sc')         return handleSoiCau(message);
        if (cmd === '.mcoin')      return handleMcoin(message);
        if (cmd === '.info')       return handleInfo(message);
        if (cmd === '.setbg')      return handleSetBg(message, args);
        if (cmd === '.tang')       return handleTang(message, args);
        if (cmd === '.dd')         return handleDiemDanh(message);
        if (cmd === '.daily')      return handleDaily(message);
        if (cmd === '.claimall')   return handleClaimAll(message);
        if (cmd === '.mshop')      return handleMShop(message);
        if (cmd === '.vipbonus')   return handleVipBonus(message);
        if (cmd === '.giftcode')   return handleCreateGiftcode(message, args);
        if (cmd === '.code')       return handleCode(message, args);
        if (cmd === '.delcode')    return handleDeleteCode(message, args);
        if (cmd === '.delallcode') return handleDeleteAllCodes(message);
        if (cmd === '.dbinfo')     return handleDbInfo(message);
        if (cmd === '.backup')     return handleBackup(message);
        if (cmd === '.backupnow')  return handleBackupNow(message);
        if (cmd === '.restore')    return handleRestore(message);
        if (cmd === '.sendcode')   return handleSendCode(message, GIFTCODE_CHANNEL_ID);
        if (cmd === '.givevip')    return handleGiveVip(message, args);
        if (cmd === '.removevip')  return handleRemoveVip(message, args);
        if (cmd === '.givetitle')  return handleGiveTitle(message, args);
        if (cmd === '.donate')     return handleDonate(message, args);
        if (cmd === '.resetquest') return handleResetQuest(message, args);
        if (cmd === '.nohu')       return handleNoHu(message);
        if (cmd === '.restart' && message.author.id === ADMIN_ID) process.exit(0);

        if (cmd === '.help') {
            const isAdmin = message.author.id === ADMIN_ID;

            const userEmbed = {
                color: 0x00ff99,
                title: '📋 HƯỚNG DẪN SỬ DỤNG BOT',
                description: '**Chào mừng bạn đến với hệ thống Tài Xỉu!**',
                fields: [
                    { name: '🎲 Game', value: '```\n.tx  → Tài Xỉu (Tài/Xỉu/Chẵn/Lẻ/Số/Tổng)\n.xd  → Xóc Đĩa (Chẵn/Lẻ/3🔴1⚪/4🔴)\n.sc  → Xem lịch sử kết quả\n```', inline: false },
                    { name: '👤 Tài Khoản', value: '```\n.mcoin       → Xem profile & số dư\n.info        → Thống kê hoạt động\n.setbg       → Đặt ảnh nền profile\n.dd          → Điểm danh hằng ngày\n```', inline: false },
                    { name: '🎁 Nhiệm Vụ & Quà', value: '```\n.daily       → Xem nhiệm vụ hằng ngày\n.claimall    → Nhận hết thưởng nhiệm vụ\n```', inline: false },
                    { name: '👑 VIP', value: '```\n.mshop       → Mua VIP & danh hiệu\n.vipbonus    → Nhận thưởng VIP hằng ngày\n```', inline: false },
                    { name: '💸 Giao Dịch', value: '```\n.tang @user [số] → Tặng tiền cho người khác\n```', inline: false },
                    { name: '🎁 Giftcode', value: '```\n.code            → Xem danh sách giftcode\n.code <MÃ>       → Nhập code nhận quà\n```', inline: false },
                    { name: '🎉 Thưởng Tự Động', value: '```\n• Mỗi 20 tin nhắn:     1 - 10 triệu\n• 1000 tin nhắn/tuần:  100 - 200 triệu\n```', inline: false }
                ],
                footer: { text: '🎮 Chúc bạn may mắn! | Reset nhiệm vụ lúc 0h mỗi ngày' },
                timestamp: new Date()
            };

            const adminEmbed = {
                color: 0xff3333,
                title: '⚙️ BẢNG LỆNH ADMIN',
                fields: [
                    { name: '🎁 Quản Lý Giftcode', value: '```\n.giftcode [tên] [tiền] [lượt] [giờ]\n.sendcode\n.delcode <MÃ>\n.delallcode\n```', inline: false },
                    { name: '👑 Quản Lý VIP & Danh Hiệu', value: '```\n.givevip @user [1-10]\n.removevip @user\n.givetitle @user\n.nohu  → Ván TX tiếp theo ra bộ ba\n```', inline: false },
                    { name: '💰 Quản Lý Tiền & Quest', value: '```\n.donate @user [số]\n.resetquest @user\n```', inline: false },
                    { name: '🔧 Database', value: '```\n.dbinfo\n.backup\n.backupnow\n.restore\n.restart\n```', inline: false }
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

    } catch (err) {
        console.error('❌ Message error:', err);
        message.reply('❌ Có lỗi xảy ra!').catch(() => {});
    }
});

// ===== INTERACTION =====
client.on('interactionCreate', async (interaction) => {
    try {
        // ===== BUTTON & SELECT MENU =====
        if (interaction.isButton() || interaction.isStringSelectMenu()) {

            // Copy code button
            if (interaction.isButton() && interaction.customId.startsWith('copy_code_')) {
                const code = interaction.customId.replace('copy_code_', '');
                return interaction.reply({ content: `.code ${code}`, ephemeral: true });
            }

            // Admin give title
            if (interaction.isStringSelectMenu() && interaction.customId === 'admin_givetitle') {
                if (interaction.user.id !== ADMIN_ID) {
                    return interaction.reply({ content: '❌ Chỉ admin!', ephemeral: true });
                }
                const value = interaction.values[0];
                const parts = value.split('_');
                const targetUserId = parts[1];
                const titleId = parts.slice(2).join('_');
                const { TITLE_ITEMS } = require('./commands/shop');
                const title = TITLE_ITEMS[titleId];
                if (!title) return interaction.reply({ content: '❌ Danh hiệu không hợp lệ!', ephemeral: true });
                const user = getUser(targetUserId);
                user.vipTitle = title.titleName;
                user.titleBonus = { dailyBonus: title.dailyBonus, betBonus: title.betBonus, jackpotBonus: title.jackpotBonus };
                if (!user.ownedTitles) user.ownedTitles = [];
                if (!user.ownedTitles.includes(titleId)) user.ownedTitles.push(titleId);
                saveDB();
                return interaction.update({ content: `✅ Đã cấp **${title.titleName}** cho <@${targetUserId}>!`, embeds: [], components: [] });
            }

            // ===== XD BUTTONS - check TRƯỚC handleButtonClick =====
            if (interaction.isButton() && interaction.customId.startsWith('xd_')) {
                return await handleXDButton(interaction);
            }

            // TX buttons & shop
            return await handleButtonClick(interaction, getBettingSession());
        }

        // ===== MODAL SUBMIT =====
        if (interaction.isModalSubmit()) {

            // ===== XD MODAL - check TRƯỚC TX modal =====
            if (interaction.customId.startsWith('xd_modal_')) {
                return await handleXDModal(interaction);
            }

            // TX modals
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }

            const session = getBettingSession();
            if (!session) return interaction.editReply('❌ Phiên cược đã kết thúc!');

            const userId = interaction.user.id;
            const user = getUser(userId);
            if (!user) return interaction.editReply('❌ Bạn chưa có tài khoản!');

            if (interaction.customId.startsWith('bet_modal_')) {
                const betType = interaction.customId.replace('bet_modal_', '');
                const amount = parseAmount(interaction.fields.getTextInputValue('bet_amount'));
                if (session.bets[userId]) return interaction.editReply('❌ Bạn đã đặt cược rồi! Mỗi phiên chỉ được cược 1 lần.');
                if (!amount || amount < 1000) return interaction.editReply('❌ Số tiền không hợp lệ! Tối thiểu 1,000 Mcoin');
                if (user.balance < amount) return interaction.editReply(`❌ Bạn chỉ có ${user.balance.toLocaleString()} Mcoin!`);
                user.balance -= amount;
                saveDB();
                session.bets[userId] = { type: betType, amount };
                return interaction.editReply(`✅ Đã cược **${betType.toUpperCase()}** - ${amount.toLocaleString()} Mcoin`);
            }

            if (interaction.customId === 'modal_bet_number') {
                const number = parseInt(interaction.fields.getTextInputValue('number_value'));
                const amount = parseAmount(interaction.fields.getTextInputValue('bet_amount'));
                if (session.bets[userId]) return interaction.editReply('❌ Bạn đã đặt cược rồi!');
                if (!number || number < 1 || number > 6) return interaction.editReply('❌ Số phải từ 1-6!');
                if (!amount || amount < 1000) return interaction.editReply('❌ Tối thiểu 1,000 Mcoin');
                if (user.balance < amount) return interaction.editReply(`❌ Bạn chỉ có ${user.balance.toLocaleString()} Mcoin!`);
                user.balance -= amount;
                saveDB();
                session.bets[userId] = { type: 'number', value: number, amount };
                return interaction.editReply(`✅ Đã cược **SỐ ${number}** - ${amount.toLocaleString()} Mcoin`);
            }

            if (interaction.customId === 'modal_bet_total') {
                const total = parseInt(interaction.fields.getTextInputValue('total_value'));
                const amount = parseAmount(interaction.fields.getTextInputValue('bet_amount'));
                if (session.bets[userId]) return interaction.editReply('❌ Bạn đã đặt cược rồi!');
                if (!total || total < 3 || total > 18) return interaction.editReply('❌ Tổng phải từ 3-18!');
                if (!amount || amount < 1000) return interaction.editReply('❌ Tối thiểu 1,000 Mcoin');
                if (user.balance < amount) return interaction.editReply(`❌ Bạn chỉ có ${user.balance.toLocaleString()} Mcoin!`);
                user.balance -= amount;
                saveDB();
                session.bets[userId] = { type: 'total', value: total, amount };
                return interaction.editReply(`✅ Đã cược **TỔNG ${total}** - ${amount.toLocaleString()} Mcoin`);
            }
        }

    } catch (err) {
        console.error('❌ Interaction error:', err);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true });
            } else {
                await interaction.editReply('❌ Có lỗi xảy ra!');
            }
        } catch {}
    }
});

function parseAmount(input) {
    if (!input) return null;
    input = input.toLowerCase().replace(/[,._]/g, '');
    if (input.endsWith('k')) return parseInt(input) * 1000;
    else if (input.endsWith('m')) return parseInt(input) * 1000000;
    else if (input.endsWith('b') || input.endsWith('t')) return parseInt(input) * 1000000000;
    return parseInt(input);
}

setInterval(() => autoBackup(client, BACKUP_CHANNEL_ID).catch(() => {}), 12 * 60 * 60 * 1000);

http.createServer((req, res) => {
    if (req.url === '/health') return res.end('OK');
    res.end('BOT ONLINE');
}).listen(process.env.PORT || 10000);

process.on('SIGINT', async () => {
    try { await backupOnShutdown(client, BACKUP_CHANNEL_ID); } catch {}
    process.exit(0);
});

process.on('SIGTERM', async () => {
    try { await backupOnShutdown(client, BACKUP_CHANNEL_ID); } catch {}
    process.exit(0);
});

client.login(TOKEN);

