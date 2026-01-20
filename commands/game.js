// commands/game.js - ĐÃ SỬA (Bỏ hiển thị 100% nổ hũ & Nổ ở 1000b)

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
    
    // ✅✅✅ CHỖ NÀY CẦN SỬA - THÊM duration: 30000 ✅✅✅
    bettingSession = {
        channelId: message.channel.id,
        bets: {},
        startTime: Date.now(),
        duration: 30000, // ← THÊM DÒNG NÀY
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
🎯 **Cược Số** (1-6) | 📊 **Cược Tổng** (3-18)

**Tỷ lệ:**
✅ Tài/Xỉu/Chẵn/Lẻ: **x1.9**
🎯 Cược Số đúng: **x3**
📊 Cược Tổng đúng: **x5**
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
    
    // ✅ CHỈ 1 NÚT DUY NHẤT
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
        
        // ✅ LOGIC NỔ HŨ: Nổ khi đạt 1000 tỷ (1000000000000)
        if (currentJackpot >= 1000000000000) {
            const forcedNumber = Math.floor(Math.random() * 6) + 1;
            dice1 = dice2 = dice3 = forcedNumber;
            total = dice1 + dice2 + dice3;
            isJackpot = true;
            
            console.log(`🎰 HŨ ĐẦY 1000 TỶ! ÉP 3 XÚC XẮC: ${dice1}-${dice2}-${dice3}`);
        } 
        else {
            const rollResult = rollDice();
            dice1 = rollResult.dice1;
            dice2 = rollResult.dice2;
            dice3 = rollResult.dice3;
            total = rollResult.total;
            
            // Kiểm tra có 3 xúc xắc giống nhau không
            const isTriple = checkJackpot(dice1, dice2, dice3);
            
            if (isTriple) {
                // Xác suất nổ = (Hũ hiện tại / 1000 tỷ) * 100%
                const jackpotChance = (currentJackpot / 1000000000000) * 100;
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
        
        // ===== FRAME 1: Tô đè hoàn toàn (0%) =====
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
        
        // ===== FRAME 2-5: Animation tô nâng dần =====
        for (let i = 25; i <= 100; i += 25) {
            const frame = createBowlLift(dice1, dice2, dice3, i);
            if (frame) {
                await sentMessage.edit({ 
                    files: [new AttachmentBuilder(frame, { name: 'lift.png' })]
                }).catch(() => {});
            }
            await sleep(400);
        }
        
        // ===== FRAME 6: Kết quả lộ hoàn toàn =====
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
        
        for (const [userId, bet] of Object.entries(bettingSession.bets)) {
            const user = getUser(userId);
            let win = false;
            let winMultiplier = 1.9;
            
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
            else if (bet.type === 'number') {
                if (dice1 === bet.value || dice2 === bet.value || dice3 === bet.value) {
                    win = true;
                    winMultiplier = 3;
                    user.numberWins = (user.numberWins || 0) + 1;
                }
            }
            else if (bet.type === 'total') {
                if (total === bet.value) {
                    win = true;
                    winMultiplier = 5;
                    user.totalWins = (user.totalWins || 0) + 1;
                }
            }
            
            const jackpotAdd = Math.floor(bet.amount * 2 / 3);
            database.jackpot = (database.jackpot || 0) + jackpotAdd;
            
            if (win) {
                const winAmount = Math.floor(bet.amount * winMultiplier);
                user.balance += winAmount;
                
                updateQuest(userId, 2);
                
                if (isJackpot) {
                    const currentJackpot = database.jackpot || 0;
                    const jackpotAmount = currentJackpot * 20;
                    user.balance += jackpotAmount;
                    user.jackpotWins++;
                    jackpotWinners.push(`<@${userId}>: +${jackpotAmount.toLocaleString('en-US')} 🎰💎`);
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
        
        if (isJackpot && jackpotWinners.length > 0) {
            database.jackpot = 0;
        }
        
        saveDB();
        
        // ===== EMBED KẾT QUẢ CUỐI =====
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
                name: '📋 DANH SÁCH THAM GIA', 
                value: participants.length > 0 ? participants.join('\n') : '_Không có ai tham gia_',
                inline: false
            }
        );
        
        // ✅ BỎ PHẦN HIỂN THỊ % NỔ HŨ - CHỈ HIỂN THỊ SỐ TIỀN HŨ
        const jackpotCurrent = database.jackpot || 0;
        
        const jackpotDisplay = `
💎 **HŨ TÀI XỈU**
💰 **${jackpotCurrent.toLocaleString('en-US')} Mcoin**
🎰 Nổ khi 3 xúc xắc trùng nhau!
        `.trim();
        
        resultEmbed.addFields(
            {
                name: '━━━━━━━━━━━━━━━━━━━━',
                value: jackpotDisplay,
                inline: false
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
                components: []
            }).catch(() => {});
            
            await sentMessage.channel.send({
                content: isJackpot ? '**🎰💥 TRÚNG ĐẠI JACKPOT!!! 💥🎰**' : `**🎊 KẾT QUẢ TÀI XỈU #${phienNumber}**`,
                embeds: [resultEmbed],
                files: files
            });
            
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
    setBettingSession
};

