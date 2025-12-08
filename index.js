require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const fs = require('fs');
const https = require('https');
const http = require('http');
const giftcode = require('./giftcode');

// TEST CANVAS NGAY KHI LOAD
console.log('🧪 Testing Canvas module...');
console.log('   createCanvas type:', typeof createCanvas);
try {
    const testCanvas = createCanvas(100, 100);
    console.log('   ✅ Canvas test: OK');
} catch (e) {
    console.error('   ❌ Canvas test FAILED:', e.message);
}
console.log('');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ===== CẤU HÌNH - THAY ĐỔI Ở ĐÂY =====
const ADMIN_ID = '1100660298073002004'; // Thay bằng Discord ID của bạn
const BACKUP_CHANNEL_ID = '1447477880329338962'; // Thay bằng ID channel backup

// ===== DATABASE =====
const DB_PATH = './database/database.json';

if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
}

let database = {
    users: {},
    history: [],
    jackpot: 0,
    lastCheckin: {},
    activeBettingSession: null
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
    
    const today = new Date().toDateString();
    if (database.users[userId].dailyQuests.lastReset !== today) {
        database.users[userId].dailyQuests.lastReset = today;
        database.users[userId].dailyQuests.quests = generateDailyQuests();
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (database.users[userId].dailyQuests.lastCompleted !== yesterday.toDateString()) {
            database.users[userId].dailyQuests.streak = 0;
        }
        
        saveDB();
    }
    
    return database.users[userId];
}

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

let bettingSession = null;

// ===== GAME FUNCTIONS =====
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

function drawDice(number) {
    try {
        console.log(`🎲 Drawing dice: ${number}`);
        
        // Kiểm tra module canvas
        if (typeof createCanvas !== 'function') {
            console.error('❌ createCanvas is not a function! Canvas module not loaded properly.');
            return null;
        }
        const canvas = createCanvas(100, 100);
        const ctx = canvas.getContext('2d');
        
        // Nền trắng
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 100, 100);
        
        // Viền đen
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, 90, 90);
        
        // Vẽ chấm đen
        ctx.fillStyle = '#000000';
        const dotSize = 13;
        
        const positions = {
            1: [[50, 50]],
            2: [[30, 30], [70, 70]],
            3: [[30, 30], [50, 50], [70, 70]],
            4: [[30, 30], [70, 30], [30, 70], [70, 70]],
            5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
            6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]]
        };
        
        if (!positions[number]) {
            console.error(`Invalid dice number: ${number}`);
            return null;
        }
        
        positions[number].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fill();
        });
        
        return canvas;
    } catch (error) {
        console.error('❌ Error drawing dice:', error.message);
        return null;
    }
}

function createDiceImage(dice1, dice2, dice3) {
    try {
        console.log(`🎲 [createDiceImage] Starting: ${dice1}-${dice2}-${dice3}`);
        
        if (typeof createCanvas !== 'function') {
            console.error('❌ createCanvas is not a function!');
            return null;
        }
        
        const canvas = createCanvas(340, 130);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            console.error('❌ Cannot get canvas context!');
            return null;
        }
        
        ctx.clearRect(0, 0, 340, 130);
        
        const d1 = drawDice(dice1);
        const d2 = drawDice(dice2);
        const d3 = drawDice(dice3);
        
        if (!d1 || !d2 || !d3) {
            console.error('❌ Failed to create dice canvases');
            return null;
        }
        
        ctx.drawImage(d1, 10, 15, 100, 100);
        ctx.drawImage(d2, 120, 15, 100, 100);
        ctx.drawImage(d3, 230, 15, 100, 100);
        
        const buffer = canvas.toBuffer('image/png');
        
        if (!buffer || buffer.length === 0) {
            console.error('❌ Buffer is empty');
            return null;
        }
        
        console.log(`✅ [createDiceImage] SUCCESS! Buffer: ${buffer.length} bytes`);
        console.log(`   Buffer is Buffer: ${Buffer.isBuffer(buffer)}`);
        return buffer;
        
    } catch (error) {
        console.error('❌ [createDiceImage] Error:', error.message);
        return null;
    }
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

// ===== BOT READY =====
client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} đã online!`);
    client.user.setActivity('.tx để chơi | .daily nhiệm vụ', { type: 'PLAYING' });
    
    // Khôi phục phiên cược bị gián đoạn
    if (database.activeBettingSession) {
        console.log('🔄 Phát hiện phiên cược bị gián đoạn, đang hoàn tiền...');
        
        const session = database.activeBettingSession;
        
        for (const [userId, bet] of Object.entries(session.bets)) {
            const user = getUser(userId);
            user.balance += bet.amount;
            console.log(`💰 Hoàn ${bet.amount} Mcoin cho user ${userId}`);
        }
        
        saveDB();
        
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
        
        database.activeBettingSession = null;
        saveDB();
    }
    
    // Backup khi khởi động
    try {
        const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
        
        const backup = JSON.stringify(database, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `startup_backup_${Date.now()}.json` 
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🚀 BOT VỪA KHỞI ĐỘNG')
            .setColor('#2ecc71')
            .setDescription(`
