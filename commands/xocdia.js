// commands/xocdia.js - XOC DIA v2

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { database, saveDB, getUser } = require('../utils/database');
const { createXDLift, createXDResult } = require('../utils/canvasXD');
const { updateQuest } = require('../services/quest');

let xdSession = null;

const BET_TYPES = {
    chan:       { label: 'Chẵn (2Đ2T)',     multi: 2.0  },
    le:         { label: 'Lẻ (1 hoặc 3Đ)', multi: 2.0  },
    bon_do:     { label: '4🔴',             multi: 20.0 },
    bon_trang:  { label: '4⚪',             multi: 20.0 },
    ba_do:      { label: '3🔴 1⚪',         multi: 4.0  },
    ba_trang:   { label: '3⚪ 1🔴',         multi: 4.0  },
};

function getJackpotChance(j) {
    if (j >= 3_000_000_000) return 100;
    if (j >= 1_000_000_000) return 70;
    return 5;
}

function fmt(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function rollBeads() {
    return Array.from({ length: 4 }, () => Math.random() < 0.5 ? 'red' : 'white');
}

function rollJackpotDice() {
    return [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1);
}

function getResult(beads) {
    const red = beads.filter(b => b === 'red').length;
    const white = 4 - red;
    return {
        red, white,
        isChan:     red % 2 === 0,  // Chan: 0, 2, 4 hat do
        isLe:       red % 2 === 1,  // Le: 1, 3 hat do
        isBonDo:    red === 4,
        isBonTrang: white === 4,
        isBaDo:     red === 3,
        isBaTrang:  white === 3,
    };
}

function parseAmount(s) {
    if (!s) return null;
    s = s.toLowerCase().replace(/[,._]/g, '');
    if (s.endsWith('k')) return Math.floor(parseFloat(s) * 1e3);
    if (s.endsWith('m')) return Math.floor(parseFloat(s) * 1e6);
    if (s.endsWith('b') || s.endsWith('t')) return Math.floor(parseFloat(s) * 1e9);
    return parseInt(s);
}

function cleanupXDSession() { xdSession = null; }

// ============================================
// LENH .XD
// ============================================
async function handleXocDia(message) {
    if (xdSession) return message.reply('⏳ Đang có phiên xóc đĩa!');

    if (!database.xdCounter) database.xdCounter = 0;
    if (!database.xdJackpot) database.xdJackpot = 0;
    database.xdCounter++;
    const num = database.xdCounter;
    saveDB();

    xdSession = { channelId: message.channel.id, bets: {}, phienNumber: num };

    const chance = getJackpotChance(database.xdJackpot);

    const mainEmbed = new EmbedBuilder()
        .setTitle(`🎲 XÓC ĐĨA #${num}`)
        .setColor('#e74c3c')
        .setDescription(
            `**TỈ LỆ CƯỢC**\n` +
            `• **Chẵn / Lẻ:** x2\n` +
            `• **3🔴1⚪ / 3⚪1🔴:** x4\n` +
            `• **4🔴 / 4⚪:** x20\n\n` +
            `🎰 **Hũ XD:** ${fmt(database.xdJackpot)} Mcoin\n` +
            `🎲 Nổ khi 3 xúc xắc trùng nhau`
        )
        .addFields({ name: '⏰ Thời gian còn lại', value: '**30** giây', inline: false })
        .setFooter({ text: 'Chọn cửa và đặt cược bên dưới' });

    const tongEmbed = new EmbedBuilder()
        .setTitle('TỔNG CƯỢC')
        .setColor('#3498db')
        .setDescription('**Chẵn:** 0 | **Lẻ:** 0\n**4🔴:** 0 | **4⚪:** 0\n**3🔴1⚪:** 0 | **3⚪1🔴:** 0');

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('xd_chan').setLabel('Chẵn').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('xd_le').setLabel('Lẻ').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('xd_bon_do').setLabel('4🔴').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('xd_bon_trang').setLabel('4⚪').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('xd_ba_do').setLabel('3🔴 1⚪').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('xd_ba_trang').setLabel('3⚪ 1🔴').setStyle(ButtonStyle.Secondary),
    );

    const sent = await message.reply({ embeds: [mainEmbed, tongEmbed], components: [row1, row2] });
    xdSession.messageId = sent.id;

    let t = 30;
    const cd = setInterval(async () => {
        t--;
        if (t > 0) {
            mainEmbed.spliceFields(0, 1, { name: '⏰ Thời gian còn lại', value: `**${t}** giây`, inline: false });

            const c = { chan: 0, le: 0, bon_do: 0, bon_trang: 0, ba_do: 0, ba_trang: 0 };
            Object.values(xdSession.bets).forEach(userBets => {
                Object.keys(userBets).forEach(t => { if (c[t] !== undefined) c[t]++; });
            });

            tongEmbed.setDescription(
                `**Chẵn:** ${c.chan} | **Lẻ:** ${c.le}\n` +
                `**4🔴:** ${c.bon_do} | **4⚪:** ${c.bon_trang}\n` +
                `**3🔴1⚪:** ${c.ba_do} | **3⚪1🔴:** ${c.ba_trang}`
            );

            await sent.edit({ embeds: [mainEmbed, tongEmbed], components: [row1, row2] }).catch(() => {});
        } else {
            clearInterval(cd);
            [row1, row2].forEach(r => r.components.forEach(b => b.setDisabled(true)));
            await sent.edit({ components: [row1, row2] }).catch(() => {});

            if (Object.keys(xdSession.bets).length === 0 || Object.values(xdSession.bets).every(b => Object.keys(b).length === 0)) {
                await sent.edit({ content: '❌ Không có ai đặt cược!', embeds: [], components: [] }).catch(() => {});
                cleanupXDSession();
                return;
            }
            await animateXDResult(sent);
        }
    }, 1000);
}

