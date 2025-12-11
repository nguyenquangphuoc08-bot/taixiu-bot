// commands/game.js - Bot Tài Xỉu ANIMATION Y CHANG ảnh của bạn

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { getUser, saveUser, addHistory, getHistory, getJackpot, updateJackpot } = require('../utils/database');

let bettingSession = null;

// Emoji xúc xắc đẹp
const DICE_EMOJI = {
    1: '⚀',
    2: '⚁', 
    3: '⚂',
    4: '⚃',
    5: '⚄',
    6: '⚅'
};

function rollDice() {
    return [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ];
}

function checkResult(dice) {
    const sum = dice.reduce((a, b) => a + b, 0);
    return sum >= 11 ? 'TÀI' : 'XỈU';
}

function checkJackpot() {
    return Math.random() < 0.01;
}

// Lệnh: .tx
async function handleTaiXiu(message, client) {
    if (bettingSession && bettingSession.active) {
        return message.reply('⚠️ Đang có phiên cược đang chạy!');
    }
    
    bettingSession = {
        active: true,
        messageId: null,
        channelId: message.channel.id,
        bets: new Map(),
        startTime: Date.now()
    };
    
    const jackpot = await getJackpot();
    
    const embed = new EmbedBuilder()
        .setTitle('🎲 TÀI XỈU - BẮT ĐẦU PHIÊN MỚI!')
        .setColor('#3498db')
        .setDescription(`
**📜 Luật chơi:**
3 xúc xắc, tổng điểm:
• **TÀI**: 11 - 18 điểm
• **XỈU**: 3 - 10 điểm

⏰ **Thời gian cược:** 30 giây
💰 **Tối thiểu:** 1,000 Mcoin
💎 **Tối đa:** 1,000,000,000 Mcoin
🎰 **Jackpot:** ${jackpot.toLocaleString('en-US')} Mcoin
        `)
        .setFooter({ text: 'Click button để đặt cược!' })
        .setTimestamp();
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('bet_tai')
            .setLabel('🔴 TÀI')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('bet_xiu')
            .setLabel('🔵 XỈU')
            .setStyle(ButtonStyle.Primary)
    );
    
    const msg = await message.reply({ embeds: [embed], components: [row] });
    bettingSession.messageId = msg.id;
    
    setTimeout(() => endBettingSession(client), 30000);
}

