// commands/game.js - FULL FILE

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart, createBowlCover, createRevealDice, overlayDiceOnGif } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');
const fs = require('fs');

let bettingSession = null;

// Lệnh: .tx
async function handleTaiXiu(message, client) {
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
            
            console.log('✅ Bắt đầu animation...');
            await animateResult(sentMessage, client);
        }
    }, 1000);
}

// ===== ANIMATION MƯỢT VỚI GIF =====
async function animateResult(sentMessage, client) {
    try {
        const { dice1, dice2, dice3, total } = rollDice();
        const result = checkResult(total);
        const isJackpot = checkJackpot(dice1, dice2, dice3);
        
        console.log(`🎲 Animation: ${dice1}-${dice2}-${dice3} = ${total}`);
        
        const gifPath = './assets/taixiu_spin_59026.gif';
        
        if (fs.existsSync(gifPath)) {
            const gifAttachment = new AttachmentBuilder(gifPath, { name: 'animation.gif' });
            
            const embed1 = new EmbedBuilder()
                .setTitle('🎲 ĐANG LẮC XÚC XẮC...')
                .setColor('#e67e22')
                .setDescription('⏳ **Lắc lắc lắc... Đợi đã!** 😱\n\n*GIF đang phát...*')
                .setImage('attachment://animation.gif')
                .setFooter({ text: 'Hồi hộp chưa nào? 🎰' })
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed1], 
                files: [gifAttachment],
                components: [] 
            }).catch(() => {});
            
            await sleep(4000);
            
            const lastFramePath = './assets/taixiu_lastframe.png';
            if (fs.existsSync(lastFramePath)) {
                const finalImage = await overlayDiceOnGif(lastFramePath, dice1, dice2, dice3);
                
                if (finalImage) {
                    const embed2 = new EmbedBuilder()
                        .setTitle(isJackpot ? '🎰💥 NỔ HŨ!!! 💥🎰' : '🎲 KẾT QUẢ!')
                        .setColor(isJackpot ? '#FFD700' : '#3498db')
                        .setDescription(`
🎯 **${dice1} - ${dice2} - ${dice3} = ${total}**
**⇒ ${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**

${isJackpot ? '🎰🎰🎰 **BA CON GIỐNG NHAU - TRÚNG ĐẠI!!!** 🎰🎰🎰' : ''}
                        `)
                        .setImage('attachment://result.png')
                        .setTimestamp();
                    
                    await sentMessage.edit({ 
                        embeds: [embed2], 
                        files: [new AttachmentBuilder(finalImage, { name: 'result.png' })]
                    }).catch(() => {});
                    
                    await sleep(1500);
                    console.log('✅ Đã dùng GIF, bỏ qua hé từng viên');
                }
            }
            
        } else {
            console.warn('⚠️ Không tìm thấy GIF, dùng fallback Canvas');
            const shakePattern = [0, 15, -15, 10, -10, 5, -5, 0];
            
            for (let i = 0; i < shakePattern.length; i++) {
                const bowlShake = createBowlCover(0, shakePattern[i]);
                
                if (bowlShake) {
                    await sentMessage.edit({ 
                        embeds: [new EmbedBuilder()
                            .setTitle('🎲 ĐANG LẮC...')
                            .setColor('#e67e22')
                            .setDescription('⏳ Lắc lắc lắc...')
                            .setImage('attachment://bowl.png')],
                        files: [new AttachmentBuilder(bowlShake, { name: 'bowl.png' })],
                        components: [] 
                    }).catch(() => {});
                }
                await sleep(300);
            }
            
            // Animation hé từng viên
            const reveal1 = createRevealDice([dice1, 0, 0]);
            if (reveal1) {
                await sentMessage.edit({ 
                    embeds: [new EmbedBuilder()
                        .setTitle('🎲 HÉ XÚC XẮC THỨ NHẤT!')
                        .setColor('#3498db')
                        .setDescription(`🎯 **Con đầu:** ${dice1} điểm`)
                        .setImage('attachment://dice.png')],
                    files: [new AttachmentBuilder(reveal1, { name: 'dice.png' })]
                }).catch(() => {});
            }
            await sleep(800);
            
            const reveal2 = createRevealDice([dice1, dice2, 0]);
            if (reveal2) {
                await sentMessage.edit({ 
                    embeds: [new EmbedBuilder()
                        .setTitle('🎲 HÉ XÚC XẮC THỨ HAI!')
                        .setColor('#3498db')
                        .setDescription(`🎯 ${dice1} - ${dice2} - ???`)
                        .setImage('attachment://dice.png')],
                    files: [new AttachmentBuilder(reveal2, { name: 'dice.png' })]
                }).catch(() => {});
            }
            await sleep(800);
            
            const reveal3 = createRevealDice([dice1, dice2, dice3]);
            if (reveal3) {
                await sentMessage.edit({ 
                    embeds: [new EmbedBuilder()
                        .setTitle(isJackpot ? '🎰💥 NỔ HŨ!!! 💥🎰' : '🎲 KẾT QUẢ!')
                        .setColor(isJackpot ? '#FFD700' : '#3498db')
                        .setDescription(`🎯 ${dice1} - ${dice2} - ${dice3} = ${total}`)
                        .setImage('attachment://dice.png')],
                    files: [new AttachmentBuilder(reveal3, { name: 'dice.png' })]
                }).catch(() => {});
            }
            await sleep(1200);
        }
        
        // TÍNH TOÁN KẾT QUẢ
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
                    const jackpotAmount = database.jackpot * 20;
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
        
        // FRAME KẾT QUẢ CUỐI
        const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(isJackpot ? '🎰💥 NỔ HŨ!!! 💥🎰' : `🎊 KẾT QUẢ #${bettingSession.phienNumber}`)
            .setColor(isJackpot ? '#FFD700' : (result.tai ? '#e74c3c' : '#3498db'))
            .setDescription(`
**⇒ Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**
**🎯 ${result.tai ? '🔴 TÀI' : '🔵 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**

${isJackpot ? '🎰🎰🎰 **NỔ HŨ!!!** 🎰🎰🎰\n' : ''}
            `)
            .addFields(
                { name: '✅ THẮNG', value: winners.length > 0 ? winners.join('\n') : '_Không có_', inline: false },
                { name: '❌ THUA', value: losers.length > 0 ? losers.join('\n') : '_Không có_', inline: false },
                { name: '💎 Hũ', value: `${database.jackpot.toLocaleString('en-US')} Mcoin`, inline: true },
                { name: '👥 Người chơi', value: `${Object.keys(bettingSession.bets).length}`, inline: true }
            )
            .setFooter({ text: isJackpot ? 'Chúc mừng trúng Jackpot! 🎰' : 'Chúc may mắn lần sau!' })
            .setTimestamp();
        
        if (diceBuffer) resultEmbed.setImage('attachment://dice.png');
        
        if (isJackpot && jackpotWinners.length > 0) {
            resultEmbed.spliceFields(0, 0, {
                name: '🎰💎 JACKPOT 💎🎰',
                value: jackpotWinners.join('\n'),
                inline: false
            });
        }
        
        await sentMessage.edit({ 
            content: isJackpot ? '**🎰 TRÚNG ĐẠI JACKPOT!!!**' : '**🎊 PHIÊN KẾT THÚC**', 
            embeds: [resultEmbed],
            files: diceBuffer ? [new AttachmentBuilder(diceBuffer, { name: 'dice.png' })] : [],
            components: []
        }).catch(async () => {
            await sentMessage.channel.send({ embeds: [resultEmbed] }).catch(() => {});
        });
        
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

// Lệnh: .lichsu
async function handleLichSu(message) {
    const chartBuffer = createHistoryChart(database.history);
    
    if (!chartBuffer) {
        return message.reply('❌ Không thể tạo biểu đồ lịch sử');
    }
    
    const embed = new EmbedBuilder()
        .setTitle('📊 LỊCH SỬ 20 PHIÊN')
        .setColor('#9b59b6')
        .setImage('attachment://history.png')
        .setFooter({ text: 'Xanh = Tài | Đỏ = Xỉu' })
        .setTimestamp();
    
    await message.reply({ 
        embeds: [embed], 
        files: [new AttachmentBuilder(chartBuffer, { name: 'history.png' })] 
    });
}

function getBettingSession() {
    return bettingSession;
}

function setBettingSession(session) {
    bettingSession = session;
}

module.exports = {
    handleTaiXiu,
    handleLichSu,
    getBettingSession,
    setBettingSession
};