// ============================================
// KET QUA
// ============================================
async function animateXDResult(sentMessage) {
    try {
        const jp = database.xdJackpot || 0;
        const num = xdSession.phienNumber;

        const beads = rollBeads();
        const result = getResult(beads);
        const jdice = rollJackpotDice();
        const isTriple = jdice[0] === jdice[1] && jdice[1] === jdice[2];
        const isJackpot = isTriple && Math.random() * 100 < getJackpotChance(jp);

        // Animation bat nang len giong .tx
        const animEmbed = new EmbedBuilder()
            .setTitle(`🎲 PHIÊN #${num} - ĐANG LẮC...`)
            .setColor('#e74c3c')
            .setDescription('🔄 **Đĩa đang xóc...**');

        // Frame 1: bat up kin
        const frame1 = createXDLift(beads, 0);
        const msg1 = await sentMessage.channel.send({
            embeds: [animEmbed],
            files: [new AttachmentBuilder(frame1, { name: 'xd_anim.png' })]
        });
        await sentMessage.edit({ embeds: [], content: '🎲 Đang xóc...', components: [] }).catch(() => {});
        await sleep(1500);

        // Frame 2: bat nang 1/3
        const frame2 = createXDLift(beads, 33);
        animEmbed.setDescription('🔄 **Đang mở...**');
        await msg1.edit({ embeds: [animEmbed.setImage('attachment://xd_anim2.png')], files: [new AttachmentBuilder(frame2, { name: 'xd_anim2.png' })] }).catch(() => {});
        await sleep(1500);

        // Frame 3: bat nang 2/3
        const frame3 = createXDLift(beads, 66);
        animEmbed.setDescription('👀 **Sắp lộ rồi...**');
        await msg1.edit({ embeds: [animEmbed.setImage('attachment://xd_anim3.png')], files: [new AttachmentBuilder(frame3, { name: 'xd_anim3.png' })] }).catch(() => {});
        await sleep(1500);

        // Frame 4: bat bay het - giu lai 2s de thay ro
        const frame4 = createXDLift(beads, 100);
        animEmbed.setDescription('✨ **Lộ kết quả!**');
        await msg1.edit({ embeds: [animEmbed.setImage('attachment://xd_anim4.png')], files: [new AttachmentBuilder(frame4, { name: 'xd_anim4.png' })] }).catch(() => {});
        await sleep(2000);

        // Xoa tin nhan animation
        await msg1.delete().catch(() => {});

        if (!database.xdHistory) database.xdHistory = [];
        database.xdHistory.push({ red: result.red, white: result.white, timestamp: Date.now() });
        if (database.xdHistory.length > 50) database.xdHistory.shift();

        let participants = [];
        let jackpotWinners = [];

        for (const [userId, userBets] of Object.entries(xdSession.bets)) {
            const user = getUser(userId);
            let userLines = [];
            let userWon = false;
            let totalBet = 0;

            for (const [betType, amount] of Object.entries(userBets)) {
                database.xdJackpot = (database.xdJackpot || 0) + Math.floor(amount * 0.05);
                totalBet += amount;

                let win = false;
                if      (betType === 'chan'      && result.isChan)     win = true;
                else if (betType === 'le'        && result.isLe)       win = true;
                else if (betType === 'bon_do'    && result.isBonDo)    win = true;
                else if (betType === 'bon_trang' && result.isBonTrang) win = true;
                else if (betType === 'ba_do'     && result.isBaDo)     win = true;
                else if (betType === 'ba_trang'  && result.isBaTrang)  win = true;

                const multi = BET_TYPES[betType].multi;
                const lbl = BET_TYPES[betType].label;

                if (win) {
                    let winAmt = Math.floor(amount * multi);
                    if (user.vipLevel > 0 && user.vipBonus) {
                        winAmt += Math.floor(winAmt * ((user.vipBonus.betBonus || 0) + (user.vipBonus.extraBonus || 0)) / 100);
                    }
                    const tb = user.titleBonus?.betBonus || 0;
                    if (tb > 0) winAmt += Math.floor(winAmt * tb / 100);
                    user.balance += winAmt;
                    userWon = true;
                    userLines.push(`${lbl}: ${fmt(amount)} ✅ (+${fmt(winAmt)})`);
                } else {
                    userLines.push(`${lbl}: ${fmt(amount)} ❌`);
                }
            }

            updateQuest(userId, 2);
            updateQuest(userId, 1, totalBet);
            if (userWon && isJackpot && !jackpotWinners.includes(userId)) jackpotWinners.push(userId);
            participants.push(`<@${userId}> | ` + userLines.join(' | '));
        }

        // Chia hu
        let jpWinNames = [];
        if (isJackpot && jackpotWinners.length > 0) {
            const share = Math.floor(database.xdJackpot / jackpotWinners.length);
            for (const uid of jackpotWinners) {
                const u = getUser(uid);
                let r = share;
                const jb = u.titleBonus?.jackpotBonus || 0;
                if (jb > 0) r += Math.floor(r * jb / 100);
                u.balance += r;
                u.jackpotWins = (u.jackpotWins || 0) + 1;
                jpWinNames.push(`<@${uid}>: +${fmt(r)} 🎰`);
            }
            database.xdJackpot = 0;
        }
        saveDB();

        // Anh ket qua
        const buf = createXDResult(beads);

        // Icon xx hu (dung emoji Discord)
        const numEmoji = ['', ':one:', ':two:', ':three:', ':four:', ':five:', ':six:'];
        const diceStr = `${numEmoji[jdice[0]]} ${numEmoji[jdice[1]]} ${numEmoji[jdice[2]]}`;

        let huLine = `🎲 ${diceStr}\n`;
        if (isJackpot)     huLine += '🎰 **NỔ HŨ!!**';
        else if (isTriple) huLine += '⚠️ Bộ ba! Nhưng không nổ (xác suất)';
        else               huLine += '❌ Chưa nổ';
        huLine += `\n💰 ${fmt(database.xdJackpot || 0)} Mcoin`;

        const ktText =
            result.red === 4   ? '4🔴 BỘ TỨ ĐỎ' :
            result.white === 4 ? '4⚪ BỘ TỨ TRẮNG' :
            result.red === 3   ? '3🔴 1⚪' :
            result.white === 3 ? '3⚪ 1🔴' :
                                 '2🔴 2⚪ CHẴN';

        const color = isJackpot ? '#FFD700' : (participants.some(p => p.includes('✅')) ? '#2ecc71' : '#e74c3c');

        const resEmbed = new EmbedBuilder()
            .setTitle(`${isJackpot ? '🎰 NỔ HŨ!! ' : ''}KẾT QUẢ XÓC ĐĨA #${num}`)
            .setColor(color)
            .setDescription(`⇒ **${ktText}**`)
            .setImage('attachment://xocdia.png')
            .addFields({ name: '🎰 HŨ XD', value: huLine, inline: false });

        if (isJackpot && jpWinNames.length > 0) {
            resEmbed.addFields({ name: `🎰 Chia đều ${jackpotWinners.length} người thắng`, value: jpWinNames.join('\n'), inline: false });
        }

        resEmbed.addFields({ name: 'DANH SÁCH', value: participants.join('\n') || 'Chưa có ai.', inline: false });
        resEmbed.setTimestamp();

        await sentMessage.channel.send({
            embeds: [resEmbed],
            files: [new AttachmentBuilder(buf, { name: 'xocdia.png' })]
        });

        await sentMessage.edit({ content: `Phiên #${num} đã kết thúc!`, embeds: [], components: [] }).catch(() => {});
        cleanupXDSession();

    } catch (err) {
        console.error('XD Error:', err.message);
        cleanupXDSession();
    }
}

