// index.js

process.removeAllListeners('warning');

const http = require('http');
const { 
    Client, 
    GatewayIntentBits, 
    ActivityType, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder 
} = require('discord.js');

const config = require('./config');
const { TOKEN, ADMIN_ID, GIFTCODE_CHANNEL_ID, BACKUP_CHANNEL_ID } = config;
const { saveDB, getUser, resetDailyTop } = require('./utils/database');
const { autoBackup, backupOnShutdown, restoreInterruptedSession } = require('./services/backup');

const { handleTaiXiu, handleSoiCau, getBettingSession, cleanupSession } = require("./commands/game");
const { handleMcoin, handleSetBg, handleTang, handleDiemDanh, handleInfo, updateMessageStats } = require('./commands/user');
const { handleDaily, handleClaimAll } = require('./commands/quest');
const { handleDbInfo, handleBackup, handleBackupNow, handleRestore, handleRestoreFile,
        handleSendCode, handleGiveVip, handleRemoveVip, handleGiveTitle, handleNoHu,
        handleCode, handleDeleteCode, handleDeleteAllCodes, handleDonate, handleResetQuest,
        handleBlock, handleUnblock, isCommandBlocked, handleNoXocDia, handleDiamond } = require('./commands/admin');
const { handleInv } = require('./commands/inv');
const { handleUnbox } = require('./commands/unbox');
const { handleMShop } = require('./commands/shop');
const { handleButtonClick } = require('./handlers/buttonHandler');
const { handleVipBonus } = require('./services/vipbonus');
const { handleXocDia, handleXDButton, handleXDModal, setForceXDJackpot } = require('./commands/xocdia');
const { handleTop } = require('./commands/top');
const giftcode = require('./giftcode');

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

// ===== ĐĂNG KÝ SLASH COMMANDS =====
const slashCommands = [
    new SlashCommandBuilder()
        .setName('giftcode')
        .setDescription('Tạo giftcode mới (Admin only)')
        .addStringOption(opt => opt.setName('ten').setDescription('Tên code (VD: THANG3)').setRequired(true))
        .addStringOption(opt => opt.setName('tien').setDescription('Số tiền (VD: 100m, 5b)').setRequired(true))
        .addStringOption(opt => opt.setName('luot').setDescription('Số lượt (VD: 100 hoặc unlimit)').setRequired(false))
        .addStringOption(opt => opt.setName('gio').setDescription('Thời hạn giờ (VD: 24 hoặc unlimit)').setRequired(false))
        .toJSON(),
];

function parseAmount(input) {
    if (!input) return null;
    input = input.toLowerCase().replace(/[,._]/g, '');
    if (input.endsWith('k')) return parseFloat(input) * 1000;
    if (input.endsWith('m')) return parseFloat(input) * 1000000;
    if (input.endsWith('b') || input.endsWith('t')) return parseFloat(input) * 1000000000;
    return parseInt(input);
}

client.once('ready', async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: '🎲 Tài Xỉu | .help', type: ActivityType.Playing }],
        status: 'online'
    });
    try { cleanupSession(); console.log('🧹 Đã xóa phiên cược cũ'); } catch {}
    try { await restoreInterruptedSession(client); } catch {}

    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        for (const [guildId] of client.guilds.cache) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: slashCommands }
            );
        }
        console.log('✅ Slash commands đã đăng ký!');
    } catch (err) {
        console.error('❌ Slash command register error:', err);
    }
});

