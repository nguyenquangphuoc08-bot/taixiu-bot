const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/database.json');

let database = {
    users: {},
    history: [],
    jackpot: 0,
    lastCheckin: {},
    activeBettingSession: null,
    xdJackpot: 0,
    xdCounter: 0,
    xdHistory: []
};

let saveTimeout = null;
let isSaving = false;
let pendingSave = false;

function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            database = JSON.parse(data);
            if (!database.xdJackpot) database.xdJackpot = 0;
            if (!database.xdCounter) database.xdCounter = 0;
            if (!database.xdHistory) database.xdHistory = [];
            console.log('OK Database loaded');
        } else {
            console.log('Database not found, creating...');
            saveDB();
        }
    } catch (error) {
        console.error('Error loading database:', error);
    }
}

async function saveDB() {
    if (isSaving) { pendingSave = true; return; }
    isSaving = true;
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        await fs.promises.writeFile(DB_PATH, JSON.stringify(database, null, 2));
        isSaving = false;
        if (pendingSave) { pendingSave = false; await saveDB(); }
    } catch (error) {
        console.error('Error saving database:', error);
        isSaving = false;
    }
}

function saveDBDebounced(delay = 1000) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveDB().catch(err => console.error('Debounced save error:', err));
    }, delay);
}

async function saveDBImmediate() {
    clearTimeout(saveTimeout);
    await saveDB();
}

function getDefaultQuests() {
    return [
        { id: 1, name: 'Dat cuoc tong 20M',    type: 'bet_total',    target: 20000000, current: 0, reward: 2000000, completed: false },
        { id: 2, name: 'Dat cuoc 5 lan',        type: 'bet_count',    target: 5,        current: 0, reward: 1000000, completed: false },
        { id: 3, name: 'Diem danh 1 lan',       type: 'checkin',      target: 1,        current: 0, reward: 500000,  completed: false },
        { id: 4, name: 'Gui 10 tin nhan',       type: 'message_count',target: 10,       current: 0, reward: 800000,  completed: false },
        { id: 5, name: 'Tang tien cho 1 nguoi', type: 'gift_money',   target: 1,        current: 0, reward: 1500000, completed: false }
    ];
}

function getUser(userId) {
    if (!database.users[userId]) {
        database.users[userId] = {
            balance: 15000000,
            tai: 0, xiu: 0, chan: 0, le: 0,
            jackpotWins: 0, numberWins: 0, totalWins: 0,
            vipLevel: 0, vipTitle: null, vipBonus: null,
            ownedTitles: [], customBg: null,
            dailyQuests: { lastReset: Date.now(), quests: getDefaultQuests() },
            txWinningsToday: 0,
            xdWinningsToday: 0,
        };
        saveDBDebounced();
    }

    const user = database.users[userId];
    if (!user.vipLevel) user.vipLevel = 0;
    if (!user.vipTitle) user.vipTitle = null;
    if (!user.vipBonus) user.vipBonus = null;
    if (!user.ownedTitles) user.ownedTitles = [];
    if (user.customBg === undefined) user.customBg = null;
    if (user.numberWins === undefined) user.numberWins = 0;
    if (user.totalWins === undefined) user.totalWins = 0;
    if (!user.txWinningsToday) user.txWinningsToday = 0;
    if (!user.xdWinningsToday) user.xdWinningsToday = 0;
    if (!user.dailyQuests || !user.dailyQuests.lastReset || typeof user.dailyQuests.lastReset === 'string') {
        user.dailyQuests = { lastReset: Date.now(), quests: getDefaultQuests() };
        saveDBDebounced();
    }
    return user;
}

function resetDailyQuests() {
    const now = Date.now();
    for (const userId in database.users) {
        const user = database.users[userId];
        if (!user.dailyQuests) {
            user.dailyQuests = { lastReset: now, quests: getDefaultQuests() };
        } else {
            const timeElapsed = now - (user.dailyQuests.lastReset || 0);
            if (timeElapsed >= 24 * 60 * 60 * 1000) {
                user.dailyQuests = { lastReset: now, quests: getDefaultQuests() };
            }
        }
    }
    saveDBImmediate();
}

function fmtNum(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'b';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k';
    return num.toLocaleString('en-US');
}

