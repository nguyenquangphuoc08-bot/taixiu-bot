// commands/game.js - GIF tạo trước, gửi sau khi hết giờ

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart } = require('../utils/canvas');
const { createBowlSlideGif } = require('../utils/createBowlGif');
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
        .setDescription(`💰 **${jackpotDisplay}** Mcoin`)
        .setFooter({ text: 'Nổ khi ra bộ ba' });
    
    await message.channel.send({ embeds: [jackpotEmbed] });
    
    // Roll xúc xắc NGAY từ đầu để tạo GIF song song
    const rollResult = rollDice();
    const { dice1, dice2, dice3, total } = rollResult;

    bettingSession = {
        channelId: message.channel.id,
        bets: {},
        startTime: Date.now(),
        duration: 30000,
        messageId: null,
        phienNumber: phienNumber,
        rollResult: rollResult // lưu kết quả đã roll
    };
    
    database.activeBettingSession = {
        channelId: message.channel.id,
        bets: {},
        startTime: Date.now()
    };
    saveDB();

    // Tạo GIF NGAY trong lúc người chơi đặt cược (chạy song song)
    let gifBuffer = null;
    console.log('🎬 Đang tạo GIF...');
    const gifStart = Date.now();
    try {
        gifBuffer = createBowlSlideGif(dice1, dice2, dice3);
        console.log(`✅ GIF tạo xong sau ${Date.now() - gifStart}ms, size: ${gifBuffer ? (gifBuffer.length/1024).toFixed(0)+'KB' : 'null'}`);
    } catch (err) {
        console.error('❌ GIF lỗi:', err.message);
    }
    
    const mainEmbed = new EmbedBuilder()
        .setTitle(`TÀI XỈU #${phienNumber}`)
        .setColor('#f39c12')
        .setDescription(`
**Tỉ lệ cược**

• **Tài - Xỉu:** x1.9
• **Chẵn - Lẻ:** x1.9
• **Cược số:** x1.9/x2.8/x3.6
• **Cược tổng:**
  **9 hoặc 12:** x4.5
  **3 hoặc 18:** x10.8
  **Còn lại:** x6.2

• **Nổ hũ:** Ra bộ ba
        `)
        .addFields({ name: '⏰ Thời gian còn lại', value: '**30** giây', inline: false })
        .setFooter({ text: 'Chọn cửa và đặt cược' });
    
    const last10 = database.history.slice(-10);
    let taiXiuLine = last10.length > 0 ? last10.map(h => h.tai ? '🔵' : '🔴').join('') : '🔵🔴🔵🔴🔵🔴🔵🔴🔵🔴';
    let chanLeLine = last10.length > 0 ? last10.map(h => h.total % 2 === 0 ? '🟣' : '🟡').join('') : '🟣🟡🟣🟡🟣🟡🟣🟡🟣🟡';
    
    const soiCauEmbed = new EmbedBuilder()
        .setTitle('📊 SOI CẦU TÀI XỈU')
        .setColor('#9b59b6')
        .setDescription(`${taiXiuLine}\n━━━━━━━━━━━━━━━━━━━\n${chanLeLine}`);
    
    const tongCuocEmbed = new EmbedBuilder()
        .setTitle('TỔNG CƯỢC')
        .setColor('#3498db')
        .setDescription('**Tài:** 0 | **Xỉu:** 0\n**Chẵn:** 0 | **Lẻ:** 0\n**Số/Tổng:** 0');
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('open_bet_menu')
                .setLabel('⚡ Chọn cửa và đặt cược tại đây!')
                .setStyle(ButtonStyle.Success)
        );
    
    const sentMessage = await message.reply({ 
        embeds: [mainEmbed, soiCauEmbed, tongCuocEmbed], 
        components: [row] 
    });
    
    bettingSession.messageId = sentMessage.id;
    
    let timeLeft = 30;
    const countdown = setInterval(async () => {
        timeLeft -= 1;
        
        if (timeLeft > 0) {
            mainEmbed.spliceFields(0, 1, { 
                name: `⏰ Thời gian còn lại`, 
                value: `**${timeLeft}** giây`, 
                inline: false 
            });
            
            let taiCount = 0, xiuCount = 0, chanCount = 0, leCount = 0, otherCount = 0;
            Object.values(bettingSession.bets).forEach(bet => {
                if (bet.type === 'tai') taiCount++;
                else if (bet.type === 'xiu') xiuCount++;
                else if (bet.type === 'chan') chanCount++;
                else if (bet.type === 'le') leCount++;
                else otherCount++;
            });
            
            tongCuocEmbed.setDescription(
                `**Tài:** ${taiCount} | **Xỉu:** ${xiuCount}\n**Chẵn:** ${chanCount} | **Lẻ:** ${leCount}\n**Số/Tổng:** ${otherCount}`
            );
            
            await sentMessage.edit({ 
                embeds: [mainEmbed, soiCauEmbed, tongCuocEmbed], 
                components: [row] 
            }).catch(() => {});
        } else {
            clearInterval(countdown);
            row.components.forEach(btn => btn.setDisabled(true));
            await sentMessage.edit({ components: [row] }).catch(() => {});
            
            if (Object.keys(bettingSession.bets).length === 0) {
                await sentMessage.edit({ 
                    content: '❌ Không có ai đặt cược!',
                    embeds: [], components: []
                }).catch(() => {});
                cleanupSession();
                return;
            }
            
            await animateResult(sentMessage, client, gifBuffer);
        }
    }, 1000);
}

