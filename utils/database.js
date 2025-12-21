const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/database.json');

let database = {
    users: {},
    history: [],
    jackpot: 0,
    lastCheckin: {},
    activeBettingSession: null
};

// Load database
function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            database = JSON.parse(data);
            console.log('✅ Database loaded successfully');
        } else {
            console.log('⚠️ Database file not found, creating new one');
            saveDB();
        }
    } catch (error) {
        console.error('❌ Error loading database:', error);
    }
}

// Save database
function saveDB() {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
    } catch (error) {
        console.error('❌ Error saving database:', error);
    }
}

// Get or create user
function getUser(userId) {
    if (!database.users[userId]) {
        database.users[userId] = {
            balance: 15000000,
            tai: 0,
            xiu: 0,
            chan: 0,
            le: 0,
            jackpotWins: 0,
            
            // VIP system
            vipLevel: 0,
            vipTitle: null,
            vipBonus: null,
            ownedTitles: [],
            
            // ✅ THÊM: Custom background
            customBg: null,
            
            // Quest system
            dailyQuests: {
                lastReset: new Date().toDateString(),
                streak: 0,
                lastCompleted: null,
                quests: [
                    { id: 1, name: '🎲 Chơi 5 phiên Tài Xỉu', target: 5, current: 0, reward: 1000000, completed: false },
                    { id: 2, name: '🎯 Thắng 3 lần cược', target: 3, current: 0, reward: 1000000, completed: false },
                    { id: 3, name: '💰 Cược tổng 500K Mcoin', target: 500000, current: 0, reward: 1000000, completed: false },
                    { id: 4, name: '🔵 Thắng Tài 2 lần', target: 2, current: 0, reward: 1000000, completed: false },
                    { id: 5, name: '🔴 Thắng Xỉu 2 lần', target: 2, current: 0, reward: 1000000, completed: false }
                ]
            }
        };
        saveDB();
    }
    
    // Migrate old users to new structure
    const user = database.users[userId];
    
    if (!user.vipLevel) user.vipLevel = 0;
    if (!user.vipTitle) user.vipTitle = null;
    if (!user.vipBonus) user.vipBonus = null;
    if (!user.ownedTitles) user.ownedTitles = [];
    
    // ✅ THÊM: Migration cho customBg
    if (user.customBg === undefined) user.customBg = null;
    
    if (!user.dailyQuests) {
        user.dailyQuests = {
            lastReset: new Date().toDateString(),
            streak: 0,
            lastCompleted: null,
            quests: generateDailyQuests()
        };
    }
    
    return user;
}

// Reset daily quests
function resetDailyQuests() {
    const today = new Date().toDateString();
    
    for (const userId in database.users) {
        const user = database.users[userId];
        
        if (!user.dailyQuests) {
            user.dailyQuests = {
                lastReset: today,
                streak: 0,
                lastCompleted: null,
                quests: [
                    { id: 1, name: 'Chơi 5 ván', target: 5, current: 0, reward: 1000000, completed: false },
                    { id: 2, name: 'Thắng 3 ván', target: 3, current: 0, reward: 2000000, completed: false },
                    { id: 3, name: 'Cược 10M', target: 10000000, current: 0, reward: 1500000, completed: false },
                    { id: 4, name: 'Thắng Tài 2 lần', target: 2, current: 0, reward: 1000000, completed: false },
                    { id: 5, name: 'Thắng Xỉu 2 lần', target: 2, current: 0, reward: 1000000, completed: false }
                ]
            };
        }
        
        if (user.dailyQuests.lastReset !== today) {
            // Kiểm tra xem hôm qua có làm xong không
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            const completedYesterday = user.dailyQuests.lastCompleted === yesterday;
            
            if (!completedYesterday) {
                user.dailyQuests.streak = 0; // Reset streak nếu không làm hôm qua
            }
            
            // Reset quests
            user.dailyQuests.lastReset = today;
            user.dailyQuests.quests.forEach(q => {
                q.current = 0;
                q.completed = false;
            });
        }
    }
    
    saveDB();
}

// Auto reset quests every day at 00:00
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log('🔄 Resetting daily quests...');
        resetDailyQuests();
    }
}, 60000); // Check every minute

loadDB();

module.exports = {
    database,
    saveDB,
    getUser,
    resetDailyQuests,
    DB_PATH
};