Bot đã online và tạo backup khởi động!

**Database hiện tại:**
👥 Người chơi: ${Object.keys(database.users).length}
📊 Lịch sử: ${database.history.length} phiên  
🎰 Hũ: ${database.jackpot.toLocaleString('en-US')} Mcoin
            `)
            .setFooter({ text: 'Backup khi khởi động' })
            .setTimestamp();
        
        await channel.send({ embeds: [embed], files: [attachment] });
        console.log('✅ Backup khởi động thành công!');
        
    } catch (e) {
        console.error('❌ Lỗi backup khởi động:', e.message);
    }
});

// ===== AUTO BACKUP MỖI 6 GIỜ =====
setInterval(async () => {
    try {
        const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
        
        const backup = JSON.stringify(database, null, 2);
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `auto_backup_${timestamp}.json` 
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🤖 AUTO BACKUP - 6 GIỜ')
            .setColor('#3498db')
            .setDescription(`
**Thống kê database:**
👥 Tổng người chơi: **${Object.keys(database.users).length}**
📊 Lịch sử phiên: **${database.history.length}** phiên
🎰 Hũ hiện tại: **${database.jackpot.toLocaleString('en-US')}** Mcoin
💰 Tổng tiền hệ thống: **${Object.values(database.users).reduce((sum, u) => sum + u.balance, 0).toLocaleString('en-US')}** Mcoin
⏳ Phiên đang chạy: ${database.activeBettingSession ? '✅ Có' : '❌ Không'}
            `)
            .setFooter({ text: 'Backup tự động mỗi 6 giờ' })
            .setTimestamp();
        
        await channel.send({ embeds: [embed], files: [attachment] });
        console.log(`✅ [${new Date().toLocaleString('vi-VN')}] Auto backup thành công!`);
        
    } catch (e) {
        console.error('❌ Lỗi auto backup:', e.message);
    }
}, 6 * 60 * 60 * 1000);

// ===== BACKUP KHI BOT TẮT =====
process.on('SIGTERM', async () => {
    console.log('⚠️ Bot nhận tín hiệu tắt, đang backup...');
    
    try {
        const channel = await client.channels.fetch(BACKUP_CHANNEL_ID);
        
        const backup = JSON.stringify(database, null, 2);
        const attachment = new AttachmentBuilder(Buffer.from(backup), { 
            name: `shutdown_backup_${Date.now()}.json` 
        });
        
        const embed = new EmbedBuilder()
            .setTitle('⚠️ BACKUP KHẨN CẤP - BOT TẮT')
            .setColor('#e74c3c')
            .setDescription(`
Bot đang tắt (deploy/restart), đã backup data!

**Thống kê:**
👥 Người chơi: ${Object.keys(database.users).length}
📊 Lịch sử: ${database.history.length} phiên
🎰 Hũ: ${database.jackpot.toLocaleString('en-US')} Mcoin
            `)
            .setTimestamp();
        
        await channel.send({ embeds: [embed], files: [attachment] });
        console.log('✅ Backup trước khi tắt thành công!');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (e) {
        console.error('❌ Lỗi backup trước khi tắt:', e.message);
    } finally {
        process.exit(0);
    }
});

// ===== COMMANDS =====
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
                    
                    updateQuest(userId, 1);
                    updateQuest(userId, 3, bet.amount);
                    
                    if (bet.type === 'tai' && result.tai) {
                        win = true;
                        user.tai++;
                        updateQuest(userId, 4);
                    } else if (bet.type === 'xiu' && result.xiu) {
                        win = true;
                        user.xiu++;
                        updateQuest(userId, 5);
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

const resultEmbed = new EmbedBuilder()
    .setTitle(`🎲 KẾT QUẢ TÀI XỈU #${bettingSession.phienNumber}`)
    .setColor(isJackpot ? '#FFD700' : (result.tai ? '#3498db' : '#e74c3c'));

// Mảng chứa files
let files = [];
let embedDescription = '';

