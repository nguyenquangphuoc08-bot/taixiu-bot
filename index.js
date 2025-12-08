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

// ===== SAFE DEPLOY: Lưu phiên cược vào database =====
const DB_PATH = './database/database.json';

// Tạo thư mục database nếu chưa có
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
}

let database = {
    users: {},
    history: [],
    jackpot: 0,
    lastCheckin: {},
    activeBettingSession: null // Lưu phiên cược đang chạy
};

if (fs.existsSync(DB_PATH)) {
    try {
        database = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        console.log('✅ Đã load database thành công!');
    } catch (e) {
        console.error('❌ Lỗi đọc database, tạo mới:', e);
    }
}

function saveDB() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
    } catch (e) {
        console.error('❌ Lỗi lưu database:', e);
    }
}

function getUser(userId) {
    if (!database.users[userId]) {
        database.users[userId] = {
            balance: 15000000,
            tai: 0,
            xiu: 0,
            chan: 0,
            le: 0,
            jackpotWins: 0,
            dailyQuests: {
                lastReset: new Date().toDateString(),
                quests: generateDailyQuests(),
                streak: 0,
                lastCompleted: null
            }
        };
        saveDB();
    }
    
    // Reset nhiệm vụ hằng ngày nếu qua ngày mới
    const today = new Date().toDateString();
    if (database.users[userId].dailyQuests.lastReset !== today) {
        database.users[userId].dailyQuests.lastReset = today;
        database.users[userId].dailyQuests.quests = generateDailyQuests();
        
        // Kiểm tra chuỗi: nếu hôm qua không hoàn thành → reset streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (database.users[userId].dailyQuests.lastCompleted !== yesterday.toDateString()) {
            database.users[userId].dailyQuests.streak = 0;
        }
        
        saveDB();
    }
    
    return database.users[userId];
}

// ===== DAILY QUESTS SYSTEM =====
function generateDailyQuests() {
    return [
        { id: 1, name: '🎲 Chơi 5 phiên Tài Xỉu', target: 5, current: 0, reward: 1000000, completed: false },
        { id: 2, name: '🎯 Thắng 3 lần cược', target: 3, current: 0, reward: 1000000, completed: false },
        { id: 3, name: '💰 Cược tổng 500K Mcoin', target: 500000, current: 0, reward: 1000000, completed: false },
        { id: 4, name: '🔵 Thắng Tài 2 lần', target: 2, current: 0, reward: 1000000, completed: false },
        { id: 5, name: '🔴 Thắng Xỉu 2 lần', target: 2, current: 0, reward: 1000000, completed: false }
    ];
}

function updateQuest(userId, questId, amount = 1) {
    const user = getUser(userId);
    const quest = user.dailyQuests.quests.find(q => q.id === questId);
    
    if (quest && !quest.completed) {
        quest.current += amount;
        if (quest.current >= quest.target) {
            quest.current = quest.target;
            quest.completed = true;
        }
        saveDB();
    }
}

function checkAllQuestsCompleted(userId) {
    const user = getUser(userId);
    return user.dailyQuests.quests.every(q => q.completed);
}

// Quản lý phiên cược
let bettingSession = null;

// ===== KHÔI PHỤC PHIÊN CƯỢC SAU KHI RESTART =====
client.once('clientReady', async () => {
    console.log(`✅ Bot ${client.user.tag} đã online!`);
    client.user.setActivity('.tx để chơi | .daily nhiệm vụ', { type: 'PLAYING' });
    
    // Kiểm tra phiên cược bị gián đoạn
    if (database.activeBettingSession) {
        console.log('🔄 Phát hiện phiên cược bị gián đoạn, đang hoàn tiền...');
        
        const session = database.activeBettingSession;
        
        // Hoàn tiền cho tất cả người chơi
        for (const [userId, bet] of Object.entries(session.bets)) {
            const user = getUser(userId);
            user.balance += bet.amount;
            console.log(`💰 Hoàn ${bet.amount} Mcoin cho user ${userId}`);
        }
        
        saveDB();
        
        // Gửi thông báo vào channel
        try {
            const channel = await client.channels.fetch(session.channelId);
            const embed = new EmbedBuilder()
                .setTitle('⚠️ PHIÊN CƯỢC BỊ GIÁN ĐOẠN')
                .setColor('#e67e22')
                .setDescription(`
Bot đã được cập nhật/restart trong lúc có phiên cược đang chạy.

**✅ ĐÃ HOÀN TIỀN CHO TẤT CẢ NGƯỜI CHƠI**

Vui lòng bắt đầu phiên mới bằng lệnh \`.tx\`
                `)
                .setTimestamp();
            
            await channel.send({ embeds: [embed] });
        } catch (e) {
            console.error('Không thể gửi thông báo hoàn tiền:', e);
        }
        
        // Xóa phiên cược khỏi database
        database.activeBettingSession = null;
        saveDB();
    }
});

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
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 100, 100);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, 90, 90);
    
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

