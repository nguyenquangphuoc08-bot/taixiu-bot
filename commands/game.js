// commands/game.js - HỆ THỐNG HŨ MỚI (10% vào hũ, nổ theo mốc, chia tỷ lệ)

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart, createBowlLift } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');

let bettingSession = null;

// ===== KHỞI TẠO =====
if (!database.phienCounter) {
    database.phienCounter = 0;
    saveDB();
}

// ===== UTILITY =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanupSession() {
    bettingSession = null;
    database.activeBettingSession = null;
    saveDB();
}

// ===== LỆNH: .tx =====
async function handleTaiXiu(message, client) {
    if (bettingSession) {
        return message.reply('⏳ Đang có phiên cược, vui lòng đợi!');
    }
    
    database.phienCounter++;
    const phienNumber = database.phienCounter;
    saveDB();
    
    bettingSession = {
        channelId: message.channel.id,
        bets: {},
        startTime: Date.now(),
        duration: 30000,
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
        .setTitle(`TÀI XỈU #${phienNumber}`)
        .setColor('#f39c12')
        .setDescription(`
**Tỉ lệ cược**

• **Tài - Xỉu:** x1.9
• **Chẵn - Lẻ:** x1.9
• **Cược số:** x1.9/x2.8/x3.6 (Dựa theo số lượng xúc xắc xuất hiện)
• **Cược tổng:**
  **9 tới 12:** x4.5
  **3 và 18:** x10.8
  **Còn lại:** x6.2

• **Nổ hũ:** Khi 3 xúc xắc trùng nhau
  └ Hũ đạt 100B/200B/300B... → Nổ 100%
  └ Dưới 100B → Nổ ngẫu nhiên theo % hũ
  └ Người thắng nhận theo tỷ lệ tiền cược

• **Mỗi lần cược:** 10% tiền cược vào hũ
        `)
        .addFields(
            { name: '⏰ Thời gian còn lại', value: '**30** giây tới', inline: false }
        )
        .setFooter({ text: 'Hãy chọn cửa và ghi số tiền cược\nKết thúc trong: 30 giây tới' })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('open_bet_menu')
                .setLabel('⚡ Chọn cửa và đặt cược tại đây!')
                .setStyle(ButtonStyle.Success)
        );
    
    const sentMessage = await message.reply({ embeds: [embed], components: [row] });
    bettingSession.messageId = sentMessage.id;
    
    // ===== COUNTDOWN =====
    let timeLeft = 30;
    const countdown = setInterval(async () => {
        timeLeft -= 1;
        
        if (timeLeft > 0) {
            let emoji = '⏰';
            if (timeLeft <= 5) emoji = '🔥';
            else if (timeLeft <= 10) emoji = '⚡';
            else if (timeLeft <= 15) emoji = '⏳';
            
            embed.spliceFields(0, 1, { 
                name: `${emoji} Thời gian còn lại`, 
                value: `**${timeLeft}** giây tới`, 
                inline: false 
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
                cleanupSession();
                return;
            }
            
            await animateResult(sentMessage, client);
        }
    }, 1000);
}

// ===== ANIMATION TÔ NÂNG DẦN =====
async function animateResult(sentMessage, client) {
    try {
        const currentJackpot = database.jackpot || 0;
        let dice1, dice2, dice3, total;
        let isJackpot = false;
        
        // ===== LOGIC NỔ HŨ MỚI =====
        const rollResult = rollDice();
        dice1 = rollResult.dice1;
        dice2 = rollResult.dice2;
        dice3 = rollResult.dice3;
        total = rollResult.total;
        
        const isTriple = checkJackpot(dice1, dice2, dice3);
        
        if (isTriple) {
            // Tính mốc hũ gần nhất (100B, 200B, 300B, ...)
            const jackpotMilestone = Math.ceil(currentJackpot / 100000000000) * 100000000000;
            
            // Nếu đạt mốc 100B/200B/300B... → Nổ 100%
            if (currentJackpot >= jackpotMilestone && jackpotMilestone > 0) {
                isJackpot = true;
                console.log(`🎰 HŨ ĐẠT MỐC ${(jackpotMilestone / 1000000000).toFixed(0)}B! NỔ 100%`);
            } else {
                // Dưới mốc → Nổ ngẫu nhiên theo %
                const jackpotChance = (currentJackpot / 100000000000) * 100; // % so với 100B
                const randomChance = Math.random() * 100;
                
                if (randomChance <= jackpotChance) {
                    isJackpot = true;
                    console.log(`🎰 NỔ HŨ NGẪU NHIÊN! Xác suất: ${jackpotChance.toFixed(1)}%`);
                } else {
                    console.log(`❌ Không nổ. Xác suất: ${jackpotChance.toFixed(1)}%, Roll: ${randomChance.toFixed(1)}%`);
                }
            }
        }
        
        const result = checkResult(total);
        const phienNumber = bettingSession.phienNumber;
        
        // ===== ANIMATION FRAME 1-5: Tô nâng dần =====
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
        
        for (let i = 25; i <= 100; i += 25) {
            const frame = createBowlLift(dice1, dice2, dice3, i);
            if (frame) {
                await sentMessage.edit({ 
                    files: [new AttachmentBuilder(frame, { name: 'lift.png' })]
                }).catch(() => {});
            }
            await sleep(400);
        }
        
        await sleep(1000);
        
        // ===== TÍNH TOÁN KẾT QUẢ =====
        database.history.push({ 
            total, 
            dice1, 
            dice2, 
            dice3, 
            tai: result.tai, 
            timestamp: Date.now() 
        });
        if (database.history.length > 50) database.history.shift();
        
        let participants = [];
        let jackpotWinners = [];
        let totalBetAmount = 0;
        let winnerBets = {}; // { userId: betAmount }
        
        // Tính tổng tiền cược
        for (const [userId, bet] of Object.entries(bettingSession.bets)) {
            totalBetAmount += bet.amount;
        }
        
        // Xử lý từng người chơi
        for (const [userId, bet] of Object.entries(bettingSession.bets)) {
            const user = getUser(userId);
            let win = false;
            let winMultiplier = 0;
            
            // Cập nhật nhiệm vụ
            updateQuest(userId, 2); // Cược 1 lần
            updateQuest(userId, 1, bet.amount); // Cược tổng X tiền
            
            // ===== TÍNH TỶ LỆ CƯỢC =====
            if (bet.type === 'tai' && result.tai) {
                win = true;
                winMultiplier = 1.9;
                user.tai++;
                updateQuest(userId, 4);
            } else if (bet.type === 'xiu' && result.xiu) {
                win = true;
                winMultiplier = 1.9;
                user.xiu++;
                updateQuest(userId, 5);
            } else if (bet.type === 'chan' && result.chan) {
                win = true;
                winMultiplier = 1.9;
                user.chan++;
            } else if (bet.type === 'le' && result.le) {
                win = true;
                winMultiplier = 1.9;
                user.le++;
            }
            else if (bet.type === 'number') {
                let count = 0;
                if (dice1 === bet.value) count++;
                if (dice2 === bet.value) count++;
                if (dice3 === bet.value) count++;
                
                if (count > 0) {
                    win = true;
                    if (count === 1) winMultiplier = 1.9;
                    else if (count === 2) winMultiplier = 2.8;
                    else if (count === 3) winMultiplier = 3.6;
                    user.numberWins = (user.numberWins || 0) + 1;
                }
            }
            else if (bet.type === 'total') {
                if (total === bet.value) {
                    win = true;
                    if (total >= 9 && total <= 12) {
                        winMultiplier = 4.5;
                    } else if (total === 3 || total === 18) {
                        winMultiplier = 10.8;
                    } else {
                        winMultiplier = 6.2;
                    }
                    user.totalWins = (user.totalWins || 0) + 1;
                }
            }
            
            // ===== 10% TIỀN CƯỢC VÀO HŨ =====
            const jackpotAdd = Math.floor(bet.amount * 0.1);
            database.jackpot = (database.jackpot || 0) + jackpotAdd;
            
            if (win) {
                const winAmount = Math.floor(bet.amount * winMultiplier);
                user.balance += winAmount;
                
                // Lưu người thắng để chia hũ
                if (isJackpot) {
                    winnerBets[userId] = bet.amount;
                }
                
                let betTypeDisplay = '';
                if (bet.type === 'tai') betTypeDisplay = 'Tài';
                else if (bet.type === 'xiu') betTypeDisplay = 'Xỉu';
                else if (bet.type === 'chan') betTypeDisplay = 'Chẵn';
                else if (bet.type === 'le') betTypeDisplay = 'Lẻ';
                else if (bet.type === 'number') betTypeDisplay = `Cược số ${bet.value}`;
                else if (bet.type === 'total') betTypeDisplay = `Cược tổng ${bet.value}`;
                
                participants.push(`<@${userId}> | ${betTypeDisplay}: ${bet.amount.toLocaleString('en-US')} | ✅ (+${winAmount.toLocaleString('en-US')} Mcoin)`);
            } else {
                let betTypeDisplay = '';
                if (bet.type === 'tai') betTypeDisplay = 'Tài';
                else if (bet.type === 'xiu') betTypeDisplay = 'Xỉu';
                else if (bet.type === 'chan') betTypeDisplay = 'Chẵn';
                else if (bet.type === 'le') betTypeDisplay = 'Lẻ';
                else if (bet.type === 'number') betTypeDisplay = `Cược số ${bet.value}`;
                else if (bet.type === 'total') betTypeDisplay = `Cược tổng ${bet.value}`;
                
                participants.push(`<@${userId}> | ${betTypeDisplay}: ${bet.amount.toLocaleString('en-US')} | ❌`);
            }
        }
        
        // ===== CHIA HŨ THEO TỶ LỆ TIỀN CƯỢC =====
        if (isJackpot && Object.keys(winnerBets).length > 0) {
            const currentJackpotAmount = database.jackpot || 0;
            let totalWinnerBets = 0;
            
            // Tính tổng tiền cược của người thắng
            for (const amount of Object.values(winnerBets)) {
                totalWinnerBets += amount;
            }
            
            // Chia hũ theo tỷ lệ
            for (const [userId, betAmount] of Object.entries(winnerBets)) {
                const user = getUser(userId);
                const ratio = betAmount / totalWinnerBets; // Tỷ lệ tiền cược
                const jackpotReward = Math.floor(currentJackpotAmount * ratio);
                
                user.balance += jackpotReward;
                user.jackpotWins = (user.jackpotWins || 0) + 1;
                
                jackpotWinners.push(`<@${userId}>: Cược ${betAmount.toLocaleString('en-US')} → +${jackpotReward.toLocaleString('en-US')} 🎰💎`);
            }
            
            database.jackpot = 0; // Reset hũ
        }
        
        saveDB();
        
        // ===== GỬI TIN NHẮN KẾT QUẢ RIÊNG =====
        const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(`KẾT QUẢ TÀI XỈU #${phienNumber}`)
            .setColor('#e74c3c');
        
        let embedDescription = '';
        
        if (diceBuffer && Buffer.isBuffer(diceBuffer) && diceBuffer.length > 0) {
            embedDescription = `
⇒ **Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**

**Chung cuộc: ${result.tai ? 'TÀI' : 'XỈU'} - ${result.chan ? 'CHẴN' : 'LẺ'}**
            `;
            
            resultEmbed.setDescription(embedDescription);
            resultEmbed.setImage('attachment://dice.png');
            
        } else {
            embedDescription = `
🎲 **${dice1}  ${dice2}  ${dice3}**

⇒ **Tổng: ${total} điểm**
**🎯 ${result.tai ? 'TÀI' : 'XỈU'} - ${result.chan ? 'CHẴN' : 'LẺ'}**
            `;
            
            resultEmbed.setDescription(embedDescription);
        }
        
        if (isJackpot && jackpotWinners.length > 0) {
            resultEmbed.addFields({
                name: '🎰💎 JACKPOT - CHIA THEO TỶ LỆ CƯỢC! 💎🎰',
                value: jackpotWinners.join('\n'),
                inline: false
            });
        }
        
        const jackpotCurrent = database.jackpot || 0;
        const nextMilestone = Math.ceil(jackpotCurrent / 100000000000) * 100000000000;
        
        const jackpotDisplay = `
💰 **${jackpotCurrent.toLocaleString('en-US')} Mcoin**
🎯 Mốc tiếp theo: **${nextMilestone.toLocaleString('en-US')} Mcoin** (Nổ 100%)
🎰 10% mỗi cược vào hũ
        `.trim();
        
        resultEmbed.addFields(
            {
                name: 'HŨ TÀI XỈU',
                value: jackpotDisplay,
                inline: false
            }
        );
        
        resultEmbed.addFields(
            { 
                name: 'DANH SÁCH THAM GIA', 
                value: participants.length > 0 ? participants.join('\n') : 'Chưa có ai đặt cược.',
                inline: false
            }
        );
        
        resultEmbed.setTimestamp();
        
        try {
            await sentMessage.channel.send({
                embeds: [resultEmbed],
                files: diceBuffer ? [new AttachmentBuilder(diceBuffer, { name: 'dice.png' })] : []
            });
            
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('open_bet_menu')
                        .setLabel('⚡ Hết thời gian!')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            
            await sentMessage.edit({ 
                components: [disabledRow]
            }).catch(() => {});
            
        } catch (error) {
            console.error('❌ Send result error:', error.message);
        }
        
        cleanupSession();
        
    } catch (error) {
        console.error('❌ Animation error:', error.message);
        cleanupSession();
    }
}

// ===== LỆNH: .sc hoặc .soicau =====
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

// ===== GETTERS/SETTERS =====
function getBettingSession() {
    return bettingSession;
}

function setBettingSession(session) {
    bettingSession = session;
}

// ===== EXPORTS =====
module.exports = {
    handleTaiXiu,
    handleSoiCau,
    getBettingSession,
    setBettingSession,
    cleanupSession,
};
