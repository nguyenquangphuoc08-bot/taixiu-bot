const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart, createRevealDice } = require('../utils/canvas');
const { updateQuest } = require('../services/quest');
const fs = require('fs');
const path = require('path');

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
        timeLeft -= 1;  // ← SỬA: Giảm 1 giây thay vì 5
        
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
            
            await animateResult(sentMessage, client);
        }
    }, 1000); // ← SỬA: Chạy mỗi 1 giây thay vì 5 giây
}

// ANIMATION với GIF - KHÔNG CÓ TEXT
async function animateResult(sentMessage, client) {
    try {
        const { dice1, dice2, dice3, total } = rollDice();
        const result = checkResult(total);
        const isJackpot = checkJackpot(dice1, dice2, dice3);
        
        console.log(`🎲 Result: ${dice1}-${dice2}-${dice3} = ${total}`);
        
        // Tìm GIF
        const possibleGifPaths = [
            './assets/taixiu_spin.gif',
            './assets/taixiu_spin_59026.gif',
            './assets/taixiu_spin_59026.GIF',  // Windows có thể viết hoa
            './assets/taixiu.gif',
            './assets/animation.gif'
        ];
        
        let gifPath = null;
        for (const p of possibleGifPaths) {
            if (fs.existsSync(p)) {
                gifPath = p;
                console.log(`✅ Found GIF: ${p}`);
                break;
            }
        }
        
        // ===== CHỈ GIF - KHÔNG TEXT =====
        if (gifPath) {
            // Hiện GIF
            const gifAttachment = new AttachmentBuilder(gifPath, { name: 'shake.gif' });
            
            const embedGif = new EmbedBuilder()
                .setTitle('🎲 ĐANG LẮC XÚC XẮC...')
                .setColor('#e67e22')
                .setImage('attachment://shake.gif')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embedGif], 
                files: [gifAttachment],
                components: [] 
            }).catch(() => {});
            
            await sleep(4000); // Đợi GIF chạy
            
        } else {
            // Không có GIF - skip hẳn, chỉ hiện "Đang tính..."
            console.log('⚠️ No GIF found');
            
            const embedWait = new EmbedBuilder()
                .setTitle('🎲 ĐANG TÍNH TOÁN...')
                .setColor('#3498db')
                .setDescription('⏳ Vui lòng đợi...')
                .setTimestamp();
            
            await sentMessage.edit({ embeds: [embedWait], components: [] });
            await sleep(1500);
        }
        
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
        
        // ===== KẾT QUẢ CUỐI =====
        const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(isJackpot ? '🎰💥 NỔ HŨ!!! 💥🎰' : `🎲 KẾT QUẢ #${bettingSession.phienNumber}`)
            .setColor(isJackpot ? '#FFD700' : (result.tai ? '#3498db' : '#e74c3c'))
            .setDescription(`
**⇒ ${dice1} + ${dice2} + ${dice3} = ${total}**
**${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**
${isJackpot ? '\n🎰 **3 CON TRÙNG NHAU - NỔ HŨ!!!** 🎰' : ''}
            `);
        
        if (diceBuffer) {
            resultEmbed.setImage('attachment://dice.png');
        }
        
        if (isJackpot && jackpotWinners.length > 0) {
            resultEmbed.addFields({
                name: '🎰 JACKPOT',
                value: jackpotWinners.join('\n'),
                inline: false
            });
        }
        
        resultEmbed.addFields(
            { name: '✅ THẮNG', value: winners.length > 0 ? winners.join('\n') : '_Không có_', inline: false },
            { name: '❌ THUA', value: losers.length > 0 ? losers.join('\n') : '_Không có_', inline: false },
            { name: '💎 Hũ', value: `${database.jackpot.toLocaleString('en-US')} Mcoin`, inline: true },
            { name: '👥 Người chơi', value: `${Object.keys(bettingSession.bets).length}`, inline: true }
        );
        
        resultEmbed.setTimestamp();
        
        await sentMessage.edit({ 
            content: isJackpot ? '**🎰 TRÚNG ĐẠI!!!**' : '**🎊 KẾT QUẢ**', 
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