function createHistoryChart() {
    const last20 = database.history.slice(-20);
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, 800, 300);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('LỊCH SỬ 20 PHIÊN GẦN NHẤT', 250, 30);
    
    if (last20.length === 0) {
        ctx.fillStyle = '#99AAB5';
        ctx.font = '16px Arial';
        ctx.fillText('Chưa có dữ liệu', 350, 150);
        return canvas.toBuffer();
    }
    
    const barWidth = 35;
    const spacing = 5;
    const maxHeight = 200;
    
    last20.forEach((h, i) => {
        const x = 20 + i * (barWidth + spacing);
        const barHeight = (h.total / 18) * maxHeight;
        const y = 270 - barHeight;
        
        ctx.fillStyle = h.tai ? '#3498db' : '#e74c3c';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(h.total, x + barWidth / 2, y - 5);
    });
    
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
        
        // LƯU PHIÊN CƯỢC VÀO DATABASE
        database.activeBettingSession = {
            channelId: message.channel.id,
            bets: {},
            startTime: Date.now()
        };
        saveDB();
        
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
⚠️ **Chỉ người THẮNG cược mới nhận hũ!**

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
                    database.activeBettingSession = null;
                    saveDB();
                    return;
                }
                
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
                    
                    // Update quest: Chơi phiên
                    updateQuest(userId, 1);
                    
                    // Update quest: Cược tổng
                    updateQuest(userId, 3, bet.amount);
                    
                    if (bet.type === 'tai' && result.tai) {
                        win = true;
                        user.tai++;
                        updateQuest(userId, 4); // Thắng Tài
                    } else if (bet.type === 'xiu' && result.xiu) {
                        win = true;
                        user.xiu++;
                        updateQuest(userId, 5); // Thắng Xỉu
                    } else if (bet.type === 'chan' && result.chan) {
                        win = true;
                        user.chan++;
                    } else if (bet.type === 'le' && result.le) {
                        win = true;
                        user.le++;
                    }
                    
                    const jackpotAdd = Math.floor(bet.amount * 2 / 3);
                    database.jackpot = (database.jackpot || 0) + jackpotAdd;
                    
                    if (win) {
                        const winAmount = Math.floor(bet.amount * 1.9);
                        user.balance += winAmount;
                        
                        // Update quest: Thắng
                        updateQuest(userId, 2);
                        
                        if (isJackpot) {
                            const currentJackpot = database.jackpot || 0;
                            const jackpotAmount = currentJackpot * 20;
                            user.balance += jackpotAmount;
                            user.jackpotWins++;
                            jackpotWinners.push(`<@${userId}>: +${jackpotAmount.toLocaleString('en-US')} 🎰💎`);
                        }
                        
                        winners.push(`<@${userId}>: +${winAmount.toLocaleString('en-US')} 💰`);
                    } else {
                        losers.push(`<@${userId}>: -${bet.amount.toLocaleString('en-US')} 💸`);
                    }
                }
                
                if (isJackpot && jackpotWinners.length > 0) {
                    database.jackpot = 0;
                }
                
                saveDB();
                
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
${isJackpot && jackpotWinners.length === 0 ? '\n⚠️ **Không có người thắng - Hũ tiếp tục tăng!**' : ''}
                    `);
                
                if (isJackpot && jackpotWinners.length > 0) {
                    resultEmbed.addFields({
                        name: '🎰 JACKPOT - CHỈ NGƯỜI THẮNG NHẬN!!!',
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
                database.activeBettingSession = null;
                saveDB();
            }
        }, 5000);
    }
    
    // Command: .daily - Nhiệm vụ hằng ngày
    if (command === '.daily') {
        const user = getUser(message.author.id);
        const quests = user.dailyQuests.quests;
        const streak = user.dailyQuests.streak;
        
        const embed = new EmbedBuilder()
            .setTitle('📋 NHIỆM VỤ HẰNG NGÀY')
            .setColor('#9b59b6')
            .setDescription(`