// ANIMATION GIỐNG ẢNH: Tô úp → Hé → Lật từng xúc xắc
async function endBettingSession(client) {
    if (!bettingSession || !bettingSession.active) return;
    
    const channel = await client.channels.fetch(bettingSession.channelId);
    const message = await channel.messages.fetch(bettingSession.messageId);
    
    if (bettingSession.bets.size === 0) {
        bettingSession.active = false;
        const embed = new EmbedBuilder()
            .setTitle('🎲 TÀI XỈU - KẾT THÚC')
            .setColor('#95a5a6')
            .setDescription('❌ **Không có ai cược!**')
            .setTimestamp();
        await message.edit({ embeds: [embed], components: [] });
        return;
    }
    
    const dice = rollDice();
    const result = checkResult(dice);
    const sum = dice.reduce((a, b) => a + b, 0);
    const isJackpot = checkJackpot();
    
    // ===== FRAME 1: TÔ ÚP (3 giây) =====
    const frame1 = new EmbedBuilder()
        .setTitle('🎲 Đang lắc lắc nè đợi xíu...')
        .setColor('#f39c12')
        .setDescription(`
\`\`\`
╔════════════════════╗
║                    ║
║    🎲 🎲 🎲       ║
║  ══════════════    ║
║                    ║
║    TÔ ÚP...        ║
║                    ║
╚════════════════════╝
\`\`\`

⏳ **Đang lắc xúc xắc...**
        `)
        .setTimestamp();
    
    await message.edit({ embeds: [frame1], components: [] });
    await new Promise(r => setTimeout(r, 3000));
    
    // ===== FRAME 2: HÉ TÔ (2 giây) =====
    const frame2 = new EmbedBuilder()
        .setTitle('🎲 Hé ra xíu nè...')
        .setColor('#f39c12')
        .setDescription(`
\`\`\`
╔════════════════════╗
║                    ║
║    🎲 🎲 🎲       ║
║  ════════════↗️     ║
║                    ║
║   ĐANG MỞ...       ║
║                    ║
╚════════════════════╝
\`\`\`

👀 **Chuẩn bị xem kết quả...**
        `)
        .setTimestamp();
    
    await message.edit({ embeds: [frame2] });
    await new Promise(r => setTimeout(r, 2000));
    
    // ===== FRAME 3: HIỆN XÚC XẮC 1 (0.8 giây) =====
    const frame3 = new EmbedBuilder()
        .setTitle('🎲 TÀI XỈU - KẾT QUẢ')
        .setColor('#e74c3c')
        .setDescription(`
\`\`\`
╔════════════════════╗
║                    ║
║    ${DICE_EMOJI[dice[0]]}   ❓   ❓       ║
║                    ║
╚════════════════════╝
\`\`\`

🎲 **Xúc xắc 1:** ${dice[0]} điểm
        `)
        .setTimestamp();
    
    await message.edit({ embeds: [frame3] });
    await new Promise(r => setTimeout(r, 800));
    
    // ===== FRAME 4: HIỆN XÚC XẮC 2 (0.8 giây) =====
    const frame4 = new EmbedBuilder()
        .setTitle('🎲 TÀI XỈU - KẾT QUẢ')
        .setColor('#e74c3c')
        .setDescription(`
\`\`\`
╔════════════════════╗
║                    ║
║    ${DICE_EMOJI[dice[0]]}   ${DICE_EMOJI[dice[1]]}   ❓       ║
║                    ║
╚════════════════════╝
\`\`\`

🎲 **Xúc xắc 1:** ${dice[0]} điểm
🎲 **Xúc xắc 2:** ${dice[1]} điểm
        `)
        .setTimestamp();
    
    await message.edit({ embeds: [frame4] });
    await new Promise(r => setTimeout(r, 800));
    
    // ===== FRAME 5: HIỆN XÚC XẮC 3 (1 giây) =====
    const frame5 = new EmbedBuilder()
        .setTitle('🎲 TÀI XỈU - KẾT QUẢ')
        .setColor('#e74c3c')
        .setDescription(`
\`\`\`
╔════════════════════╗
║                    ║
║    ${DICE_EMOJI[dice[0]]}   ${DICE_EMOJI[dice[1]]}   ${DICE_EMOJI[dice[2]]}       ║
║                    ║
╚════════════════════╝
\`\`\`

🎲 **Xúc xắc 1:** ${dice[0]} điểm
🎲 **Xúc xắc 2:** ${dice[1]} điểm
🎲 **Xúc xắc 3:** ${dice[2]} điểm
        `)
        .setTimestamp();
    
    await message.edit({ embeds: [frame5] });
    await new Promise(r => setTimeout(r, 1000));
    
    // ===== TÍNH TOÁN KẾT QUẢ =====
    const winners = [];
    const losers = [];
    let totalWin = 0;
    let totalLose = 0;
    let jackpotWinners = [];
    
    const currentJackpot = await getJackpot();
    
    for (const [userId, bet] of bettingSession.bets) {
        const user = await getUser(userId);
        
        if (bet.choice === result.toLowerCase()) {
            const payout = bet.amount * 2;
            user.balance += payout;
            user.totalWin += payout;
            user.winStreak++;
            user.loseStreak = 0;
            
            if (user.dailyQuests) {
                user.dailyQuests.winGames++;
                user.dailyQuests.playGames++;
            }
            
            if (isJackpot) {
                user.balance += currentJackpot;
                jackpotWinners.push(userId);
            }
            
            winners.push({ id: userId, bet: bet.amount, payout });
            totalWin += payout;
        } else {
            user.totalLose += bet.amount;
            user.loseStreak++;
            user.winStreak = 0;
            
            if (user.dailyQuests) {
                user.dailyQuests.loseGames++;
                user.dailyQuests.playGames++;
            }
            
            losers.push({ id: userId, bet: bet.amount });
            totalLose += bet.amount;
        }
        
        await saveUser(user);
    }
    
    if (isJackpot && jackpotWinners.length > 0) {
        await updateJackpot(0);
    } else {
        await updateJackpot(currentJackpot + Math.floor(totalLose * 0.01));
    }
    
    // ===== FRAME CUỐI: KẾT QUẢ GIỐNG ẢNH =====
    const newJackpot = isJackpot ? 0 : currentJackpot + Math.floor(totalLose * 0.01);
    
    let participantsList = '';
    winners.forEach(w => {
        participantsList += `<@${w.id}> | ${result}: ${w.bet.toLocaleString('en-US')} | ✅(+${w.payout.toLocaleString('en-US')} Mcoin) + 1 🍪\n`;
    });
    losers.forEach(l => {
        const lostBet = result === 'TÀI' ? 'Xỉu' : 'Tài';
        participantsList += `<@${l.id}> | ${lostBet}: ${l.bet.toLocaleString('en-US')} | ❌ + 1 🍪\n`;
    });
    
    const finalEmbed = new EmbedBuilder()
        .setTitle(isJackpot ? '🎰💥 TRÚNG JACKPOT! 💥🎰' : `KẾT QUẢ TÀI XỈU`)
        .setColor(result === 'TÀI' ? '#e74c3c' : '#3498db')
        .setDescription(`
${DICE_EMOJI[dice[0]]} ${DICE_EMOJI[dice[1]]} ${DICE_EMOJI[dice[2]]}

➡️ **Kết quả:** ${dice[0]} + ${dice[1]} + ${dice[2]} = **${sum}**

**Chung cuộc: ${result === 'TÀI' ? 'TÀI' : 'XỈU'} - ${(dice[0] + dice[1] + dice[2]) % 2 === 0 ? 'CHẴN' : 'LẺ'}**

${isJackpot ? `\n🎰 **TRÚNG JACKPOT ${currentJackpot.toLocaleString('en-US')} Mcoin!**\n` : ''}

**HŨ TÀI XỈU**
${newJackpot.toLocaleString('en-US')} Mcoin

**DANH SÁCH THAM GIA**
${participantsList || 'Không có ai tham gia'}
        `)
        .setFooter({ text: 'Chế độ Chậm được bật. 🐌' })
        .setTimestamp();
    
    await message.edit({ embeds: [finalEmbed] });
    
    await addHistory({
        game: 'taixiu',
        result: `${result} (${sum})`,
        dice: dice,
        totalBet: totalLose,
        winners: winners.map(w => w.id),
        losers: losers.map(l => l.id)
    });
    
    bettingSession.active = false;
}

// Lệnh: .lichsu
async function handleLichSu(message) {
    const history = await getHistory(20);
    const txHistory = history.filter(h => h.game === 'taixiu');
    
    if (txHistory.length === 0) {
        return message.reply('📭 Chưa có lịch sử tài xỉu!');
    }
    
    let historyText = '';
    txHistory.forEach((h, index) => {
        historyText += `**${index + 1}.** ${h.result}\n`;
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🎲 LỊCH SỬ TÀI XỈU')
        .setColor('#9b59b6')
        .setDescription(historyText)
        .setFooter({ text: `${txHistory.length} phiên gần nhất` })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

function getBettingSession() {
    return bettingSession;
}

module.exports = {
    handleTaiXiu,
    handleLichSu,
    getBettingSession
};
