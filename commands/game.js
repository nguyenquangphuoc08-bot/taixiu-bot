// commands/game.js - THÊM SỐ PHIÊN + FIX UI

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart, createBowlLift } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');

let bettingSession = null;

// ===== KHỞI TẠO SỐ PHIÊN =====
if (!database.phienCounter) {
    database.phienCounter = 0;
    saveDB();
}

// Lệnh: .tx
async function handleTaiXiu(message, client) {
    if (bettingSession) {
        return message.reply('⏳ Đang có phiên cược, vui lòng đợi!');
    }
    
    // Tăng số phiên
    database.phienCounter++;
    const phienNumber = database.phienCounter;
    saveDB();
    
    bettingSession = {
        channelId: message.channel.id,
        bets: {},
        startTime: Date.now(),
        messageId: null,
        phienNumber: phienNumber
    };
    
    database.activeBettingSession = {
        channelId: message.channel.id,
        bets: {},
        startTime: Date.now()
    };
    saveDB();
    
    const jackpotDisplay = database.jackpot ? database.jackpot.toLocaleString('en-US') : '0';
    
    const embed = new EmbedBuilder()
        .setTitle(`🎲 PHIÊN CƯỢC #${phienNumber}`)
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
            { name: '🎯 Phiên số', value: `#${phienNumber}`, inline: true }
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
        timeLeft -= 1;
        
        if (timeLeft > 0) {
            let emoji = '⏰';
            if (timeLeft <= 5) {
                emoji = '🔥';
            } else if (timeLeft <= 10) {
                emoji = '⚡';
            } else if (timeLeft <= 15) {
                emoji = '⏳';
            }
            
            embed.spliceFields(0, 1, { 
                name: `${emoji} Thời gian còn lại`, 
                value: `**${timeLeft}** giây`, 
                inline: true 
            });
            
            await sentMessage.edit({ embeds: [embed], components: [row] }).catch(() => {});
            
        } else {
            clearInterval(countdown);
            
            row.components.forEach(btn => btn.setDisabled(true));
            await sentMessage.edit({ components: [row] }).catch(() => {});
            
            if (Object.keys(bettingSession.bets).length === 0) {
                await sentMessage.edit({ 
                    content: '❌ Không có ai đặt cược. Phiên bị hủy!',
                    embeds: [],
                    components: []
                }).catch(() => {});
                bettingSession = null;
                database.activeBettingSession = null;
                saveDB();
                return;
            }
            
            console.log(`✅ Bắt đầu animation phiên #${phienNumber}...`);
            await animateResult(sentMessage, client);
        }
    }, 1000);
}