if (diceBuffer && Buffer.isBuffer(diceBuffer) && diceBuffer.length > 0) {
    console.log(`✅ Valid buffer: ${diceBuffer.length} bytes`);
    
    embedDescription = `
**⇒ Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**
**Chung cược: ${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**
${isJackpot ? '\n🎰 **NỔ HŨ!!! 3 XÚC XẮC TRÙNG NHAU!!!** 🎰' : ''}
${isJackpot && jackpotWinners.length === 0 ? '\n⚠️ **Không có người thắng - Hũ tiếp tục tăng!**' : ''}
    `;
    
    resultEmbed.setDescription(embedDescription);
    resultEmbed.setImage('attachment://dice.png');
    
    const attachment = new AttachmentBuilder(diceBuffer, { name: 'dice.png' });
    files.push(attachment);
    
} else {
    console.log('⚠️ Canvas failed, sending without image');
    
    embedDescription = `
🎲 **${dice1} - ${dice2} - ${dice3}**

**⇒ Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**
**Chung cược: ${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**
${isJackpot ? '\n🎰 **NỔ HŨ!!! 3 XÚC XẮC TRÙNG NHAU!!!** 🎰' : ''}
${isJackpot && jackpotWinners.length === 0 ? '\n⚠️ **Không có người thắng - Hũ tiếp tục tăng!**' : ''}
    `;
    
    resultEmbed.setDescription(embedDescription);
}

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