setInterval(() => {
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    if (vnNow.getUTCHours() === 0 && vnNow.getUTCMinutes() === 0) {
        console.log('🏆 Phat thuong top & reset...');
        resetDailyTop(client).catch(err => console.error('resetDailyTop error:', err));
    }
}, 60000);

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
        if (cmd === '.block')   return handleBlock(message, args);
        if (cmd === '.unblock') return handleUnblock(message, args);

        if (isCommandBlocked(message.channel.id, cmd)) return;

        if (cmd === '.ping')       return message.reply(`🏓 Pong ${client.ws.ping}ms`);
        if (cmd === '.tx')         return handleTaiXiu(message, client);
        if (cmd === '.xd')         return handleXocDia(message);
        if (cmd === '.sc')         return handleSoiCau(message);
        if (cmd === '.top')        return handleTop(message);
        if (cmd === '.mcoin')      return handleMcoin(message);
        if (cmd === '.info')       return handleInfo(message);
        if (cmd === '.setbg')      return handleSetBg(message, args);
        if (cmd === '.tang')       return handleTang(message, args);
        if (cmd === '.dd')         return handleDiemDanh(message);
        if (cmd === '.daily')      return handleDaily(message);
        if (cmd === '.claimall')   return handleClaimAll(message);
        if (cmd === '.inv')        return handleInv(message);
        if (cmd === '.unbox')      return handleUnbox(message, args);
        if (cmd === '.mshop')      return handleMShop(message);
        if (cmd === '.vipbonus')   return handleVipBonus(message);
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
        if (cmd === '.diamond')    return handleDiamond(message, args);
        if (cmd === '.resetquest') return handleResetQuest(message, args);
        if (cmd === '.nohu')       return handleNoHu(message);
        if (cmd === '.noxocdia')   return handleNoXocDia(message);
        if (cmd === '.restart' && message.author.id === ADMIN_ID) process.exit(0);

        if (cmd === '.help') {
            const isAdmin = Array.isArray(config.ADMIN_IDS) 
                ? config.ADMIN_IDS.includes(message.author.id)
                : message.author.id === config.ADMIN_ID;

            // --- 1. Embed Trang Chủ (Đã bỏ Avatar Bot) ---
            const homeEmbed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle('ALL IN ONE ')
                .setDescription(
                    `• **Discord:** [Emzy Community](https://discord.gg)\n\n` +
                    `Chào mừng bạn đến với hệ thống Bot Rot! Bấm vào danh mục bên dưới để xem hướng dẫn chi tiết.`
                )
                .setImage('https://files.catbox.moe/845jxx.webp')
                .setFooter({ text: 'Bot Rot • Emzy Community' });

            // --- 2. Tạo Select Menu ---
            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('Trang Chủ')
                    .setDescription('Quay lại thông tin tổng quan.')
                    .setValue('help_home')
                    .setEmoji('🏠'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Minigame')
                    .setDescription('Tài Xỉu, Xóc Đĩa, Soi Cầu.')
                    .setValue('help_minigame')
                    .setEmoji('🎲'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Tài Khoản & Quà')
                    .setDescription('Mcoin, Info, Điểm danh, Quả/Code, Nhiệm vụ.')
                    .setValue('help_account')
                    .setEmoji('👤'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Hành Trang & Kim Cương')
                    .setDescription('Túi đồ, Mở hộp, Chi tiết Kim Cương (KC).')
                    .setValue('help_inventory')
                    .setEmoji('💎'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('BXH & Thưởng Tự Động')
                    .setDescription('Top server, Tặng tiền, Thưởng chat tự động.')
                    .setValue('help_extra')
                    .setEmoji('🏆')
            ];

            if (isAdmin) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Bảng Lệnh Admin')
                        .setDescription('Các lệnh quản trị hệ thống.')
                        .setValue('help_admin')
                        .setEmoji('⚙️')
                );
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('help_menu')
                .setPlaceholder('Chọn một danh mục lệnh để xem chi tiết...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const helpMessage = await message.reply({
                embeds: [homeEmbed],
                components: [row]
            });

            // --- 3. Collector lắng nghe chọn Menu ---
            const filter = i => i.customId === 'help_menu' && i.user.id === message.author.id;
            const collector = helpMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                let selectedEmbed = new EmbedBuilder().setTimestamp();

                switch (i.values[0]) {
                    case 'help_home':
                        return await i.update({ embeds: [homeEmbed], components: [row] });

                    case 'help_minigame':
                        selectedEmbed
                            .setColor(0x00ff99)
                            .setTitle('🎲 HƯỚNG DẪN: MINIGAME')
                            .addFields(
                                { name: '🎮 Danh Sách Trò Chơi', value: '```\n.tx → Tài Xỉu (Tài/Xỉu/Chẵn/Lẻ/Số/Tổng)\n      * Cược Mcoin + KC cùng lúc!\n.xd → Xóc Đĩa (Chẵn/Lẻ/3🔴1⚪/4🔴)\n.sc → Xem lịch sử kết quả (Soi cầu)\n```' }
                            )
                            .setFooter({ text: 'Bot Rot • Emzy Community' });
                        break;

                    case 'help_account':
                        selectedEmbed
                            .setColor(0xFFD700)
                            .setTitle('👤 HƯỚNG DẪN: TÀI KHOẢN & QUÀ')
                            .addFields(
                                { name: '📊 Quản Lý Cá Nhân', value: '```\n.mcoin       → Xem profile & số dư\n.info        → Thống kê hoạt động cá nhân\n.setbg       → Đặt ảnh nền profile\n.dd          → Điểm danh hằng ngày nhận Mcoin\n```' },
                                { name: '🎁 Nhiệm Vụ & Giftcode', value: '```\n.daily       → Xem danh sách nhiệm vụ hằng ngày\n.claimall    → Nhận toàn bộ thưởng nhiệm vụ\n.code        → Xem danh sách giftcode\n.code <MÃ>   → Nhập mã code nhận quà\n```' }
                            )
                            .setFooter({ text: 'Bot Rot • Emzy Community' });
                        break;

                    case 'help_inventory':
                        selectedEmbed
                            .setColor(0x9b59b6)
                            .setTitle('💎 HƯỚNG DẪN: HÀNH TRANG & KIM CƯƠNG')
                            .addFields(
                                { name: '🎒 Hành Trang & Mở Hộp', value: '```\n.inv         → Xem túi đồ (Mcoin, KC, Hộp)\n.unbox       → Mở 1 hộp may mắn\n.unbox [số]  → Mở số lượng hộp tùy chọn\n.unbox all   → Mở tất cả hộp đang có\n```' },
                                { name: '💎 Hệ Thống Kim Cương (KC)', value: '```\n• Bảng thưởng Top TX/XD mỗi ngày:\n  Top 1: 300 KC  | Top 2: 200 KC\n  Top 3: 100 KC  | Top 4-5: 50 KC\n• Công dụng KC:\n  - Mua VIP level 5+\n  - Cược trực tiếp trong .tx\n```' }
                            )
                            .setFooter({ text: 'Bot Rot • Emzy Community' });
                        break;

                    case 'help_extra':
                        selectedEmbed
                            .setColor(0x3498db)
                            .setTitle('🏆 HƯỚNG DẪN: BXH & THƯỞNG TỰ ĐỘNG')
                            .addFields(
                                { name: '💸 Xếp Hạng & Giao Dịch', value: '```\n.top             → Xem bảng xếp hạng thắng hôm nay\n.tang @user [số] → Tặng Mcoin cho người chơi khác\n```' },
                                { name: '💬 Thưởng Tích Cực Chat', value: '```\n• Mỗi 20 tin nhắn    : Nhận 1 - 10 triệu Mcoin\n• 1000 tin nhắn/tuần : Nhận 100 - 200 triệu Mcoin\n```' }
                            )
                            .setFooter({ text: 'Bot Rot • Emzy Community' });
                        break;

                    case 'help_admin':
                        selectedEmbed
                            .setColor(0xff3333)
                            .setTitle('⚙️ QUẢN LÝ ADMIN')
                            .addFields(
                                { name: '🎁 Giftcode', value: '```\n/giftcode ten tien [luot] [gio]\n.sendcode\n.delcode <MÃ>\n.delallcode\n```' },
                                { name: '👑 VIP & Danh Hiệu', value: '```\n.givevip @user [1-10]\n.removevip @user\n.givetitle @user\n.nohu      → Ván TX tiếp theo ra bộ ba\n.noxocdia  → Ván XD tiếp theo ra bộ ba\n```' },
                                { name: '🚫 Block Lệnh Kênh', value: '```\n.block .xd .tx  → Block lệnh trong kênh\n.block          → Xem lệnh đang block\n.unblock .xd    → Bỏ block lệnh\n.unblock all    → Bỏ tất cả block\n```' },
                                { name: '💰 Tiền & Quest', value: '```\n.donate @user [số]\n.diamond @user [số KC]\n.resetquest @user\n```' },
                                { name: '🗄️ Database & Hệ Thống', value: '```\n.dbinfo\n.backup\n.backupnow\n.restore\n.restart\n```' }
                            )
                            .setFooter({ text: 'Bot Rot • Emzy Community Admin' });
                        break;
                }

                await i.update({ embeds: [selectedEmbed], components: [row] });
            });

            collector.on('end', () => {
                selectMenu.setDisabled(true);
                helpMessage.edit({ components: [new ActionRowBuilder().addComponents(selectMenu)] }).catch(() => {});
            });
        }
    } catch (err) {
        console.error('❌ Message error:', err);
        message.reply('❌ Có lỗi xảy ra!').catch(() => {});
    }
});

