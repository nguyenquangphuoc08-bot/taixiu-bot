const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { rollDice, checkResult, checkJackpot } = require('../utils/game');
const { createDiceImageSafe, createHistoryChart } = require('../utils/canvas');
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
            
            const { dice1, dice2, dice3, total } = rollDice();
            const result = checkResult(total);
            const isJackpot = checkJackpot(dice1, dice2, dice3);
            
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
            
            const diceBuffer = createDiceImageSafe(dice1, dice2, dice3);
            
            const resultEmbed = new EmbedBuilder()
                .setTitle(`🎲 KẾT QUẢ TÀI XỈU #${bettingSession.phienNumber}`)
                .setColor(isJackpot ? '#FFD700' : (result.tai ? '#3498db' : '#e74c3c'));
            
            let files = [];
            let embedDescription = '';
            
            if (diceBuffer && Buffer.isBuffer(diceBuffer) && diceBuffer.length > 0) {
                embedDescription = `
**⇒ Kết quả: ${dice1} + ${dice2} + ${dice3} = ${total}**
**${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**
${isJackpot ? '\n🎰 **NỔ HŨ!!! 3 XÚC XẮC TRÙNG NHAU!!!** 🎰' : ''}
${isJackpot && jackpotWinners.length === 0 ? '\n⚠️ **Không có người thắng - Hũ tiếp tục tăng!**' : ''}
                `;
                
                resultEmbed.setDescription(embedDescription);
                resultEmbed.setImage('attachment://dice.png');
                files.push(new AttachmentBuilder(diceBuffer, { name: 'dice.png' }));
                
            } else {
                embedDescription = `
🎲 **${dice1}  ${dice2}  ${dice3}**

**⇒ Tổng: ${total} điểm**
**${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**
${isJackpot ? '\n🎰 **NỔ HŨ!!! 3 XÚC XẮC TRÙNG NHAU!!!** 🎰' : ''}
${isJackpot && jackpotWinners.length === 0 ? '\n⚠️ **Không có người thắng - Hũ tiếp tục tăng!**' : ''}
                `;
                
                resultEmbed.setDescription(embedDescription);
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
            
            try {
                await sentMessage.edit({ 
                    content: '**🎊 PHIÊN ĐÃ KẾT THÚC**', 
                    embeds: [resultEmbed],
                    files: files,
                    components: []
                });
                
            } catch (editError) {
                try {
                    await sentMessage.channel.send({
                        content: '**🎊 PHIÊN ĐÃ KẾT THÚC**',
                        embeds: [resultEmbed],
                        files: files
                    });
                } catch (sendError) {
                    console.error('❌ Cannot send new message:', sendError.message);
                }
            }
            
            bettingSession = null;
            database.activeBettingSession = null;
            saveDB();
        }
    }, 5000);
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

// Export bettingSession để các module khác có thể truy cập
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