// ===== ANIMATION TÔ BIẾN DẦN =====
async function animateResult(sentMessage, client) {
    try {
        const { dice1, dice2, dice3, total } = rollDice();
        const result = checkResult(total);
        const isJackpot = checkJackpot(dice1, dice2, dice3);
        const phienNumber = bettingSession.phienNumber;
        
        console.log(`🎲 Phiên #${phienNumber}: ${dice1}-${dice2}-${dice3} = ${total}`);
        
        // Frame 1: Tô đè hoàn toàn (0%)
        const frame1 = createBowlLift(dice1, dice2, dice3, 0);
        if (frame1) {
            const embed2 = new EmbedBuilder()
                .setTitle(`🎲 PHIÊN #${phienNumber} - TÔ ĐANG NÂNG LÊN...`)
                .setColor('#f39c12')
                .setDescription('👀 **Chuẩn bị xem kết quả!**')
                .setImage('attachment://lift.png')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed2], 
                files: [new AttachmentBuilder(frame1, { name: 'lift.png' })],
                components: []
            }).catch(() => {});
        }
        await sleep(500);
        
        // Frame 2-5: Animation tô nâng dần
        for (let i = 25; i <= 100; i += 25) {
            const frame = createBowlLift(dice1, dice2, dice3, i);
            if (frame) {
                await sentMessage.edit({ 
                    files: [new AttachmentBuilder(frame, { name: 'lift.png' })]
                }).catch(() => {});
            }
            await sleep(400);
        }
        
        // Hiển thị kết quả
        const frame5 = createBowlLift(dice1, dice2, dice3, 100);
        if (frame5) {
            const embed3 = new EmbedBuilder()
                .setTitle(isJackpot ? `🎰💥 PHIÊN #${phienNumber} - NỔ HŨ!!! 💥🎰` : `🎲 PHIÊN #${phienNumber} - XÚC XẮC ĐÃ LỘ!`)
                .setColor(isJackpot ? '#FFD700' : '#3498db')
                .setDescription(`
🎯 **${dice1} - ${dice2} - ${dice3} = ${total}**
**${result.tai ? '🔴 TÀI' : '🔵 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**

${isJackpot ? '🎰🎰🎰 **BA CON GIỐNG NHAU!!!** 🎰🎰🎰' : ''}
                `)
                .setImage('attachment://lift.png')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed3], 
                files: [new AttachmentBuilder(frame5, { name: 'lift.png' })]
            }).catch(() => {});
        }
        await sleep(1500);
        
        // ===== TÍNH TOÁN KẾT QUẢ =====
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
        
        // ===== KẾT QUẢ CUỐI =====
        const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(isJackpot ? `🎰💥💥 PHIÊN #${phienNumber} - NỔ HŨ!!! 💥💥🎰` : `🎊 KẾT QUẢ PHIÊN #${phienNumber}`)
            .setColor(isJackpot ? '#FFD700' : (result.tai ? '#e74c3c' : '#3498db'));
        
        let files = [];
        let embedDescription = '';
        
        if (diceBuffer && Buffer.isBuffer(diceBuffer) && diceBuffer.length > 0) {
            embedDescription = `
**⇒ Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**

**🎯 Chung cuộc: ${result.tai ? '🔴 TÀI' : '🔵 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**

${isJackpot ? '\n🎰🎰🎰 **NỔ HŨ!!! BA XÚC XẮC TRÙNG NHAU!!!** 🎰🎰🎰\n' : ''}
${isJackpot && jackpotWinners.length === 0 ? '⚠️ **Không có người thắng - Hũ tiếp tục tăng!**\n' : ''}
            `;
            
            resultEmbed.setDescription(embedDescription);
            resultEmbed.setImage('attachment://dice.png');
            files.push(new AttachmentBuilder(diceBuffer, { name: 'dice.png' }));
            
        } else {
            embedDescription = `
🎲 **${dice1}  ${dice2}  ${dice3}**

**⇒ Tổng: ${total} điểm**
**🎯 ${result.tai ? '🔴 TÀI' : '🔵 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**

${isJackpot ? '\n🎰 **NỔ HŨ!!! BA XÚC XẮC TRÙNG NHAU!!!** 🎰\n' : ''}
            `;
            
            resultEmbed.setDescription(embedDescription);
        }
        
        if (isJackpot && jackpotWinners.length > 0) {
            resultEmbed.addFields({
                name: '🎰💎 JACKPOT - CHỈ NGƯỜI THẮNG NHẬN! 💎🎰',
                value: jackpotWinners.join('\n'),
                inline: false
            });
        }
        
        resultEmbed.addFields(
            { 
                name: '✅ NGƯỜI THẮNG', 
                value: winners.length > 0 ? winners.join('\n') : '_Không có ai thắng_',
                inline: false
            },
            { 
                name: '❌ NGƯỜI THUA', 
                value: losers.length > 0 ? losers.join('\n') : '_Không có ai thua_',
                inline: false
            },
            {
                name: '💎 Hũ hiện tại',
                value: `**${(database.jackpot || 0).toLocaleString('en-US')}** Mcoin`,
                inline: true
            },
            {
                name: '👥 Tổng người chơi',
                value: `**${Object.keys(bettingSession.bets).length}** người`,
                inline: true
            },
            {
                name: '🎯 Phiên số',
                value: `#${phienNumber}`,
                inline: true
            }
        );
        
        resultEmbed.setFooter({ text: isJackpot ? 'NỔ HŨ, LÊN ĐỈNH NÀO! 🎰' : 'Hẹn gặp lại lần sau nhé ^_^' });
        resultEmbed.setTimestamp();
        
        try {
            await sentMessage.edit({ 
                content: isJackpot ? '**🎰💥 TRÚNG ĐẠI JACKPOT!!! 💥🎰**' : `**🎊 PHIÊN #${phienNumber} ĐÃ KẾT THÚC**`, 
                embeds: [resultEmbed],
                files: files,
                components: []
            });
            console.log(`✅ Phiên #${phienNumber} hoàn tất!`);
            
        } catch (editError) {
            console.error('❌ Edit error:', editError.message);
            try {
                await sentMessage.channel.send({
                    content: `**🎊 PHIÊN #${phienNumber} ĐÃ KẾT THÚC**`,
                    embeds: [resultEmbed],
                    files: files
                });
            } catch (sendError) {
                console.error('❌ Send error:', sendError.message);
            }
        }
        
        bettingSession = null;
        database.activeBettingSession = null;
        saveDB();
        
    } catch (error) {
        console.error('❌ Lỗi animation:', error);
        bettingSession = null;
        database.activeBettingSession = null;
        saveDB();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Lệnh: .sc hoặc .soicau
async function handleSoiCau(message) {
    const chartBuffer = createHistoryChart(database.history);
    
    if (!chartBuffer) {
        return message.reply('❌ Không thể tạo biểu đồ lịch sử (Canvas lỗi)');
    }
    
    const attachment = new AttachmentBuilder(chartBuffer, { name: 'history.png' });
    
    const embed = new EmbedBuilder()
        .setTitle('📊 Thống kê 20 phiên Tài Xỉu gần nhất:')
        .setColor('#2b2d31')
        .setDescription('**THỐNG KÊ PHIÊN**')
        .setImage('attachment://history.png')
        .setFooter({ text: 'Phân tích dựa trên 20 phiên gần nhất' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed], files: [attachment] });
}

function getBettingSession() {
    return bettingSession;
}

function setBettingSession(session) {
    bettingSession = session;
}

module.exports = {
    handleTaiXiu,
    handleSoiCau,
    getBettingSession,
    setBettingSession
};
