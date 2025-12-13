const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart, createDiceBowlImage } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');

let bettingSession = null;

// Emoji xúc xắc
const DICE_EMOJI = {
    1: '⚀',
    2: '⚁',
    3: '⚂',
    4: '⚃',
    5: '⚄',
    6: '⚅'
};

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
        timeLeft -= 5;
        
        if (timeLeft > 0) {
            embed.spliceFields(0, 1, { name: '⏰ Thời gian còn lại', value: `${timeLeft} giây`, inline: true });
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
            
            // Bắt đầu animation với tô úp
            await animateDiceReveal(sentMessage, client);
        }
    }, 5000);
}

// ANIMATION: Tô úp → Lật từng xúc xắc như casino
async function animateDiceReveal(sentMessage, client) {
    try {
        const { dice1, dice2, dice3, total } = rollDice();
        const result = checkResult(total);
        const isJackpot = checkJackpot(dice1, dice2, dice3);
        
        // ===== FRAME 1: TÔ ĐẬY KÍN (2 giây) =====
        const bowlClosed = createDiceBowlImage('closed');
        
        const frame1 = new EmbedBuilder()
            .setTitle('🎲 ĐANG LẮC XÚC XẮC...')
            .setColor('#8B4513')
            .setDescription('🔊 **Sột soạt sột soạt...**\n⏳ Đang lắc mạnh nè!')
            .setImage('attachment://bowl.png')
            .setTimestamp();
        
        await sentMessage.edit({ 
            embeds: [frame1], 
            files: [new AttachmentBuilder(bowlClosed, { name: 'bowl.png' })],
            components: [] 
        });
        await sleep(2000);
        
        // ===== FRAME 2: BẮT ĐẦU HÉ (1.5 giây) =====
        const bowlOpening = createDiceBowlImage('opening');
        
        const frame2 = new EmbedBuilder()
            .setTitle('🎲 ĐANG MỞ TÔ...')
            .setColor('#A0522D')
            .setDescription('👀 **Hé ra xíu thôi...**\n✨ Chuẩn bị xem!')
            .setImage('attachment://bowl.png')
            .setTimestamp();
        
        await sentMessage.edit({ 
            embeds: [frame2],
            files: [new AttachmentBuilder(bowlOpening, { name: 'bowl.png' })]
        });
        await sleep(1500);
        
        // ===== FRAME 3: THẤY XÚC XẮC 1 (1 giây) =====
        const dice1Img = createDiceBowlImage('reveal1', dice1);
        
        const frame3 = new EmbedBuilder()
            .setTitle('🎲 CON THỨ NHẤT...')
            .setColor('#3498db')
            .setDescription(`
${DICE_EMOJI[dice1]} **Xúc xắc 1: ${dice1}**

❓ Xúc xắc 2: ???
❓ Xúc xắc 3: ???
            `)
            .setImage('attachment://bowl.png')
            .setTimestamp();
        
        await sentMessage.edit({ 
            embeds: [frame3],
            files: [new AttachmentBuilder(dice1Img, { name: 'bowl.png' })]
        });
        await sleep(1000);
        
        // ===== FRAME 4: THẤY XÚC XẮC 2 (1 giây) =====
        const dice2Img = createDiceBowlImage('reveal2', dice1, dice2);
        
        const frame4 = new EmbedBuilder()
            .setTitle('🎲 CON THỨ HAI...')
            .setColor('#3498db')
            .setDescription(`
${DICE_EMOJI[dice1]} **Xúc xắc 1: ${dice1}**
${DICE_EMOJI[dice2]} **Xúc xắc 2: ${dice2}**

❓ Xúc xắc 3: ???

📊 **Tổng tạm:** ${dice1 + dice2}
            `)
            .setImage('attachment://bowl.png')
            .setTimestamp();
        
        await sentMessage.edit({ 
            embeds: [frame4],
            files: [new AttachmentBuilder(dice2Img, { name: 'bowl.png' })]
        });
        await sleep(1000);
        
        // ===== FRAME 5: THẤY XÚC XẮC 3 (1.5 giây) =====
        const dice3Img = createDiceBowlImage('reveal3', dice1, dice2, dice3);
        
        const frame5 = new EmbedBuilder()
            .setTitle(isJackpot ? '🎰 NỔ HŨ RỒI!!!' : '🎲 ĐỦ CẢ BA CON!')
            .setColor(isJackpot ? '#FFD700' : '#2ecc71')
            .setDescription(`
${DICE_EMOJI[dice1]} **Xúc xắc 1: ${dice1}**
${DICE_EMOJI[dice2]} **Xúc xắc 2: ${dice2}**
${DICE_EMOJI[dice3]} **Xúc xắc 3: ${dice3}**

📊 **Tổng: ${total}**
${isJackpot ? '\n🎰💥 **3 CON GIỐNG NHAU!!!** 💥🎰' : ''}
            `)
            .setImage('attachment://bowl.png')
            .setTimestamp();
        
        await sentMessage.edit({ 
            embeds: [frame5],
            files: [new AttachmentBuilder(dice3Img, { name: 'bowl.png' })]
        });
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
        
        // ===== FRAME CUỐI: KẾT QUẢ CHÍNH THỨC =====
        const finalDiceImg = createDiceImageSafe(dice1, dice2, dice3);
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(isJackpot ? '🎰💥 TRÚNG ĐẬC!!! 💥🎰' : `🎲 KẾT QUẢ #${bettingSession.phienNumber}`)
            .setColor(isJackpot ? '#FFD700' : (result.tai ? '#3498db' : '#e74c3c'))
            .setDescription(`
**⇒ ${dice1} + ${dice2} + ${dice3} = ${total}**
**${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**
${isJackpot ? '\n🎰 **BA CON TRÙNG NHAU - NỔ HŨ!!!** 🎰' : ''}
            `);
        
        let files = [];
        
        if (finalDiceImg && Buffer.isBuffer(finalDiceImg)) {
            resultEmbed.setImage('attachment://dice.png');
            files.push(new AttachmentBuilder(finalDiceImg, { name: 'dice.png' }));
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
        
        await sentMessage.edit({ 
            content: '**🎊 PHIÊN KẾT THÚC**', 
            embeds: [resultEmbed],
            files: files
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
        return message.reply('❌ Không thể tạo biểu đồ lịch sử (Canvas lỗi)');
    }
    
    const attachment = new AttachmentBuilder(chartBuffer, { name: 'history.png' });
    
    const embed = new EmbedBuilder()
        .setTitle('📊 BIỂU ĐỒ LỊCH SỬ')
        .setColor('#9b59b6')
        .setImage('attachment://history.png')
        .setFooter({ text: 'Xanh = Tài | Đỏ = Xỉu' })
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
    handleLichSu,
    getBettingSession,
    setBettingSession
};