// ============================================
// BUTTON + MODAL
// ============================================
async function handleXDButton(interaction) {
    const betType = interaction.customId.replace('xd_', '');
    if (!BET_TYPES[betType]) return;
    if (!xdSession) return interaction.reply({ content: '❌ Không có phiên xóc đĩa!', ephemeral: true });
    const userId = interaction.user.id;
    const existingBets = xdSession.bets[userId] || {};

    // Chan va Le xung dot nhau
    if (betType === 'chan' && existingBets['le']) 
        return interaction.reply({ content: '❌ Bạn đã cược **Lẻ** rồi, không thể cược Chẵn!', ephemeral: true });
    if (betType === 'le' && existingBets['chan']) 
        return interaction.reply({ content: '❌ Bạn đã cược **Chẵn** rồi, không thể cược Lẻ!', ephemeral: true });

    // Khong cho dat trung cua
    if (existingBets[betType]) 
        return interaction.reply({ content: `❌ Bạn đã cược **${BET_TYPES[betType].label}** rồi!`, ephemeral: true });

    const userModal = getUser(interaction.user.id);
    const balanceLabel = userModal.balance.toLocaleString('vi-VN');

    const modal = new ModalBuilder()
        .setCustomId(`xd_modal_${betType}`)
        .setTitle(`Đặt cược ${BET_TYPES[betType].label}`);
    const input = new TextInputBuilder()
        .setCustomId('xd_amount')
        .setLabel(`💰 ${balanceLabel} Mcoin`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Nhập số tiền... (VD: 1m, 500k, 1b)');
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
}

async function handleXDModal(interaction) {
    const betType = interaction.customId.replace('xd_modal_', '');
    if (!BET_TYPES[betType]) return;
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
    if (!xdSession) return interaction.editReply('❌ Phiên đã kết thúc!');
    // Khong can check o day, da check trong handleXDButton roi

    const amount = parseAmount(interaction.fields.getTextInputValue('xd_amount'));
    if (!amount || amount < 1000) return interaction.editReply('❌ Tối thiểu 1,000 Mcoin!');

    const user = getUser(interaction.user.id);
    if (user.balance < amount) return interaction.editReply(`❌ Không đủ tiền! Bạn có: ${fmt(user.balance)}`);

    user.balance -= amount;
    saveDB();
    if (!xdSession.bets[interaction.user.id]) xdSession.bets[interaction.user.id] = {};
    xdSession.bets[interaction.user.id][betType] = amount;

    const betList = Object.entries(xdSession.bets[interaction.user.id])
        .map(([t, a]) => `${BET_TYPES[t].label}: ${fmt(a)}`)
        .join(' | ');
    return interaction.editReply(`✅ Cược của bạn: ${betList}`);
}

function getXDSession() { return xdSession; }
module.exports = { handleXocDia, handleXDButton, handleXDModal, getXDSession };

