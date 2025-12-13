// ===== ANIMATION MƯỢT VỚI GIF =====
async function animateResult(sentMessage, client) {
    try {
        const { dice1, dice2, dice3, total } = rollDice();
        const result = checkResult(total);
        const isJackpot = checkJackpot(dice1, dice2, dice3);
        
        console.log(`🎲 Animation: ${dice1}-${dice2}-${dice3} = ${total}`); // ✅ FIX 1
        
        // ===== PHÁT GIF ANIMATION =====
        const fs = require('fs');
        const gifPath = './assets/taixiu_spin_59026.gif';
        
        if (fs.existsSync(gifPath)) {
            // Upload GIF một lần
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
            
            // Đợi GIF phát hết (4 giây)
            await sleep(4000);
            
            // ===== SAU KHI GIF PHÁT XONG - ĐÈ KẾT QUẢ LÊN =====
            const { overlayDiceOnGif } = require('../utils/canvas');
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
                    
                    // Bỏ qua animation hé tô từng viên - đi thẳng vào kết quả
                    console.log('✅ Đã dùng GIF, bỏ qua hé từng viên');
                }
            }
            
        } else {
            console.warn('⚠️ Không tìm thấy GIF, dùng fallback Canvas');
            // Fallback: Animation canvas (giật hơn)
            const shakePattern = [0, 15, -15, 10, -10, 5, -5, 0];
            
            for (let i = 0; i < shakePattern.length; i++) {
                const bowlShake = createBowlCover(0, shakePattern[i]);
                
                if (bowlShake) {
                    const embed1 = new EmbedBuilder()
                        .setTitle('🎲 ĐANG LẮC...')
                        .setColor('#e67e22')
                        .setDescription('⏳ Lắc lắc lắc...')
                        .setImage('attachment://bowl.png')
                        .setTimestamp();
                    
                    await sentMessage.edit({ 
                        embeds: [embed1], 
                        files: [new AttachmentBuilder(bowlShake, { name: 'bowl.png' })],
                        components: [] 
                    }).catch(() => {});
                }
                
                await sleep(300); // Tăng tốc độ
            }
        }
        
        // ANIMATION HÉ TÔ TỪNG VIÊN (chỉ dùng khi không có GIF)
        if (!fs.existsSync(gifPath)) {
        const reveal1 = createRevealDice([dice1, 0, 0]);
        if (reveal1) {
            const embed2 = new EmbedBuilder()
                .setTitle('🎲 HÉ XÚC XẮC THỨ NHẤT!')
                .setColor('#3498db')
                .setDescription(`🎯 **Con đầu tiên:** ${dice1} điểm\n❓ Còn 2 viên nữa...`) // ✅ FIX 2
                .setImage('attachment://dice.png')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed2], 
                files: [new AttachmentBuilder(reveal1, { name: 'dice.png' })]
            }).catch(() => {});
        }
        await sleep(800);
        
        // Xúc xắc 2
        const reveal2 = createRevealDice([dice1, dice2, 0]);
        if (reveal2) {
            const embed3 = new EmbedBuilder()
                .setTitle('🎲 HÉ XÚC XẮC THỨ HAI!')
                .setColor('#3498db')
                .setDescription(`
🎯 **Con thứ 1:** ${dice1} điểm
🎯 **Con thứ 2:** ${dice2} điểm
❓ **Con thứ 3:** ???

📊 **Tạm tính:** ${dice1 + dice2} điểm
                `)
                .setImage('attachment://dice.png')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed3], 
                files: [new AttachmentBuilder(reveal2, { name: 'dice.png' })]
            }).catch(() => {});
        }
        await sleep(800);
        
        // Xúc xắc 3
        const reveal3 = createRevealDice([dice1, dice2, dice3]);
        if (reveal3) {
            const embed4 = new EmbedBuilder()
                .setTitle(isJackpot ? '🎰💥 NỔ HŨ!!! 💥🎰' : '🎲 HÉ XÚC XẮC THỨ BA!')
                .setColor(isJackpot ? '#FFD700' : '#3498db')
                .setDescription(`
🎯 **Con thứ 1:** ${dice1} điểm
🎯 **Con thứ 2:** ${dice2} điểm  
🎯 **Con thứ 3:** ${dice3} điểm

📊 **TỔNG:** ${total} điểm
**🎯 ${result.tai ? '🔵 TÀI' : '🔴 XỈU'} - ${result.chan ? '🟣 CHẴN' : '🟡 LẺ'}**

${isJackpot ? '🎰🎰🎰 **BA CON GIỐNG NHAU!!!** 🎰🎰🎰' : ''}
                `)
                .setImage('attachment://dice.png')
                .setTimestamp();
            
            await sentMessage.edit({ 
                embeds: [embed4], 
                files: [new AttachmentBuilder(reveal3, { name: 'dice.png' })]
            }).catch(() => {});
        }
        await sleep(1200);
        }
        // KẾT THÚC IF FALLBACK
        
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
                    jackpotWinners.push(`<@${userId}>: +${jackpotAmount.toLocaleString('en-US')} 🎰💎`); // ✅ FIX 3
                }
                
                winners.push(`<@${userId}>: +${winAmount.toLocaleString('en-US')} 💰`); // ✅ FIX 4
            } else {
                losers.push(`<@${userId}>: -${bet.amount.toLocaleString('en-US')} 💸`); // ✅ FIX 5
            }
        }
        
        if (isJackpot && jackpotWinners.length > 0) {
            database.jackpot = 0;
        }
        
        saveDB();
        
        // ===== FRAME CUỐI: KẾT QUẢ =====
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