// Gửi message
try {
    const messageData = { 
        content: '**🎊 PHIÊN ĐÃ KẾT THÚC**', 
        embeds: [resultEmbed],
        components: []
    };
    
    if (files.length > 0) {
        messageData.files = files;
        console.log('📤 Sending message WITH image...');
    } else {
        console.log('📤 Sending message WITHOUT image...');
    }
    
    await sentMessage.edit(messageData);
    console.log('✅ Message sent successfully!');
    
} catch (editError) {
    console.error('❌ Error editing message:', editError.message);
}
                
                bettingSession = null;
                database.activeBettingSession = null;
                saveDB();
            }
        }, 5000);
    }
    
    // Command: .daily
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
    
    // Command: .claimall
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
    
    // Command: .backupnow (Admin only)
    if (command === '.backupnow') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
        }
        
        try {
            const backup = JSON.stringify(database, null, 2);
            const attachment = new AttachmentBuilder(Buffer.from(backup), { 
                name: `manual_backup_${Date.now()}.json` 
            });
            
            const embed = new EmbedBuilder()
                .setTitle('💾 BACKUP THỦ CÔNG')
                .setColor('#9b59b6')
                .setDescription(`
**Backup được tạo bởi:** <@${message.author.id}>

**Thống kê:**
👥 Người chơi: ${Object.keys(database.users).length}
📊 Lịch sử: ${database.history.length} phiên
🎰 Hũ: ${database.jackpot.toLocaleString('en-US')} Mcoin
💰 Tổng tiền: ${Object.values(database.users).reduce((sum, u) => sum + u.balance, 0).toLocaleString('en-US')} Mcoin
⏳ Phiên chạy: ${database.activeBettingSession ? '✅ Có' : '❌ Không'}
                `)
                .setFooter({ text: 'Backup thủ công' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed], files: [attachment] });
            
        } catch (e) {
            return message.reply(`❌ Lỗi tạo backup: \`${e.message}\``);
        }
    }
    
    // Command: .dbinfo (Admin only)
    if (command === '.dbinfo') {
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
            dbSize = (stats.size / 1024).toFixed(2);
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
    
    // Command: .backup (Admin only)
    if (command === '.backup') {
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
    
    // Command: .restore (Admin only)
    if (command === '.restore') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới dùng được lệnh này!');
        }
        
        return message.reply(`
📥 **HƯỚNG DẪN RESTORE DATABASE:**

1️⃣ Gửi file backup \`.json\` vào channel này
2️⃣ Kèm theo comment: \`restore confirm\`
3️⃣ Bot sẽ tự động restore

⚠️ **Cảnh báo:** Restore sẽ GHI ĐÈ toàn bộ data hiện tại!
        `);
    }
    
    // Xử lý restore khi gửi file kèm "restore confirm"
    if (message.content.toLowerCase().includes('restore confirm') && message.attachments.size > 0) {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới được restore database!');
        }
        
        const attachment = message.attachments.first();
        
        if (!attachment.name.endsWith('.json')) {
            return message.reply('❌ File phải có định dạng `.json`!');
        }
        
        const processingMsg = await message.reply('⏳ Đang xử lý restore...');
        
        try {
            const backupData = await new Promise((resolve, reject) => {
                https.get(attachment.url, (res) => {
                    let data = '';
                    
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP Error: ${res.statusCode}`));
                        return;
                    }
                    
                    res.setEncoding('utf8');
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error('File JSON không hợp lệ hoặc bị lỗi'));
                        }
                    });
                }).on('error', (e) => {
                    reject(new Error(`Không thể tải file: ${e.message}`));
                });
            });
            
            if (!backupData.users || typeof backupData.users !== 'object') {
                return processingMsg.edit('❌ File backup thiếu hoặc sai cấu trúc `users`!');
            }
            
            if (!Array.isArray(backupData.history)) {
                return processingMsg.edit('❌ File backup thiếu hoặc sai cấu trúc `history`!');
            }
            
            const oldBackup = JSON.stringify(database, null, 2);
            const backupDir = './database';
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            fs.writeFileSync('./database/backup_before_restore.json', oldBackup);
            
            database = backupData;
            
            if (typeof database.jackpot !== 'number') database.jackpot = 0;
            if (!database.lastCheckin) database.lastCheckin = {};
            if (database.activeBettingSession !== null && typeof database.activeBettingSession !== 'object') {
                database.activeBettingSession = null;
            }
            
            saveDB();
            
            const embed = new EmbedBuilder()
                .setTitle('✅ RESTORE THÀNH CÔNG!')
                .setColor('#2ecc71')
                .setDescription(`
Database đã được khôi phục từ backup!

**Thống kê sau restore:**
👥 Người chơi: **${Object.keys(database.users).length}**
📊 Lịch sử: **${database.history.length}** phiên
🎰 Hũ: **${database.jackpot.toLocaleString('en-US')}** Mcoin
⏳ Phiên đang chạy: ${database.activeBettingSession ? '✅ Có' : '❌ Không'}

🔒 **Data cũ đã backup tại:** \`./database/backup_before_restore.json\`
                `)
                .setFooter({ text: 'Đã restore lúc' })
                .setTimestamp();
            
            await processingMsg.edit({ content: null, embeds: [embed] });
            
            console.log('✅ Database restored successfully by', message.author.tag);
            
        } catch (error) {
            console.error('❌ Lỗi restore:', error);
            return processingMsg.edit({
                content: `❌ **Lỗi khi restore database:**\n\`\`\`${error.message}\`\`\`\n\n💡 Kiểm tra:\n- File JSON có đúng format không?\n- File có bị lỗi/hỏng không?`
            });
        }
    }
    // Command: .giftcode (Admin tạo code với tùy chỉnh)
    if (command === '.giftcode' || command === '.gc') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới tạo được giftcode!');
        }
        
        // Cú pháp: .giftcode [số tiền] [số giờ]
        // Ví dụ: .giftcode 50000000 5  → 50M Mcoin, hết hạn sau 5 giờ
        // Hoặc: .giftcode              → Random 5M-1000M, hết hạn sau 2 giờ
        
        let customReward = null;
        let customHours = 2;
        
        if (args[1]) {
            customReward = parseInt(args[1]);
            if (isNaN(customReward) || customReward < 1000000) {
                return message.reply('❌ Số tiền phải >= 1,000,000 Mcoin!\n\n**Cách dùng:**\n`.giftcode [số tiền] [số giờ]`\n\n**Ví dụ:**\n`.giftcode 50000000 5` → 50M Mcoin, 5 giờ\n`.giftcode` → Random 5M-1000M, 2 giờ');
            }
        }
        
        if (args[2]) {
            customHours = parseInt(args[2]);
            if (isNaN(customHours) || customHours < 1 || customHours > 720) {
                return message.reply('❌ Số giờ phải từ 1 đến 720 (30 ngày)!');
            }
        }
        
        const newCode = giftcode.createGiftcode(message.author.id, customReward, customHours);
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 GIFTCODE MỚI ĐÃ TẠO!')
            .setColor('#f39c12')
            .setDescription(`
**Code:** \`${newCode.code}\`
**Phần thưởng:** ${newCode.reward.toLocaleString('en-US')} Mcoin
**Số lượt:** ${newCode.maxUses} lượt
**Thời hạn:** ${newCode.duration} giờ
**Hết hạn:** <t:${Math.floor(newCode.expiresAt / 1000)}:R>

📢 **Share code này cho người chơi!**
Họ dùng lệnh: \`.code ${newCode.code}\`
            `)
            .setFooter({ text: `Code tự động xóa sau ${newCode.duration} giờ hoặc hết 10 lượt` })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .code (Người chơi nhập code)
    if (command === '.code') {
        const code = args[1]?.toUpperCase();
        
        if (!code) {
            return message.reply('❌ Sử dụng: `.code <CODE>`\n\n**Ví dụ:** `.code ABC12345`');
        }
        
        const result = giftcode.redeemGiftcode(code, message.author.id);
        
        if (!result.success) {
            return message.reply(result.message);
        }
        
        // Cộng tiền cho user
        const user = getUser(message.author.id);
        user.balance += result.reward;
        saveDB();
        
        const embed = new EmbedBuilder()
            .setTitle('🎉 NHẬP CODE THÀNH CÔNG!')
            .setColor('#2ecc71')
            .setDescription(`
Bạn đã nhận được **${result.reward.toLocaleString('en-US')} Mcoin**!

💰 **Số dư mới:** ${user.balance.toLocaleString('en-US')} Mcoin
${result.usesLeft > 0 ? `⏳ Code còn **${result.usesLeft} lượt**` : '🔒 Code đã hết lượt và bị xóa!'}
            `)
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .codelist (Admin xem danh sách code)
    if (command === '.codelist' || command === '.gclist') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới xem được danh sách code!');
        }
        
        const activeCodes = giftcode.listActiveCodes();
        
        if (activeCodes.length === 0) {
            return message.reply('📭 Hiện không có giftcode nào đang hoạt động!');
        }
        
        let codeList = '';
        activeCodes.forEach((gc, index) => {
            const usesLeft = gc.maxUses - gc.usedBy.length;
            const expiresIn = Math.floor((gc.expiresAt - Date.now()) / (60 * 1000));
            const hours = Math.floor(expiresIn / 60);
            const minutes = expiresIn % 60;
            
            codeList += `**${index + 1}. \`${gc.code}\`**\n`;
            codeList += `   💰 Thưởng: ${gc.reward.toLocaleString('en-US')} Mcoin\n`;
            codeList += `   📊 Còn: ${usesLeft}/${gc.maxUses} lượt\n`;
            codeList += `   ⏰ Hết hạn sau: ${hours}h ${minutes}m\n`;
            codeList += `   📅 Thời hạn: ${gc.duration} giờ\n\n`;
        });
        
        const stats = giftcode.getStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📋 DANH SÁCH GIFTCODE')
            .setColor('#9b59b6')
            .setDescription(codeList)
            .addFields(
                { name: '📊 Thống kê', value: `Code hoạt động: **${stats.activeCodes}**\nĐã nhập: **${stats.totalRedeemed}** lần\nTổng thưởng: **${stats.totalRewards.toLocaleString('en-US')}** Mcoin`, inline: false }
            )
            .setFooter({ text: `Tổng ${activeCodes.length} code đang hoạt động` })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .delcode (Admin xóa code)
    if (command === '.delcode' || command === '.xoacode') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới xóa được code!');
        }
        
        const code = args[1]?.toUpperCase();
        
        if (!code) {
            return message.reply('❌ Sử dụng: `.delcode <CODE>`\n\n**Ví dụ:** `.delcode ABC12345`');
        }
        
        const result = giftcode.deleteGiftcode(code);
        
        if (!result.success) {
            return message.reply(`❌ ${result.message}`);
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🗑️ ĐÃ XÓA CODE')
            .setColor('#e74c3c')
            .setDescription(`
**Code đã xóa:** \`${result.code.code}\`
**Phần thưởng:** ${result.code.reward.toLocaleString('en-US')} Mcoin
**Đã dùng:** ${result.code.usedBy.length}/${result.code.maxUses} lượt
            `)
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Command: .delallcode (Admin xóa tất cả code)
    if (command === '.delallcode' || command === '.xoatatca') {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ admin mới xóa được tất cả code!');
        }
        
        const result = giftcode.deleteAllCodes();
        
        if (result.count === 0) {
            return message.reply('📭 Không có code nào để xóa!');
        }
        
        await message.reply(`✅ Đã xóa **${result.count} code** thành công!`);
    }
    // Command: .help
    if (command === '.help' || command === '.h') {
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
            embed.addFields({
                name: '🔧 Lệnh Admin',
                value: '`.dbinfo` - Thông tin database\n`.backup` - Tạo backup\n`.backupnow` - Backup thủ công\n`.restore` - Khôi phục database',
                inline: false
            },
            {
                name: '🎁 Quản lý Giftcode (Admin)',
                value: '`.giftcode [tiền] [giờ]` - Tạo code\n`.codelist` - Xem danh sách code\n`.delcode <code>` - Xóa 1 code\n`.delallcode` - Xóa tất cả code',
                inline: false
            });
        }
        
        await message.reply({ embeds: [embed] });
    }

// ===== BUTTON & MODAL HANDLERS =====
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

// ===== LOGIN & KEEP ALIVE =====
client.login(process.env.TOKEN);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});

server.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Server is running to keep Render alive.");
});
