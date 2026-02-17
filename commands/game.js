// commands/game.js - VIP BONUS TIỀN THẮNG

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart, createBowlLift } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');
const { VIP_ITEMS } = require('./shop');

let bettingSession = null;

if (!database.phienCounter) {
    database.phienCounter = 0;
    saveDB();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanupSession() {
    bettingSession = null;
    database.activeBettingSession = null;
    saveDB();
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getVipIcon(vipLevel) {
    if (!vipLevel || vipLevel === 0) return '';
    const vipItem = VIP_ITEMS[`vip${vipLevel}`];
    return vipItem ? vipItem.icon : '⭐';
}

async function handleTaiXiu(message, client) {
    if (bettingSession) {
        return message.reply('⏳ Đang có phiên cược!');
    }
    
    database.phienCounter++;
    const phienNumber = database.phienCounter;
    saveDB();
    
    const jackpotDisplay = formatNumber(database.jackpot || 0);
    
    const jackpotEmbed = new EmbedBuilder()
        .setTitle('🎰 HŨ TÀI XỈU')
        .setColor('#FFD700')
        .setDescription(`💰 **${jackpotDisplay}**`)
        .setFooter({ text: 'Nổ khi 3 xúc xắc trùng nhau!' })
        .setTimestamp();
    
    await message.channel.send({ embeds: [jackpotEmbed] });
    
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
    
    const embed = new EmbedBuilder()
        .setTitle(`TÀI XỈU #${phienNumber}`)
        .setColor('#f39c12')
        .setDescription(`
**Tỉ lệ cược**

• **Tài - Xỉu:** x1.9
• **Chẵn - Lẻ:** x1.9
• **Cược số:** x1.9/x2.8/x3.6
• **Cược tổng:**
  **9-12:** x4.5
  **3&18:** x10.8
  **Còn lại:** x6.2

• **Nổ hũ:** Khi 3 xúc xắc trùng nhau
        `)
        .addFields(
            { name: '🕐 Thời gian còn lại', value: '**30** giây', inline: false }
        )
        .setFooter({ text: 'Chọn cửa và đặt cược' })
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
    
    let timeLeft = 30;
    const countdown = setInterval(async () => {
        timeLeft -= 1;
        
        if (timeLeft > 0) {
            embed.spliceFields(0, 1, { 
                name: `🕐 Thời gian còn lại`, 
                value: `**${timeLeft}** giây`, 
                inline: false 
            });
            
            await sentMessage.edit({ embeds: [embed], components: [row] }).catch(() => {});
            
        } else {
            clearInterval(countdown);
            
            row.components.forEach(btn => btn.setDisabled(true));
            await sentMessage.edit({ components: [row] }).catch(() => {});
            
            if (Object.keys(bettingSession.bets).length === 0) {
                await sentMessage.edit({ 
                    content: '❌ Không có ai đặt cược!',
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

async function animateResult(sentMessage, client) {
    try {
        const currentJackpot = database.jackpot || 0;
        let dice1, dice2, dice3, total;
        let isJackpot = false;
        
        const rollResult = rollDice();
        dice1 = rollResult.dice1;
        dice2 = rollResult.dice2;
        dice3 = rollResult.dice3;
        total = rollResult.total;
        
        const isTriple = checkJackpot(dice1, dice2, dice3);
        
        if (isTriple) {
            const jackpotMilestone = Math.ceil(currentJackpot / 100000000000) * 100000000000;
            
            if (currentJackpot >= jackpotMilestone && jackpotMilestone > 0) {
                isJackpot = true;
            } else {
                const jackpotChance = (currentJackpot / 100000000000) * 100;
                const randomChance = Math.random() * 100;
                
                if (randomChance <= jackpotChance) {
                    isJackpot = true;
                }
            }
        }
        
        const result = checkResult(total);
        const phienNumber = bettingSession.phienNumber;
        
        const frame1 = createBowlLift(dice1, dice2, dice3, 0);
        if (frame1) {
            const embed2 = new EmbedBuilder()
                .setTitle(`🎲 PHIÊN #${phienNumber} - TÔ ĐANG NÂNG...`)
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
        let totalWinnerBets = 0;
        let winnerBets = {};
        
        for (const [userId, bet] of Object.entries(bettingSession.bets)) {
            const user = getUser(userId);
            let win = false;
            let winMultiplier = 0;
            
            updateQuest(userId, 2);
            updateQuest(userId, 1, bet.amount);
            
            if (bet.type === 'tai' && result.tai) {
                win = true;
                winMultiplier = 1.9;
                user.tai++;
            } else if (bet.type === 'xiu' && result.xiu) {
                win = true;
                winMultiplier = 1.9;
                user.xiu++;
            } else if (bet.type === 'chan' && result.chan) {
                win = true;
                winMultiplier = 1.9;
                user.chan++;
            } else if (bet.type === 'le' && result.le) {
                win = true;
                winMultiplier = 1.9;
                user.le++;
            } else if (bet.type === 'number') {
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
            } else if (bet.type === 'total') {
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
            
            const jackpotAdd = Math.floor(bet.amount * 0.1);
            database.jackpot = (database.jackpot || 0) + jackpotAdd;
            
            const vipIcon = getVipIcon(user.vipLevel);
            const vipDisplay = vipIcon ? `${vipIcon} | ` : '';
            
            let betTypeDisplay = '';
            if (bet.type === 'tai') betTypeDisplay = 'Tài';
            else if (bet.type === 'xiu') betTypeDisplay = 'Xỉu';
            else if (bet.type === 'chan') betTypeDisplay = 'Chẵn';
            else if (bet.type === 'le') betTypeDisplay = 'Lẻ';
            else if (bet.type === 'number') betTypeDisplay = `Số ${bet.value}`;
            else if (bet.type === 'total') betTypeDisplay = `Tổng ${bet.value}`;
            
            if (win) {
                // ===== BASE TIỀN THẮNG =====
                let winAmount = Math.floor(bet.amount * winMultiplier);
                
                // ===== VIP BONUS TIỀN THẮNG =====
                if (user.vipLevel && user.vipLevel > 0 && user.vipBonus) {
                    const betBonus = user.vipBonus.betBonus || 0;      // VIP1=5%, VIP10=50%
                    const extraBonus = user.vipBonus.extraBonus || 0;  // VIP5-10: +50%
                    const totalBonusPercent = betBonus + extraBonus;
                    const bonusAmount = Math.floor(winAmount * totalBonusPercent / 100);
                    winAmount += bonusAmount;
                }
                
                user.balance += winAmount;
                
                if (isJackpot) {
                    winnerBets[userId] = bet.amount;
                    totalWinnerBets += bet.amount;
                }
                
                participants.push(`${vipDisplay}<@${userId}> | ${betTypeDisplay}: ${formatNumber(bet.amount)} | ✅ (+${formatNumber(winAmount)})`);
            } else {
                participants.push(`${vipDisplay}<@${userId}> | ${betTypeDisplay}: ${formatNumber(bet.amount)} | ❌`);
            }
        }
        
        if (isJackpot && Object.keys(winnerBets).length > 0) {
            const currentJackpotAmount = database.jackpot || 0;
            
            for (const [userId, betAmount] of Object.entries(winnerBets)) {
                const user = getUser(userId);
                const ratio = betAmount / totalWinnerBets;
                const jackpotReward = Math.floor(currentJackpotAmount * ratio);
                
                user.balance += jackpotReward;
                user.jackpotWins = (user.jackpotWins || 0) + 1;
                
                jackpotWinners.push(`<@${userId}>: +${formatNumber(jackpotReward)} 🎰`);
            }
            
            database.jackpot = 0;
        }
        
        saveDB();
        
        const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
        const hasWinners = participants.some(p => p.includes('✅'));
        const embedColor = hasWinners ? '#2ecc71' : '#e74c3c';
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(`KẾT QUẢ TÀI XỈU #${phienNumber}`)
            .setColor(embedColor);
        
        if (diceBuffer && Buffer.isBuffer(diceBuffer) && diceBuffer.length > 0) {
            resultEmbed.setDescription(`
⇒ **Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**

**Chung cuộc: ${result.tai ? 'TÀI' : 'XỈU'} - ${result.chan ? 'CHẴN' : 'LẺ'}**
            `);
            resultEmbed.setImage('attachment://dice.png');
        } else {
            resultEmbed.setDescription(`
🎲 **${dice1}  ${dice2}  ${dice3}**

⇒ **Tổng: ${total}**
**${result.tai ? 'TÀI' : 'XỈU'} - ${result.chan ? 'CHẴN' : 'LẺ'}**
            `);
        }
        
        if (isJackpot && jackpotWinners.length > 0) {
            resultEmbed.addFields({
                name: '🎰 JACKPOT',
                value: jackpotWinners.join('\n'),
                inline: false
            });
        }
        
        resultEmbed.addFields(
            { name: 'HŨ', value: `💰 ${formatNumber(database.jackpot || 0)}`, inline: false },
            { name: 'DANH SÁCH THAM GIA', value: participants.length > 0 ? participants.join('\n') : 'Chưa có ai.', inline: false }
        );
        
        resultEmbed.setTimestamp();
        
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
        
        await sentMessage.edit({ components: [disabledRow] }).catch(() => {});
        
        cleanupSession();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        cleanupSession();
    }
}

async function handleSoiCau(message) {
    const chartBuffer = createHistoryChart(database.history);
    
    if (!chartBuffer) {
        return message.reply('❌ Không thể tạo biểu đồ');
    }
    
    const attachment = new AttachmentBuilder(chartBuffer, { name: 'history.png' });
    
    const embed = new EmbedBuilder()
        .setTitle('📊 Thống kê 20 phiên gần nhất')
        .setColor('#2b2d31')
        .setImage('attachment://history.png')
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
    setBettingSession,
    cleanupSession,
};

