// commands/game.js - JACKPOT FIX + TOP TRACKING + KC BET

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart, createBowlLift } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');
const { VIP_ITEMS } = require('./shop');

let bettingSession = null;
let forceJackpotNext = false;

function setForceJackpot(val) { forceJackpotNext = val; }

if (!database.phienCounter) { database.phienCounter = 0; saveDB(); }

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

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

function getJackpotChance(jackpot) {
    if (jackpot >= 3_000_000_000) return 100;
    if (jackpot >= 1_000_000_000) return 70;
    return 5;
}

function rollDiceWeighted(jackpot) {
    const face = () => Math.floor(Math.random() * 6) + 1;
    if (jackpot < 1_000_000_000) return rollDice();
    const rand = Math.random() * 100;
    if (rand < 20) { 
        const d = face(); 
        return { dice1: d, dice2: d, dice3: d, total: d * 3 }; 
    }
    if (rand < 60) { 
        const d = face(); 
        const d3 = face(); 
        const arr = [d, d, d3].sort(() => Math.random() - 0.5); 
        return { dice1: arr[0], dice2: arr[1], dice3: arr[2], total: arr[0] + arr[1] + arr[2] }; 
    }
    return rollDice();
}

async function handleTaiXiu(message, client) {
    if (bettingSession) return message.reply('⏳ Đang có phiên cược!');

    database.phienCounter++;
    const phienNumber = database.phienCounter;
    saveDB();

    const jackpotDisplay = formatNumber(database.jackpot || 0);
    await message.channel.send({ 
        embeds: [
            new EmbedBuilder()
                .setTitle('🎰 HŨ TÀI XỈU')
                .setColor('#FFD700')
                .setDescription(`💰 **${jackpotDisplay}** Mcoin`)
                .setFooter({ text: 'Nổ khi ra bộ ba' })
        ] 
    });

    bettingSession = { channelId: message.channel.id, bets: {}, startTime: Date.now(), duration: 30000, messageId: null, phienNumber };
    database.activeBettingSession = { channelId: message.channel.id, bets: {}, startTime: Date.now() };
    saveDB();

    const mainEmbed = new EmbedBuilder()
        .setTitle(`TÀI XỈU #${phienNumber}`)
        .setColor('#f39c12')
        .setDescription(`**Tỉ lệ cược**\n\n• **Tài - Xỉu:** x1.9\n• **Chẵn - Lẻ:** x1.9\n• **Cược số:** x1.9/x2.8/x3.6\n• **Cược tổng:**\n  **9 hoặc 12:** x4.5\n  **3 hoặc 18:** x10.8\n  **Còn lại:** x6.2\n\n• **Nổ hũ:** Ra bộ ba\n• **💎 KC:** Cược độc lập, tỉ lệ x1.9`)
        .addFields({ name: '⏰ Thời gian còn lại', value: '**30** giây', inline: false })
        .setFooter({ text: 'Chọn cửa và đặt cược' });

    const last10 = database.history.slice(-10);
    let taiXiuLine = last10.length > 0 ? last10.map(h => h.tai ? '🔵' : '🔴').join('') : '🔵🔴🔵🔴🔵🔴🔵🔴🔵🔴';
    let chanLeLine = last10.length > 0 ? last10.map(h => h.total % 2 === 0 ? '🟣' : '🟡').join('') : '🟣🟡🟣🟡🟣🟡🟣🟡🟣🟡';

    const soiCauEmbed = new EmbedBuilder().setTitle('📊 SOI CẦU TÀI XỈU').setColor('#9b59b6').setDescription(`${taiXiuLine}\n━━━━━━━━━━━━━━━━━━━\n${chanLeLine}`);
    const tongCuocEmbed = new EmbedBuilder().setTitle('TỔNG CƯỢC').setColor('#3498db').setDescription(`**Tài:** 0 | **Xỉu:** 0\n**Chẵn:** 0 | **Lẻ:** 0\n**Số/Tổng:** 0`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('open_bet_menu').setLabel('⚡ Chọn cửa và đặt cược tại đây!').setStyle(ButtonStyle.Success)
    );

    const sentMessage = await message.reply({ embeds: [mainEmbed, soiCauEmbed, tongCuocEmbed], components: [row] });
    bettingSession.messageId = sentMessage.id;

    let timeLeft = 30;
    const countdown = setInterval(async () => {
        timeLeft--;
        if (timeLeft > 0) {
            mainEmbed.spliceFields(0, 1, { name: '⏰ Thời gian còn lại', value: `**${timeLeft}** giây`, inline: false });
            let taiC = 0, xiuC = 0, chanC = 0, leC = 0, otherC = 0;
            Object.values(bettingSession.bets).forEach(bet => {
                if (bet.type === 'tai') taiC++;
                else if (bet.type === 'xiu') xiuC++;
                else if (bet.type === 'chan') chanC++;
                else if (bet.type === 'le') leC++;
                else otherC++;
            });
            tongCuocEmbed.setDescription(`**Tài:** ${taiC} | **Xỉu:** ${xiuC}\n**Chẵn:** ${chanC} | **Lẻ:** ${leC}\n**Số/Tổng:** ${otherC}`);
            await sentMessage.edit({ embeds: [mainEmbed, soiCauEmbed, tongCuocEmbed], components: [row] }).catch(() => {});
        } else {
            clearInterval(countdown);
            row.components.forEach(btn => btn.setDisabled(true));
            await sentMessage.edit({ components: [row] }).catch(() => {});
            if (Object.keys(bettingSession.bets).length === 0) {
                await sentMessage.edit({ content: '❌ Không có ai đặt cược!', embeds: [], components: [] }).catch(() => {});
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
        const phienNumber = bettingSession.phienNumber;

        let rollResult;
        let forcedJackpot = false;
        if (forceJackpotNext) {
            const d = Math.floor(Math.random() * 6) + 1;
            rollResult = { dice1: d, dice2: d, dice3: d, total: d * 3 };
            forceJackpotNext = false;
            forcedJackpot = true;
        } else {
            rollResult = rollDiceWeighted(currentJackpot);
        }
        const { dice1, dice2, dice3, total } = rollResult;
        const isTriple = checkJackpot(dice1, dice2, dice3);
        let isJackpot = forcedJackpot || (isTriple && Math.random() * 100 < getJackpotChance(currentJackpot));

        const result = checkResult(total);

        // Animation mở bát
        const frame1 = createBowlLift(dice1, dice2, dice3, 0);
        if (frame1) {
            await sentMessage.edit({ 
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`🎲 PHIÊN #${phienNumber} - TÔ ĐANG NÂNG...`)
                        .setColor('#f39c12')
                        .setDescription('👀 **Chuẩn bị xem kết quả!**')
                        .setImage('attachment://lift.png')
                        .setTimestamp()
                ], 
                files: [new AttachmentBuilder(frame1, { name: 'lift.png' })], 
                components: [] 
            }).catch(() => {});
        }
        await sleep(500);
        for (let i = 25; i <= 100; i += 25) {
            const frame = createBowlLift(dice1, dice2, dice3, i);
            if (frame) await sentMessage.edit({ files: [new AttachmentBuilder(frame, { name: 'lift.png' })] }).catch(() => {});
            await sleep(400);
        }
        await sleep(1000);

        database.history.push({ total, dice1, dice2, dice3, tai: result.tai, timestamp: Date.now() });
        if (database.history.length > 50) database.history.shift();

        let participants = [];
        let jackpotWinners = [];
        let jackpotWinnerNames = [];

        for (const [userId, bet] of Object.entries(bettingSession.bets)) {
            const user = getUser(userId);
            let win = false;
            let winMultiplier = 0;

            updateQuest(userId, 2);
            updateQuest(userId, 1, bet.amount || 0);

            if (bet.amount > 0) database.jackpot = (database.jackpot || 0) + Math.floor(bet.amount * 0.05);

            if (bet.type === 'tai' && result.tai)        { win = true; winMultiplier = 1.9; user.tai = (user.tai || 0) + 1; }
            else if (bet.type === 'xiu' && result.xiu)  { win = true; winMultiplier = 1.9; user.xiu = (user.xiu || 0) + 1; }
            else if (bet.type === 'chan' && result.chan) { win = true; winMultiplier = 1.9; user.chan = (user.chan || 0) + 1; }
            else if (bet.type === 'le' && result.le)    { win = true; winMultiplier = 1.9; user.le = (user.le || 0) + 1; }
            else if (bet.type === 'number') {
                let count = [dice1, dice2, dice3].filter(d => d === bet.value).length;
                if (count > 0) { win = true; winMultiplier = count === 1 ? 1.9 : count === 2 ? 2.8 : 3.6; user.numberWins = (user.numberWins || 0) + 1; }
            } else if (bet.type === 'total' && total === bet.value) {
                win = true;
                winMultiplier = (total === 9 || total === 12) ? 4.5 : (total === 3 || total === 18) ? 10.8 : 6.2;
                user.totalWins = (user.totalWins || 0) + 1;
            }

            const vipIcon = getVipIcon(user.vipLevel);
            const vipDisplay = vipIcon ? `${vipIcon} | ` : '';
            let betTypeDisplay = { tai: 'Tài', xiu: 'Xỉu', chan: 'Chẵn', le: 'Lẻ', number: `Số ${bet.value}`, total: `Tổng ${bet.value}` }[bet.type] || bet.type;

            let resultLine = `${vipDisplay}<@${userId}> | ${betTypeDisplay}`;

            if (bet.amount > 0) {
                if (win) {
                    let winAmount = Math.floor(bet.amount * winMultiplier);
                    const totalVipBonus = (user.vipBonus?.betBonus || 0) + (user.vipBonus?.extraBonus || 0);
                    if (totalVipBonus > 0) winAmount += Math.floor(winAmount * totalVipBonus / 100);
                    const titleBetBonus = user.titleBonus?.betBonus || 0;
                    if (titleBetBonus > 0) winAmount += Math.floor(winAmount * titleBetBonus / 100);
                    
                    // Frame bonus (5%)
                    if (user.frame === 'fire' || user.frame === 'green') {
                        winAmount += Math.floor(winAmount * 5 / 100);
                    }
                    user.balance += winAmount;
                    user.txWinningsToday = (user.txWinningsToday || 0) + winAmount;
                    if (isJackpot) jackpotWinners.push(userId);
                    resultLine += ` | 💰${formatNumber(bet.amount)} ✅(+${formatNumber(winAmount)})`;
                } else {
                    resultLine += ` | 💰${formatNumber(bet.amount)} ❌`;
                }
            }

            // Cược Kim Cương (KC)
            if (bet.kcAmount > 0) {
                if (win) {
                    const kcWin = Math.floor(bet.kcAmount * 1.9);
                    user.diamonds = (user.diamonds || 0) + kcWin;
                    resultLine += ` | 💎${bet.kcAmount}KC ✅(+${kcWin}KC)`;
                } else {
                    resultLine += ` | 💎${bet.kcAmount}KC ❌`;
                }
            }

            participants.push(resultLine);
        }

        if (isJackpot && jackpotWinners.length > 0) {
            const jackpotPool = database.jackpot || 0;
            const share = Math.floor(jackpotPool / jackpotWinners.length);
            for (const userId of jackpotWinners) {
                const user = getUser(userId);
                let jackpotReward = share;
                const jackpotBonus = user.titleBonus?.jackpotBonus || 0;
                if (jackpotBonus > 0) jackpotReward += Math.floor(jackpotReward * jackpotBonus / 100);
                user.balance += jackpotReward;
                user.txWinningsToday = (user.txWinningsToday || 0) + jackpotReward;
                user.jackpotWins = (user.jackpotWins || 0) + 1;
                jackpotWinnerNames.push(`<@${userId}>: +${formatNumber(jackpotReward)} 🎰`);
            }
            database.jackpot = 0;
        }

        saveDB();

        const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
        const hasWinners = participants.some(p => p.includes('✅'));
        const embedColor = isJackpot ? '#FFD700' : (hasWinners ? '#2ecc71' : '#e74c3c');

        const resultEmbed = new EmbedBuilder()
            .setTitle(`${isJackpot ? '🎰 NỔ HŨ!! ' : ''}KẾT QUẢ TÀI XỈU #${phienNumber}`)
            .setColor(embedColor);

        if (diceBuffer) {
            resultEmbed.setDescription(`⇒ **Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**\n\n**${result.tai ? 'TÀI' : 'XỈU'} - ${result.chan ? 'CHẴN' : 'LẺ'}**`).setImage('attachment://dice.png');
        } else {
            resultEmbed.setDescription(`🎲 **${dice1}  ${dice2}  ${dice3}**\n⇒ **Tổng: ${total}**\n**${result.tai ? 'TÀI' : 'XỈU'} - ${result.chan ? 'CHẴN' : 'LẺ'}**`);
        }

        if (isJackpot && jackpotWinnerNames.length > 0) {
            resultEmbed.addFields({ name: `🎰 NỔ HŨ! Chia đều cho ${jackpotWinners.length} người thắng`, value: jackpotWinnerNames.join('\n'), inline: false });
        }

        resultEmbed.addFields(
            { name: 'HŨ', value: `💰 ${formatNumber(database.jackpot || 0)}`, inline: false },
            { name: 'DANH SÁCH THAM GIA', value: participants.length > 0 ? participants.join('\n') : 'Chưa có ai.', inline: false }
        ).setTimestamp();

        await sentMessage.channel.send({ embeds: [resultEmbed], files: diceBuffer ? [new AttachmentBuilder(diceBuffer, { name: 'dice.png' })] : [] });
        await sentMessage.edit({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_bet_menu').setLabel('⚡ Hết thời gian!').setStyle(ButtonStyle.Secondary).setDisabled(true))] }).catch(() => {});
        cleanupSession();

    } catch (error) {
        console.error('❌ Error:', error.message);
        cleanupSession();
    }
}

async function handleSoiCau(message) {
    const chartBuffer = createHistoryChart(database.history);
    if (!chartBuffer) return message.reply('❌ Không thể tạo biểu đồ');
    await message.reply({ embeds: [new EmbedBuilder().setTitle('📊 Thống kê 20 phiên gần nhất').setColor('#2b2d31').setImage('attachment://history.png').setTimestamp()], files: [new AttachmentBuilder(chartBuffer, { name: 'history.png' })] });
}

function getBettingSession() { return bettingSession; }
function setBettingSession(session) { bettingSession = session; }

module.exports = { handleTaiXiu, handleSoiCau, setForceJackpot, getBettingSession, setBettingSession, cleanupSession };
