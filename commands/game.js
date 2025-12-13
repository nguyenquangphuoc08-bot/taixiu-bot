// handlers/game.js - ANIMATION MƯỢT VỚI CANVAS

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart, createBowlCover, createRevealDice } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');

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
        // Emoji thay đổi theo thời gian
        let emoji = '⏰';
        if (timeLeft <= 5) {
            emoji = '🔥';  // 5 giây cuối - cháy
        } else if (timeLeft <= 10) {
            emoji = '⚡';  // 10 giây - sét
        } else if (timeLeft <= 15) {
            emoji = '⏳';  // 15 giây - đồng hồ cát
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
            return;
        }
        
        // Tiếp tục code animation...
        await endBettingSession(client);
    }
}, 1000);
}

// ===== ANIMATION MƯỢT VỚI CANVAS =====
async function animateResult(sentMessage, client) {
    try {
        const { dice1, dice2, dice3, total } = rollDice();
        const result = checkResult(total);
        const isJackpot = checkJackpot(dice1, dice2, dice3);
        
        console.log(`🎲 Animation: ${dice1}-${dice2}-${dice3} = ${total}`);
        
        // ===== FRAME 1: TÔ ÚP ĐANG LẮC (2.5 giây) =====
        const bowlShaking = createBowlCover(0);
        
        if (bowlShaking) {
            const embed1 = new EmbedBuilder()
                .setTitle('🎲 ĐANG LẮC XÚC XẮC...')
                .setColor('#e67e22')
                .setDescription(`
\`\`\`
╔═══════════════════════╗
║  🎰  CASINO  🎰      ║
║                       ║
║   🎲 🎲 🎲           ║
║  ═══════════════      ║
║                       ║
║    ĐÃ GHI CƯỢC!      ║
║    ĐANG LẮC...       ║
║                       ║
╚═══════════════════════╝
\`\`\`

⏳ **Đang lắc xúc xắc... Chờ xíu nhé!**
                `)
                .setImage('attachment://bowl.png')
                .setFooter({ text: 'Hồi hộp chưa? 😱' })
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed1], 
                files: [new AttachmentBuilder(bowlShaking, { name: 'bowl.png' })],
                components: [] 
            }).catch(() => {});
        }
        
        await sleep(2500);
        
        // ===== FRAME 2: BẮT ĐẦU HÉ TÔ (1.5 giây) =====
        const bowlLifting = createBowlCover(50);
        
        if (bowlLifting) {
            const embed2 = new EmbedBuilder()
                .setTitle('🎲 HÉ RA RỒI NÈ... 👀')
                .setColor('#f39c12')
                .setDescription(`
\`\`\`
╔═══════════════════════╗
║                       ║
║   🎲 🎲 🎲     ↗️    ║
║  ═══════════════↗️    ║
║                       ║
║   ĐANG MỞ TÔ...      ║
║                       ║
╚═══════════════════════╝
\`\`\`

👀 **Chuẩn bị xem kết quả nào!**
                `)
                .setImage('attachment://bowl.png')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed2], 
                files: [new AttachmentBuilder(bowlLifting, { name: 'bowl.png' })]
            }).catch(() => {});
        }
        
        await sleep(1500);
        
        // ===== FRAME 3: LẬT XÚC XẮC 1 (1 giây) =====
        const reveal1 = createRevealDice([dice1, 0, 0]);
        
        if (reveal1) {
            const embed3 = new EmbedBuilder()
                .setTitle('🎲 XÚC XẮC THỨ NHẤT!')
                .setColor('#3498db')
                .setDescription(`
🎯 **Con đầu tiên:** ${dice1} điểm
❓ **Con thứ 2:** ???
❓ **Con thứ 3:** ???

⏳ **Đang lật tiếp...**
                `)
                .setImage('attachment://dice.png')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed3], 
                files: [new AttachmentBuilder(reveal1, { name: 'dice.png' })]
            }).catch(() => {});
        }
        
        await sleep(1000);
        
        // ===== FRAME 4: LẬT XÚC XẮC 2 (1 giây) =====
        const reveal2 = createRevealDice([dice1, dice2, 0]);
        
        if (reveal2) {
            const embed4 = new EmbedBuilder()
                .setTitle('🎲 XÚC XẮC THỨ HAI!')
                .setColor('#3498db')
                .setDescription(`
🎯 **Con thứ 1:** ${dice1} điểm
🎯 **Con thứ 2:** ${dice2} điểm
❓ **Con thứ 3:** ???

📊 **Tổng tạm:** ${dice1 + dice2} điểm
${dice1 + dice2 >= 11 ? '💭 *Có thể Tài đây...*' : '💭 *Có thể Xỉu đây...*'}

⏳ **Lật con cuối nào!**
                `)
                .setImage('attachment://dice.png')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed4], 
                files: [new AttachmentBuilder(reveal2, { name: 'dice.png' })]
            }).catch(() => {});
        }
        
        await sleep(1000);
        
        // ===== FRAME 5: LẬT XÚC XẮC 3 - HỒI HỘP (1.5 giây) =====
        const reveal3 = createRevealDice([dice1, dice2, dice3]);
        
        if (reveal3) {
            const embed5 = new EmbedBuilder()
                .setTitle(isJackpot ? '🎰💥 NỔ HŨ RỒI NÈ!!! 💥🎰' : '🎲 XÚC XẮC THỨ BA!')
                .setColor(isJackpot ? '#FFD700' : '#3498db')
                .setDescription(`
🎯 **Con thứ 1:** ${dice1} điểm
🎯 **Con thứ 2:** ${dice2} điểm
🎯 **Con thứ 3:** ${dice3} điểm

📊 **TỔNG:** ${total} điểm
${isJackpot ? '\n🎰🎰🎰 **BA CON GIỐNG NHAU - NỔ HŨ!!!** 🎰🎰🎰' : ''}

⏳ **Đang tính toán kết quả...**
                `)
                .setImage('attachment://dice.png')
                .setFooter({ text: isJackpot ? 'TRÚNG JACKPOT RỒI!!!' : 'Chờ xíu...' })
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed5], 
                files: [new AttachmentBuilder(reveal3, { name: 'dice.png' })]
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
        
        // ===== FRAME CUỐI: KẾT QUẢ (DÙNG CANVAS ĐẸP) =====
        const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(isJackpot ? '🎰💥💥 NỔ HŨ!!! 💥💥🎰' : `🎊 KẾT QUẢ TÀI XỈU #${bettingSession.phienNumber}`)
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
            // Fallback nếu Canvas lỗi
            embedDescription = `
🎲 **${dice1}  ${dice2}  ${dice3}**

**⇒ Tổng: ${total} điểm**
**🎯 ${result.tai ? '🔴 TÀI' : '🔵 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**

${isJackpot ? '\n🎰 **NỔ HŨ!!! BA XÚC XẮC TRÙNG NHAU!!!** 🎰\n' : ''}
            `;
            
            resultEmbed.setDescription(embedDescription);
        }
        
        // Thêm Jackpot winners
        if (isJackpot && jackpotWinners.length > 0) {
            resultEmbed.addFields({
                name: '🎰💎 JACKPOT - CHỈ NGƯỜI THẮNG NHẬN! 💎🎰',
                value: jackpotWinners.join('\n'),
                inline: false
            });
        }
        
        // Thêm winners & losers
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
            }
        );
        
        resultEmbed.setFooter({ text: isJackpot ? 'Chúc mừng người trúng Jackpot! 🎰' : 'Chúc may mắn lần sau!' });
        resultEmbed.setTimestamp();
        
        // GỬI KẾT QUẢ
        try {
            await sentMessage.edit({ 
                content: isJackpot ? '**🎰💥 TRÚNG ĐẠI JACKPOT!!! 💥🎰**' : '**🎊 PHIÊN ĐÃ KẾT THÚC**', 
                embeds: [resultEmbed],
                files: files,
                components: []
            });
            console.log('✅ Animation hoàn tất!');
            
        } catch (editError) {
            console.error('❌ Edit error:', editError.message);
            try {
                await sentMessage.channel.send({
                    content: '**🎊 PHIÊN ĐÃ KẾT THÚC**',
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