🔥 **Chuỗi ngày: ${streak} ngày** ${streak >= 3 ? '(x2 điểm danh!)' : ''}
${streak >= 3 ? '✨ Làm đủ nhiệm vụ hôm nay để giữ chuỗi và nhận x2 điểm danh!' : ''}
${streak < 3 ? '⚠️ Làm đủ nhiệm vụ 3 ngày liên tục để nhận x2 điểm danh!' : ''}
            `);
        
        let questText = '';
        let completedCount = 0;
        
        quests.forEach(q => {
            const status = q.completed ? '✅' : '⏳';
            const progress = `${q.current}/${q.target}`;
            questText += `${status} **${q.name}**\n`;
            questText += `   └ Tiến độ: ${progress} | Thưởng: ${q.reward.toLocaleString('en-US')} Mcoin\n\n`;
            if (q.completed) completedCount++;
        });
        
        embed.addFields({
            name: `📊 Tiến độ: ${completedCount}/5 nhiệm vụ`,
            value: questText,
            inline: false
        });
        
        // Kiểm tra hoàn thành tất cả
        if (checkAllQuestsCompleted(message.author.id)) {
            const bonusReward = 5000000;
            const totalReward = quests.reduce((sum, q) => sum + q.reward, 0) + bonusReward;
            
            embed.addFields({
                name: '🎉 HOÀN THÀNH TẤT CẢ!',
                value: `Tổng thưởng: **${totalReward.toLocaleString('en-US')} Mcoin**\nGõ \`.claimall\` để nhận thưởng!`,
                inline: false
            });
        }
        
        embed.setFooter({ text: 'Reset lúc 00:00 hằng ngày | Không làm = mất chuỗi' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .claimall - Nhận thưởng khi hoàn thành tất cả
    if (command === '.claimall') {
        const user = getUser(message.author.id);
        
        if (!checkAllQuestsCompleted(message.author.id)) {
            return message.reply('❌ Bạn chưa hoàn thành tất cả nhiệm vụ!');
        }
        
        const quests = user.dailyQuests.quests;
        const questReward = quests.reduce((sum, q) => sum + q.reward, 0);
        const bonusReward = 5000000;
        const totalReward = questReward + bonusReward;
        
        user.balance += totalReward;
        user.dailyQuests.streak++;
        user.dailyQuests.lastCompleted = new Date().toDateString();
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('🎉 NHẬN THƯỞNG THÀNH CÔNG!')
            .setColor('#2ecc71')
            .setDescription(`
Chúc mừng bạn đã hoàn thành tất cả nhiệm vụ hôm nay!

💰 **Thưởng nhiệm vụ:** ${questReward.toLocaleString('en-US')} Mcoin
🎁 **Thưởng hoàn thành:** ${bonusReward.toLocaleString('en-US')} Mcoin
✨ **TỔNG:** ${totalReward.toLocaleString('en-US')} Mcoin

🔥 **Chuỗi ngày mới:** ${user.dailyQuests.streak} ngày
${user.dailyQuests.streak >= 3 ? '🎊 Bạn được nhận **X2 điểm danh** khi gõ .diemdanh!' : ''}
            `)
            .addFields({
                name: '💎 Số dư mới',
                value: `${user.balance.toLocaleString('en-US')} Mcoin`
            })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .mcoin
    if (command === '.mcoin') {
        const user = getUser(message.author.id);
        const streak = user.dailyQuests.streak;
        const completedQuests = user.dailyQuests.quests.filter(q => q.completed).length;
        
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
                { name: '💎 Hũ hiện tại', value: `${(database.jackpot || 0).toLocaleString('en-US')}`, inline: true },
                { name: '🔥 Chuỗi ngày', value: `${streak} ngày ${streak >= 3 ? '(x2 DD!)' : ''}`, inline: true },
                { name: '📋 Nhiệm vụ hôm nay', value: `${completedQuests}/5`, inline: true }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .lichsu
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
        const streak = user.dailyQuests.streak;
        const multiplier = streak >= 3 ? 2 : 1;
        const reward = 3000000 * multiplier;
        
        user.balance += reward;
        database.lastCheckin[userId] = now;
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 ĐIỂM DANH THÀNH CÔNG!')
            .setColor('#2ecc71')
            .setDescription(`
Bạn nhận được **${reward.toLocaleString('en-US')} Mcoin**!
${multiplier === 2 ? '\n✨ **X2 nhờ chuỗi 3+ ngày làm nhiệm vụ!**' : ''}
            `)
            .addFields(
                {
                    name: '💰 Số dư mới',
                    value: `${user.balance.toLocaleString('en-US')} Mcoin`
                },
                {
                    name: '🔥 Chuỗi nhiệm vụ',
                    value: `${streak} ngày ${streak >= 3 ? '(Đang x2!)' : '(Cần 3+ ngày để x2)'}`
                }
            )
            .setFooter({ text: 'Quay lại sau 8 giờ | Làm .daily để giữ chuỗi!' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .dbinfo - Xem thông tin database (Admin only)
    if (command === '.dbinfo') {
        // Thay YOUR_DISCORD_ID bằng ID Discord của bạn
        const ADMIN_ID = '1100660298073002004'; // Lấy ID: click chuột phải vào tên → Copy ID
        
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
        }
        
        const totalUsers = Object.keys(database.users).length;
        const totalBalance = Object.values(database.users).reduce((sum, u) => sum + u.balance, 0);
        const totalHistory = database.history.length;
        const dbExists = fs.existsSync(DB_PATH);
        
        let dbSize = 0;
        if (dbExists) {
            const stats = fs.statSync(DB_PATH);
            dbSize = (stats.size / 1024).toFixed(2); // KB
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🗄️ THÔNG TIN DATABASE')
            .setColor('#3498db')
            .setDescription(`
**File:** ${dbExists ? '✅ Tồn tại' : '❌ Không tồn tại'}
**Đường dẫn:** \`${DB_PATH}\`
**Kích thước:** ${dbSize} KB
            `)
            .addFields(
                { name: '👥 Tổng người chơi', value: `${totalUsers}`, inline: true },
                { name: '💰 Tổng tiền hệ thống', value: `${totalBalance.toLocaleString('en-US')}`, inline: true },
                { name: '📊 Lịch sử phiên', value: `${totalHistory}`, inline: true },
                { name: '🎰 Hũ hiện tại', value: `${database.jackpot.toLocaleString('en-US')}`, inline: true },
                { name: '⏳ Phiên đang chạy', value: database.activeBettingSession ? '✅ Có' : '❌ Không', inline: true },
                { name: '⏰ Uptime', value: `${Math.floor(process.uptime() / 60)} phút`, inline: true }
            )
            .setFooter({ text: `Bot: ${client.user.tag}` })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .backup - Backup database (Admin only)
    if (command === '.backup') {
        const ADMIN_ID = '1100660298073002004'; // Thay bằng ID của bạn
        
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
        }
        
        const backup = JSON.stringify(database, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `backup_${new Date().toISOString().split('T')[0]}.json` 
        });
        
        const embed = new EmbedBuilder()
            .setTitle('📦 DATABASE BACKUP')
            .setColor('#2ecc71')
            .setDescription(`
Backup được tạo lúc: ${new Date().toLocaleString('vi-VN')}

**Thống kê:**
- Người chơi: ${Object.keys(database.users).length}
- Lịch sử: ${database.history.length} phiên
- Hũ: ${database.jackpot.toLocaleString('en-US')} Mcoin

**Lưu ý:** Tải file này về và giữ an toàn!
            `)
            .setTimestamp();
        
        await message.reply({ 
            embeds: [embed],
            files: [attachment] 
        });
    }
    
    // Command: .restore - Restore database từ backup (Admin only)
    if (command === '.restore') {
        const ADMIN_ID = '1100660298073002004';
        
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
        }
        
        return message.reply(`
📥 **HƯỚNG DẪN RESTORE DATABASE:**

1️⃣ Gửi file backup \`.json\` vào channel này
2️⃣ Kèm theo comment: \`restore confirm\`
3️⃣ Bot sẽ tự động restore

⚠️ **Cảnh bánh:** Restore sẽ GHI ĐÈ toàn bộ data hiện tại!
        `);
    }
    
    // Command: .tang
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
            return interaction.reply({ content: '❌ Không có phiên cược nào đang diễn ra!', flags: 64 });
        }
        
        if (bettingSession.bets[interaction.user.id]) {
            return interaction.reply({ content: '❌ Bạn đã đặt cược rồi!', flags: 64 });
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
            return interaction.reply({ content: '❌ Số tiền không hợp lệ!', flags: 64 });
        }
        
        if (amount < 15000) {
            return interaction.reply({ content: '❌ Cược tối thiểu 15,000 Mcoin!', flags: 64 });
        }
        
        const user = getUser(interaction.user.id);
        
        if (user.balance < amount) {
            return interaction.reply({ 
                content: `❌ Số dư không đủ! Bạn có: **${user.balance.toLocaleString('en-US')} Mcoin**`, 
                flags: 64
            });
        }
        
        if (!bettingSession || bettingSession.channelId !== interaction.channel.id) {
            return interaction.reply({ content: '❌ Phiên cược đã kết thúc!', flags: 64 });
        }
        
        if (bettingSession.bets[interaction.user.id]) {
            return interaction.reply({ content: '❌ Bạn đã đặt cược rồi!', flags: 64 });
        }
        
        user.balance -= amount;
        saveDB();
        
        bettingSession.bets[interaction.user.id] = {
            type: betType,
            amount: amount
        };
        
        // LƯU VÀO DATABASE
        database.activeBettingSession.bets[interaction.user.id] = {
            type: betType,
            amount: amount
        };
        saveDB();
        
        await interaction.reply({ 
            content: `✅ Đã đặt **${amount.toLocaleString('en-US')} Mcoin** vào ${betNames[betType]}!`, 
            flags: 64
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


