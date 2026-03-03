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
            // Migrate db cu chua co field xd
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
        { id: 1, name: 'Đặt cược tổng 20M',    type: 'bet_total',    target: 20000000, current: 0, reward: 2000000, completed: false },
        { id: 2, name: 'Đặt cược 5 lần',        type: 'bet_count',    target: 5,        current: 0, reward: 1000000, completed: false },
        { id: 3, name: 'Điểm danh 1 lần',       type: 'checkin',      target: 1,        current: 0, reward: 500000,  completed: false },
        { id: 4, name: 'Gửi 10 tin nhắn',       type: 'message_count',target: 10,       current: 0, reward: 800000,  completed: false },
        { id: 5, name: 'Tặng tiền cho 1 người', type: 'gift_money',   target: 1,        current: 0, reward: 1500000, completed: false }
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
            dailyQuests: { lastReset: Date.now(), quests: getDefaultQuests() }
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

setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log('Resetting daily quests...');
        resetDailyQuests();
    }
}, 60000);

setInterval(() => {
    saveDB().catch(err => console.error('Auto-save error:', err));
}, 30000);

loadDB();

module.exports = { database, saveDB, saveDBDebounced, saveDBImmediate, getUser, resetDailyQuests, DB_PATH };