// ===== INTERACTION =====
client.on('interactionCreate', async (interaction) => {
    try {

        // ===== SLASH COMMAND /giftcode =====
        if (interaction.isChatInputCommand() && interaction.commandName === 'giftcode') {
            if (interaction.user.id !== ADMIN_ID) {
                return interaction.reply({ content: '❌ Chỉ admin mới dùng được!', ephemeral: true });
            }

            const ten    = interaction.options.getString('ten').toUpperCase();
            const tienStr = interaction.options.getString('tien');
            const luotStr = interaction.options.getString('luot') || '100';
            const gioStr  = interaction.options.getString('gio') || '24';

            const tien = parseAmount(tienStr);
            if (!tien || tien < 1000000) {
                return interaction.reply({ content: '❌ Số tiền phải >= 1m!', ephemeral: true });
            }

            const luot = luotStr.toLowerCase() === 'unlimit' ? -1 : parseInt(luotStr);
            const gio  = gioStr.toLowerCase()  === 'unlimit' ? -1 : parseInt(gioStr);

            if (luot !== -1 && (isNaN(luot) || luot < 1)) {
                return interaction.reply({ content: '❌ Số lượt không hợp lệ!', ephemeral: true });
            }
            if (gio !== -1 && (isNaN(gio) || gio < 1 || gio > 720)) {
                return interaction.reply({ content: '❌ Số giờ phải 1-720 hoặc unlimit!', ephemeral: true });
            }

            const result = giftcode.createGiftcodeCustom(interaction.user.id, ten, tien, luot, gio);
            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
            }

            const usesText = luot === -1 ? 'Unlimited' : `${luot} lượt`;
            const timeText = gio  === -1 ? 'Vô hạn'   : `${gio} giờ`;

            const embed = new EmbedBuilder()
                .setTitle('🎁 GIFTCODE ĐÃ TẠO!')
                .setColor('#f39c12')
                .setDescription(`**Code:** \`${result.code}\`\n**Tiền:** ${tien.toLocaleString('en-US')} Mcoin\n**Lượt:** ${usesText}\n**Thời hạn:** ${timeText}`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // ===== BUTTONS & SELECT MENUS =====
        if (interaction.isButton() || interaction.isStringSelectMenu()) {

            if (interaction.isButton() && interaction.customId.startsWith('copy_code_')) {
                const code = interaction.customId.replace('copy_code_', '');
                return interaction.reply({ content: `.code ${code}`, ephemeral: true });
            }

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

            if (interaction.isButton() && interaction.customId.startsWith('xd_')) {
                return await handleXDButton(interaction);
            }

            return await handleButtonClick(interaction, getBettingSession());
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('xd_modal_')) {
                return await handleXDModal(interaction);
            }

            if (interaction.customId.startsWith('shop_goto_')) {
                const tab = interaction.customId.replace('shop_goto_', '');
                const pageInput = parseInt(interaction.fields.getTextInputValue('page_number')) || 1;
                const { showVipPage, showTitlePage, showFramePage, VIP_ITEMS, TITLE_ITEMS, FRAME_ITEMS } = require('./commands/shop');
                const ITEMS_PER_PAGE = 8;
                if (tab === 'vip') {
                    const total = Math.ceil(Object.keys(VIP_ITEMS).length / ITEMS_PER_PAGE);
                    return await showVipPage(interaction, Math.min(pageInput - 1, total - 1));
                } else if (tab === 'title') {
                    const total = Math.ceil(Object.keys(TITLE_ITEMS).length / ITEMS_PER_PAGE);
                    return await showTitlePage(interaction, Math.min(pageInput - 1, total - 1));
                } else {
                    const total = Math.ceil(Object.keys(FRAME_ITEMS).length / ITEMS_PER_PAGE);
                    return await showFramePage(interaction, Math.min(pageInput - 1, total - 1));
                }
            }

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
                const amountStr = interaction.fields.getTextInputValue('bet_amount').trim();
                const kcStr = interaction.fields.getTextInputValue('bet_kc').trim();
                const amount = amountStr ? parseAmount(amountStr) : 0;
                const kcAmount = kcStr ? parseInt(kcStr) : 0;

                if (session.bets[userId]) return interaction.editReply('❌ Bạn đã đặt cược rồi!');
                if (!amount && !kcAmount) return interaction.editReply('❌ Phải nhập ít nhất tiền hoặc KC!');
                if (amount && amount < 1000) return interaction.editReply('❌ Tiền tối thiểu 1,000 Mcoin!');
                if (kcAmount && kcAmount < 1) return interaction.editReply('❌ KC phải >= 1!');
                if (amount && user.balance < amount) return interaction.editReply(`❌ Không đủ tiền! Có ${user.balance.toLocaleString()} Mcoin`);
                if (kcAmount && (user.diamonds || 0) < kcAmount) return interaction.editReply(`❌ Không đủ KC! Có ${user.diamonds || 0} KC`);

                if (amount) user.balance -= amount;
                if (kcAmount) user.diamonds = (user.diamonds || 0) - kcAmount;
                saveDB();
                session.bets[userId] = { type: betType, amount: amount || 0, kcAmount: kcAmount || 0 };

                let msg = `✅ Đã cược **${betType.toUpperCase()}**`;
                if (amount) msg += ` — ${amount.toLocaleString()}💰`;
                if (kcAmount) msg += ` — ${kcAmount}💎`;
                return interaction.editReply(msg);
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