// Phat thuong top, gui vao kenh va reset 0h VN
async function resetDailyTop(client) {
    const { TOP_CHANNEL_ID } = require('../config');
    const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
    const { createTopImage } = require('./canvasTop');

    const TOP_REWARDS = [100000000, 50000000, 30000000, 15000000, 15000000];
    const MEDALS = ['🥇', '🥈', '🥉', '#4', '#5'];
    const PRIZE_LABELS = ['100m', '50m', '30m', '15m', '15m'];

    async function getName(userId) {
        try {
            const u = await client.users.fetch(userId);
            return u.username || userId;
        } catch { return userId; }
    }

    // TX top 5 - lay truoc khi reset
    const txTop5raw = Object.entries(database.users)
        .map(([id, u]) => ({ id, win: u.txWinningsToday || 0 }))
        .filter(u => u.win > 0)
        .sort((a, b) => b.win - a.win)
        .slice(0, 5);

    const txTop5 = [];
    for (let i = 0; i < txTop5raw.length; i++) {
        const entry = { ...txTop5raw[i] };
        entry.name = await getName(entry.id);
        const reward = TOP_REWARDS[i] || 0;
        if (reward > 0 && database.users[entry.id]) {
            database.users[entry.id].balance += reward;
        }
        txTop5.push(entry);
    }

    // XD top 5
    const xdTop5raw = Object.entries(database.users)
        .map(([id, u]) => ({ id, win: u.xdWinningsToday || 0 }))
        .filter(u => u.win > 0)
        .sort((a, b) => b.win - a.win)
        .slice(0, 5);

    const xdTop5 = [];
    for (let i = 0; i < xdTop5raw.length; i++) {
        const entry = { ...xdTop5raw[i] };
        entry.name = await getName(entry.id);
        const reward = TOP_REWARDS[i] || 0;
        if (reward > 0 && database.users[entry.id]) {
            database.users[entry.id].balance += reward;
        }
        xdTop5.push(entry);
    }

    // Reset ve 0
    for (const userId in database.users) {
        database.users[userId].txWinningsToday = 0;
        database.users[userId].xdWinningsToday = 0;
    }
    await saveDBImmediate();

    // Gui vao kenh TOP
    if (!client || !TOP_CHANNEL_ID) return;
    try {
        const channel = await client.channels.fetch(TOP_CHANNEL_ID);
        if (!channel) return;

        const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
        // Lay ngay hom qua (truoc reset)
        const yesterday = new Date(vnNow.getTime() - 24 * 60 * 60 * 1000);
        const dateStr = yesterday.toLocaleDateString('vi-VN');

        // Anh bang top
        const imgBuffer = await createTopImage(txTop5, xdTop5);
        await channel.send({ files: [new AttachmentBuilder(imgBuffer, { name: 'top.png' })] });

        // Embed phat thuong
        function buildTopLines(top5) {
            if (top5.length === 0) return '_Không có ai hôm nay_';
            return top5.map((e, i) =>
                `${MEDALS[i]} <@${e.id}> — Thắng: **${fmtNum(e.win)}** → +**${PRIZE_LABELS[i]}** Mcoin`
            ).join('\n');
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 KẾT QUẢ TOP NGÀY ${dateStr}`)
            .setColor('#FFD700')
            .setDescription('Tiền thưởng đã được cộng vào tài khoản!')
            .addFields(
                { name: '🎲 TÀI XỈU', value: buildTopLines(txTop5), inline: false },
                { name: '🎴 XÓC ĐĨA', value: buildTopLines(xdTop5), inline: false }
            )
            .setFooter({ text: 'Chúc mừng các người chơi xuất sắc!' })
            .setTimestamp();

        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.error('resetDailyTop send error:', err);
    }

    console.log('✅ Reset daily top & phat thuong xong!');
}

// Check 0h VN moi phut
setInterval(() => {
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    if (vnNow.getUTCHours() === 0 && vnNow.getUTCMinutes() === 0) {
        console.log('Resetting daily quests...');
        resetDailyQuests();
    }
}, 60000);

setInterval(() => {
    saveDB().catch(err => console.error('Auto-save error:', err));
}, 30000);

loadDB();

module.exports = { database, saveDB, saveDBDebounced, saveDBImmediate, getUser, resetDailyQuests, resetDailyTop, DB_PATH };