async function animateResult(sentMessage, client, gifBuffer) {
    try {
        const { dice1, dice2, dice3, total } = bettingSession.rollResult;
        const currentJackpot = database.jackpot || 0;
        let isJackpot = false;
        
        const isTriple = checkJackpot(dice1, dice2, dice3);
        if (isTriple) {
            const jackpotChance = currentJackpot >= 1000000000 ? 70 : 50;
            if (Math.random() * 100 <= jackpotChance) isJackpot = true;
        }
        
        const result = checkResult(total);
        const phienNumber = bettingSession.phienNumber;

        // ===== GỬI GIF (đã tạo sẵn rồi, gửi ngay) =====
        if (gifBuffer && Buffer.isBuffer(gifBuffer) && gifBuffer.length > 0) {
            const gifEmbed = new EmbedBuilder()
                .setTitle(`🎲 PHIÊN #${phienNumber} - ĐANG LẮC TÔ`)
                .setColor('#f39c12')
                .setDescription('🫙 **Tô đang hé từng con xúc xắc...**\n\n*Kết quả chính thức hiện sau GIF*')
                .setImage('attachment://taixiu.gif');

            await sentMessage.edit({
                embeds: [gifEmbed],
                files: [new AttachmentBuilder(gifBuffer, { name: 'taixiu.gif' })],
                components: []
            }).catch(() => {});

            // Chờ GIF chạy xong
            await sleep(20500);

        } else {
            // Fallback: frame tĩnh
            const { createBowlLift } = require('../utils/canvas');
            await sentMessage.edit({
                embeds: [new EmbedBuilder()
                    .setTitle(`🎲 PHIÊN #${phienNumber} - ĐANG LẮC TÔ`)
                    .setColor('#f39c12')
                    .setDescription('🫙 **Đang lắc...**')],
                files: [], components: []
            }).catch(() => {});

            for (let i = 0; i <= 100; i += 25) {
                const frame = createBowlLift(dice1, dice2, dice3, i);
                if (frame) {
                    await sentMessage.edit({
                        files: [new AttachmentBuilder(frame, { name: 'lift.png' })]
                    }).catch(() => {});
                }
                await sleep(400);
            }
            await sleep(800);
        }

        // ===== TÍNH KẾT QUẢ =====
        database.history.push({ total, dice1, dice2, dice3, tai: result.tai, timestamp: Date.now() });
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
            
            if (bet.type === 'tai' && result.tai)        { win = true; winMultiplier = 1.9; user.tai++; }
            else if (bet.type === 'xiu' && result.xiu)   { win = true; winMultiplier = 1.9; user.xiu++; }
            else if (bet.type === 'chan' && result.chan)  { win = true; winMultiplier = 1.9; user.chan++; }
            else if (bet.type === 'le' && result.le)     { win = true; winMultiplier = 1.9; user.le++; }
            else if (bet.type === 'number') {
                let count = [dice1, dice2, dice3].filter(d => d === bet.value).length;
                if (count > 0) {
                    win = true;
                    winMultiplier = count === 1 ? 1.9 : count === 2 ? 2.8 : 3.6;
                    user.numberWins = (user.numberWins || 0) + 1;
                }
            } else if (bet.type === 'total' && total === bet.value) {
                win = true;
                winMultiplier = (total >= 9 && total <= 12) ? 4.5 : (total === 3 || total === 18) ? 10.8 : 6.2;
                user.totalWins = (user.totalWins || 0) + 1;
            }
            
            database.jackpot = (database.jackpot || 0) + Math.floor(bet.amount * 0.1);
            
            const vipIcon    = getVipIcon(user.vipLevel);
            const vipDisplay = vipIcon ? `${vipIcon} | ` : '';
            const betTypeMap = { tai: 'Tài', xiu: 'Xỉu', chan: 'Chẵn', le: 'Lẻ' };
            const betTypeDisplay = betTypeMap[bet.type] || (bet.type === 'number' ? `Số ${bet.value}` : `Tổng ${bet.value}`);
            
            if (win) {
                let winAmount = Math.floor(bet.amount * winMultiplier);
                if (user.vipLevel > 0 && user.vipBonus) {
                    const totalVipBonus = (user.vipBonus.betBonus || 0) + (user.vipBonus.extraBonus || 0);
                    winAmount += Math.floor(winAmount * totalVipBonus / 100);
                }
                const titleBetBonus = user.titleBonus?.betBonus || 0;
                if (titleBetBonus > 0) winAmount += Math.floor(winAmount * titleBetBonus / 100);
                
                user.balance += winAmount;
                if (isJackpot) { winnerBets[userId] = bet.amount; totalWinnerBets += bet.amount; }
                participants.push(`${vipDisplay}<@${userId}> | ${betTypeDisplay}: ${formatNumber(bet.amount)} | ✅ (+${formatNumber(winAmount)})`);
            } else {
                participants.push(`${vipDisplay}<@${userId}> | ${betTypeDisplay}: ${formatNumber(bet.amount)} | ❌`);
            }
        }
        
        if (isJackpot && Object.keys(winnerBets).length > 0) {
            const jackpotPool = database.jackpot || 0;
            for (const [userId, betAmount] of Object.entries(winnerBets)) {
                const user = getUser(userId);
                const ratio       = betAmount / totalWinnerBets;
                let jackpotReward = Math.floor(jackpotPool * ratio);
                const jpBonus     = user.titleBonus?.jackpotBonus || 0;
                if (jpBonus > 0) jackpotReward += Math.floor(jackpotReward * jpBonus / 100);
                user.balance += jackpotReward;
                user.jackpotWins = (user.jackpotWins || 0) + 1;
                jackpotWinners.push(`<@${userId}>: +${formatNumber(jackpotReward)} 🎰`);
            }
            database.jackpot = 0;
        }
        
        saveDB();
        
        // ===== GỬI KẾT QUẢ =====
        const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
        const hasWinners = participants.some(p => p.includes('✅'));
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(`KẾT QUẢ TÀI XỈU #${phienNumber}`)
            .setColor(hasWinners ? '#2ecc71' : '#e74c3c');
        
        if (diceBuffer && Buffer.isBuffer(diceBuffer) && diceBuffer.length > 0) {
            resultEmbed
                .setDescription(`⇒ **Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**\n\n**Chung cuộc: ${result.tai ? 'TÀI' : 'XỈU'} - ${result.chan ? 'CHẴN' : 'LẺ'}**`)
                .setImage('attachment://dice.png');
        } else {
            resultEmbed.setDescription(`🎲 **${dice1}  ${dice2}  ${dice3}**\n\n⇒ **Tổng: ${total}**\n**${result.tai ? 'TÀI' : 'XỈU'} - ${result.chan ? 'CHẴN' : 'LẺ'}**`);
        }
        
        if (isJackpot && jackpotWinners.length > 0) {
            resultEmbed.addFields({ name: '🎰 JACKPOT', value: jackpotWinners.join('\n'), inline: false });
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
        
        await sentMessage.edit({ 
            content: '', embeds: [], files: [],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_bet_menu')
                    .setLabel('⚡ Hết thời gian!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            )]
        }).catch(() => {});
        
        cleanupSession();
        
    } catch (error) {
        console.error('❌ Error animateResult:', error.message);
        cleanupSession();
    }
}

async function handleSoiCau(message) {
    const chartBuffer = createHistoryChart(database.history);
    if (!chartBuffer) return message.reply('❌ Không thể tạo biểu đồ');
    
    const embed = new EmbedBuilder()
        .setTitle('📊 Thống kê 20 phiên gần nhất')
        .setColor('#2b2d31')
        .setImage('attachment://history.png')
        .setTimestamp();
    
    await message.reply({ embeds: [embed], files: [new AttachmentBuilder(chartBuffer, { name: 'history.png' })] });
}

function getBettingSession() { return bettingSession; }
function setBettingSession(session) { bettingSession = session; }

module.exports = { handleTaiXiu, handleSoiCau, getBettingSession, setBettingSession, cleanupSession };
