require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Database
let database = {
    users: {},
    history: [],
    jackpot: 0,
    lastCheckin: {}
};

if (fs.existsSync('./database.json')) {
    database = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
}

function saveDB() {
    fs.writeFileSync('./database.json', JSON.stringify(database, null, 2));
}

function getUser(userId) {
    if (!database.users[userId]) {
        database.users[userId] = {
            balance: 15000000,
            tai: 0,
            xiu: 0,
            chan: 0,
            le: 0,
            jackpotWins: 0
        };
        saveDB();
    }
    return database.users[userId];
}

// Quản lý phiên cược
let bettingSession = null;

function rollDice() {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2 + dice3;
    return { dice1, dice2, dice3, total };
}

function checkResult(total) {
    const tai = total >= 11 && total <= 18;
    const xiu = total >= 3 && total <= 10;
    const chan = total % 2 === 0;
    const le = total % 2 !== 0;
    return { tai, xiu, chan, le };
}

function checkJackpot(dice1, dice2, dice3) {
    return dice1 === dice2 && dice2 === dice3;
}

// Vẽ xúc xắc bằng Canvas
function drawDice(number) {
    const canvas = createCanvas(100, 100);
    const ctx = canvas.getContext('2d');
    
    // Nền trắng
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 100, 100);
    
    // Viền đen
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, 90, 90);
    
    // Vẽ chấm đen
    ctx.fillStyle = '#000000';
    const dotSize = 10;
    
    const positions = {
        1: [[50, 50]],
        2: [[30, 30], [70, 70]],
        3: [[30, 30], [50, 50], [70, 70]],
        4: [[30, 30], [70, 30], [30, 70], [70, 70]],
        5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
        6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]]
    };
    
    positions[number].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
    });
    
    return canvas;
}

// Tạo ảnh 3 xúc xắc
function createDiceImage(dice1, dice2, dice3) {
    const canvas = createCanvas(330, 120);
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, 330, 120);
    
    const d1 = drawDice(dice1);
    const d2 = drawDice(dice2);
    const d3 = drawDice(dice3);
    
    ctx.drawImage(d1, 10, 10, 100, 100);
    ctx.drawImage(d2, 120, 10, 100, 100);
    ctx.drawImage(d3, 230, 10, 100, 100);
    
    return canvas.toBuffer();
}

// Biểu đồ lịch sử đẹp
function createHistoryChart() {
    const last20 = database.history.slice(-20);
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    
    // Nền
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, 800, 300);
    
    // Tiêu đề
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('LỊCH SỬ 20 PHIÊN GẦN NHẤT', 250, 30);
    
    if (last20.length === 0) {
        ctx.fillStyle = '#99AAB5';
        ctx.font = '16px Arial';
        ctx.fillText('Chưa có dữ liệu', 350, 150);
        return canvas.toBuffer();
    }
    
    // Vẽ biểu đồ cột
    const barWidth = 35;
    const spacing = 5;
    const maxHeight = 200;
    
    last20.forEach((h, i) => {
        const x = 20 + i * (barWidth + spacing);
        const barHeight = (h.total / 18) * maxHeight;
        const y = 270 - barHeight;
        
        // Màu cột
        ctx.fillStyle = h.tai ? '#3498db' : '#e74c3c';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Viền
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Số
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(h.total, x + barWidth / 2, y - 5);
    });
    
    // Chú thích
    ctx.fillStyle = '#3498db';
    ctx.fillRect(20, 280, 20, 15);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Tài', 45, 292);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(100, 280, 20, 15);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Xỉu', 125, 292);
    
    return canvas.toBuffer();
}

// Commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();
    
    // Command: .tx
    if (command === '.tx') {
        if (bettingSession) {
            return message.reply('⏳ Đang có phiên cược, vui lòng đợi!');
        }
        
        bettingSession = {
            channelId: message.channel.id,
            bets: {},
            startTime: Date.now(),
            messageId: null,
            phienNumber: (database.history.length + 1)
        };
        
        const jackpotDisplay = database.jackpot ? database.jackpot.toLocaleString('en-US') : '0';
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 PHIÊN CƯỢC MỚI')
            .setColor('#e67e22')
            .setDescription(`
**Cửa cược:**
🔵 **Tài** (11-18) | 🔴 **Xỉu** (3-10)
🟣 **Chẵn** | 🟡 **Lẻ**

**Tỷ lệ:**
✅ Thắng nhận **1.9x** tiền cược
❌ Thua mất tiền cược
🎰 **Nổ hũ x20** khi 3 xúc xắc trùng nhau!

💎 **HŨ HIỆN TẠI: ${jackpotDisplay} Mcoin**
📊 Mỗi cược cộng 2/3 vào hũ
            `)
            .addFields(
                { name: '⏰ Thời gian còn lại', value: '30 giây', inline: true },
                { name: '👥 Người chơi', value: '0', inline: true }
            )
            .setFooter({ text: 'Bấm nút để đặt cược!' })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bet_tai')
                    .setLabel('🔵 Tài')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('bet_xiu')
                    .setLabel('🔴 Xỉu')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('bet_chan')
                    .setLabel('🟣 Chẵn')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('bet_le')
                    .setLabel('🟡 Lẻ')
                    .setStyle(ButtonStyle.Success)
            );
        
        const sentMessage = await message.reply({ embeds: [embed], components: [row] });
        bettingSession.messageId = sentMessage.id;
        
        // Đếm ngược
        let timeLeft = 30;
        const countdown = setInterval(async () => {
            timeLeft -= 5;
            
            if (timeLeft > 0) {
                embed.spliceFields(0, 1, { name: '⏰ Thời gian còn lại', value: `${timeLeft} giây`, inline: true });
                await sentMessage.edit({ embeds: [embed], components: [row] });
            } else {
                clearInterval(countdown);
                
                row.components.forEach(btn => btn.setDisabled(true));
                await sentMessage.edit({ components: [row] });
                
                if (Object.keys(bettingSession.bets).length === 0) {
                    await sentMessage.edit({ 
                        content: '❌ Không có ai đặt cược. Phiên bị hủy!',
                        embeds: [],
                        components: []
                    });
                    bettingSession = null;
                    return;
                }
                
                // Tung xúc xắc
                const { dice1, dice2, dice3, total } = rollDice();
                const result = checkResult(total);
                const isJackpot = checkJackpot(dice1, dice2, dice3);
                
                database.history.push({ total, tai: result.tai, timestamp: Date.now() });
                if (database.history.length > 50) database.history.shift();
                
                let winners = [];
                let losers = [];
                let jackpotWinners = [];
                
                for (const [userId, bet] of Object.entries(bettingSession.bets)) {
                    const user = getUser(userId);
                    let win = false;
                    
                    if (bet.type === 'tai' && result.tai) {
                        win = true;
                        user.tai++;
                    } else if (bet.type === 'xiu' && result.xiu) {
                        win = true;
                        user.xiu++;
                    } else if (bet.type === 'chan' && result.chan) {
                        win = true;
                        user.chan++;
                    } else if (bet.type === 'le' && result.le) {
                        win = true;
                        user.le++;
                    }
                    
                    // Cộng 2/3 tiền cược vào hũ
                    const jackpotAdd = Math.floor(bet.amount * 2 / 3);
                    database.jackpot = (database.jackpot || 0) + jackpotAdd;
                    
                    if (win) {
                        const winAmount = Math.floor(bet.amount * 1.9);
                        user.balance += winAmount;
                        winners.push(`<@${userId}>: +${winAmount.toLocaleString('en-US')} 💰`);
                    } else {
                        losers.push(`<@${userId}>: -${bet.amount.toLocaleString('en-US')} 💸`);
                    }
                    
                    // Nổ hũ - nhận x20 tiền hũ
                    if (isJackpot) {
                        const currentJackpot = database.jackpot || 0;
                        const jackpotAmount = currentJackpot * 20;
                        user.balance += jackpotAmount;
                        user.jackpotWins++;
                        jackpotWinners.push(`<@${userId}>: +${jackpotAmount.toLocaleString('en-US')} 🎰💎`);
                        database.jackpot = 0; // Reset hũ sau khi nổ
                    }
                }
                
                saveDB();
                
                // Tạo ảnh xúc xắc
                const diceBuffer = createDiceImage(dice1, dice2, dice3);
                const attachment = new AttachmentBuilder(diceBuffer, { name: 'dice.png' });
                
                const resultEmbed = new EmbedBuilder()
                    .setTitle(`🎲 KẾT QUẢ TÀI XỈU #${bettingSession.phienNumber}`)
                    .setColor(isJackpot ? '#FFD700' : (result.tai ? '#3498db' : '#e74c3c'))
                    .setImage('attachment://dice.png')
                    .setDescription(`
**⇒ Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**
**Chung cược: ${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**
${isJackpot ? '\n🎰 **NỔ HŨ!!! 3 XÚC XẮC TRÙNG NHAU!!!** 🎰' : ''}
                    `);
                
                if (isJackpot && jackpotWinners.length > 0) {
                    resultEmbed.addFields({
                        name: '🎰 JACKPOT!!!',
                        value: jackpotWinners.join('\n'),
                        inline: false
                    });
                }
                
                resultEmbed.addFields(
                    { 
                        name: '✅ THẮNG', 
                        value: winners.length > 0 ? winners.join('\n') : 'Không có',
                        inline: false
                    },
                    { 
                        name: '❌ THUA', 
                        value: losers.length > 0 ? losers.join('\n') : 'Không có',
                        inline: false
                    },
                    {
                        name: '🎰 Hũ hiện tại',
                        value: `${(database.jackpot || 0).toLocaleString('en-US')} Mcoin`,
                        inline: false
                    }
                );
                
                resultEmbed.setTimestamp();
                
                await sentMessage.edit({ 
                    content: '**🎊 PHIÊN ĐÃ KẾT THÚC**', 
                    embeds: [resultEmbed],
                    files: [attachment],
                    components: []
                });
                
                bettingSession = null;
            }
        }, 5000);
    }
    
    // Command: .mcoin
    if (command === '.mcoin') {
        const user = getUser(message.author.id);
        const embed = new EmbedBuilder()
            .setTitle('💰 SỐ DƯ CỦA BẠN')
            .setColor('#2ecc71')
            .setDescription(`**${user.balance.toLocaleString('en-US')} Mcoin**`)
            .addFields(
                { name: '🔵 Tài', value: `${user.tai}`, inline: true },
                { name: '🔴 Xỉu', value: `${user.xiu}`, inline: true },
                { name: '🟣 Chẵn', value: `${user.chan}`, inline: true },
                { name: '🟡 Lẻ', value: `${user.le}`, inline: true },
                { name: '🎰 Nổ hũ', value: `${user.jackpotWins} lần`, inline: true },
                { name: '💎 Hũ hiện tại', value: `${(database.jackpot || 0).toLocaleString('en-US')}`, inline: true }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .ls / .lichsu
    if (command === '.lichsu' || command === '.ls') {
        const chartBuffer = createHistoryChart();
        const attachment = new AttachmentBuilder(chartBuffer, { name: 'history.png' });
        
        const embed = new EmbedBuilder()
            .setTitle('📊 BIỂU ĐỒ LỊCH SỬ')
            .setColor('#9b59b6')
            .setImage('attachment://history.png')
            .setFooter({ text: 'Xanh = Tài | Đỏ = Xỉu' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed], files: [attachment] });
    }
    
    // Command: .diemdanh
    if (command === '.diemdanh' || command === '.dd') {
        const userId = message.author.id;
        const now = Date.now();
        const lastCheckin = database.lastCheckin[userId] || 0;
        const timeLeft = lastCheckin + (8 * 60 * 60 * 1000) - now;
        
        if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            return message.reply(`⏰ Bạn đã điểm danh rồi! Quay lại sau **${hours}h ${minutes}phút**`);
        }
        
        const user = getUser(userId);
        const reward = 3000000;
        user.balance += reward;
        database.lastCheckin[userId] = now;
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 ĐIỂM DANH THÀNH CÔNG!')
            .setColor('#2ecc71')
            .setDescription(`Bạn nhận được **${reward.toLocaleString('en-US')} Mcoin**!`)
            .addFields({
                name: '💰 Số dư mới',
                value: `${user.balance.toLocaleString('en-US')} Mcoin`
            })
            .setFooter({ text: 'Quay lại sau 8 giờ để điểm danh tiếp!' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .tang [user] [amount]
    if (command === '.tang' || command === '.give') {
        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[2]);
        
        if (!targetUser) {
            return message.reply('❌ Sử dụng: `.tang @user [số tiền]`\nVí dụ: `.tang @Tên 100000`');
        }
        
        if (!amount || amount < 10000) {
            return message.reply('❌ Số tiền phải ít nhất 10,000 Mcoin!');
        }
        
        const sender = getUser(message.author.id);
        
        if (sender.balance < amount) {
            return message.reply(`❌ Số dư không đủ! Bạn có: **${sender.balance.toLocaleString('en-US')} Mcoin**`);
        }
        
        if (targetUser.id === message.author.id) {
            return message.reply('❌ Không thể tặng tiền cho chính mình!');
        }
        
        const receiver = getUser(targetUser.id);
        sender.balance -= amount;
        receiver.balance += amount;
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('💝 TẶNG TIỀN THÀNH CÔNG!')
            .setColor('#e91e63')
            .setDescription(`<@${message.author.id}> đã tặng **${amount.toLocaleString('en-US')} Mcoin** cho <@${targetUser.id}>!`)
            .addFields(
                { name: '💰 Số dư người gửi', value: `${sender.balance.toLocaleString('en-US')} Mcoin`, inline: true },
                { name: '💰 Số dư người nhận', value: `${receiver.balance.toLocaleString('en-US')} Mcoin`, inline: true }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
});

// Button & Modal handlers
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.reply({ content: '❌ Không có phiên cược nào đang diễn ra!', ephemeral: true });
        }
        
        if (bettingSession.bets[interaction.user.id]) {
            return interaction.reply({ content: '❌ Bạn đã đặt cược rồi!', ephemeral: true });
        }
        
        const betTypes = {
            'bet_tai': { type: 'tai', name: 'TÀI', emoji: '🔵' },
            'bet_xiu': { type: 'xiu', name: 'XỈU', emoji: '🔴' },
            'bet_chan': { type: 'chan', name: 'CHẴN', emoji: '🟣' },
            'bet_le': { type: 'le', name: 'LẺ', emoji: '🟡' }
        };
        
        const betInfo = betTypes[interaction.customId];
        if (!betInfo) return;
        
        const modal = new ModalBuilder()
            .setCustomId(`bet_modal_${betInfo.type}`)
            .setTitle(`${betInfo.emoji} NHẬP SỐ TIỀN CƯỢC (${betInfo.name})`);
        
        const user = getUser(interaction.user.id);
        
        const amountInput = new TextInputBuilder()
            .setCustomId('bet_amount')
            .setLabel(`Mcoin của bạn: ${user.balance.toLocaleString('en-US')}`)
            .setPlaceholder('Nhập số tiền bạn muốn cược ở đây!')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(4)
            .setMaxLength(10);
        
        const row = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(row);
        
        await interaction.showModal(modal);
    }
    
    if (interaction.isModalSubmit()) {
        if (!interaction.customId.startsWith('bet_modal_')) return;
        
        const betType = interaction.customId.replace('bet_modal_', '');
        const amount = parseInt(interaction.fields.getTextInputValue('bet_amount').replace(/[^0-9]/g, ''));
        
        const betNames = {
            'tai': '🔵 Tài',
            'xiu': '🔴 Xỉu',
            'chan': '🟣 Chẵn',
            'le': '🟡 Lẻ'
        };
        
        if (!amount || isNaN(amount)) {
            return interaction.reply({ content: '❌ Số tiền không hợp lệ!', ephemeral: true });
        }
        
        if (amount < 15000) {
            return interaction.reply({ content: '❌ Cược tối thiểu 15,000 Mcoin!', ephemeral: true });
        }
        
        const user = getUser(interaction.user.id);
        
        if (user.balance < amount) {
            return interaction.reply({ 
                content: `❌ Số dư không đủ! Bạn có: **${user.balance.toLocaleString('en-US')} Mcoin**`, 
                ephemeral: true 
            });
        }
        
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.reply({ content: '❌ Phiên cược đã kết thúc!', ephemeral: true });
        }
        
        if (bettingSession.bets[interaction.user.id]) {
            return interaction.reply({ content: '❌ Bạn đã đặt cược rồi!', ephemeral: true });
        }
        
        user.balance -= amount;
        saveDB();
        
        bettingSession.bets[interaction.user.id] = {
            type: betType,
            amount: amount
        };
        
        await interaction.reply({ 
            content: `✅ Đã đặt **${amount.toLocaleString('en-US')} Mcoin** vào ${betNames[betType]}!`, 
            ephemeral: true 
        });
        
        try {
            const channel = await client.channels.fetch(bettingSession.channelId);
            const msg = await channel.messages.fetch(bettingSession.messageId);
            const embed = msg.embeds[0];
            const newEmbed = EmbedBuilder.from(embed);
            newEmbed.spliceFields(1, 1, { 
                name: '👥 Người chơi', 
                value: Object.keys(bettingSession.bets).length.toString(), 
                inline: true 
            });
            await msg.edit({ embeds: [newEmbed] });
        } catch (e) {}
    }
});

client.on('ready', () => {
    console.log(`✅ Bot ${client.user.tag} đã online!`);
    client.user.setActivity('.tx để chơi | .diemdanh nhận quà', { type: 'PLAYING' });
});

client.login(process.env.TOKEN);

// Keep bot alive on Render
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running!');
});
server.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Server is running to keep Render alive.");
});


