const fs = require('fs');

const DB_PATH = './database/database.json';

// Khởi tạo database mặc định
let database = {
    users: {},
    history: [],
    jackpot: 0,
    lastCheckin: {},
    activeBettingSession: null
};

// Tạo thư mục database nếu chưa có
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
}

// Load database từ file
function loadDB() {
    if (fs.existsSync(DB_PATH)) {
        try {
            database = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            console.log('✅ Đã load database thành công!');
        } catch (e) {
            console.error('❌ Lỗi đọc database, tạo mới:', e);
        }
    }
}

// Lưu database vào file
function saveDB() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
    } catch (e) {
        console.error('❌ Lỗi lưu database:', e);
    }
}

// Lấy thông tin user (tự động tạo nếu chưa có)
function getUser(userId) {
    if (!database.users[userId]) {
        database.users[userId] = {
            balance: 15000000,
            tai: 0,
            xiu: 0,
            chan: 0,
            le: 0,
            jackpotWins: 0,
            dailyQuests: {
                lastReset: new Date().toDateString(),
                quests: generateDailyQuests(),
                streak: 0,
                lastCompleted: null
            }
        };
        saveDB();
    }
    
    // Reset nhiệm vụ hằng ngày
    const today = new Date().toDateString();
    if (database.users[userId].dailyQuests.lastReset !== today) {
        database.users[userId].dailyQuests.lastReset = today;
        database.users[userId].dailyQuests.quests = generateDailyQuests();
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (database.users[userId].dailyQuests.lastCompleted !== yesterday.toDateString()) {
            database.users[userId].dailyQuests.streak = 0;
        }
        
        saveDB();
    }
    
    return database.users[userId];
}

// Tạo nhiệm vụ hằng ngày
function generateDailyQuests() {
    return [
        { id: 1, name: '🎲 Chơi 5 phiên Tài Xỉu', target: 5, current: 0, reward: 1000000, completed: false },
        { id: 2, name: '🎯 Thắng 3 lần cược', target: 3, current: 0, reward: 1000000, completed: false },
        { id: 3, name: '💰 Cược tổng 500K Mcoin', target: 500000, current: 0, reward: 1000000, completed: false },
        { id: 4, name: '🔵 Thắng Tài 2 lần', target: 2, current: 0, reward: 1000000, completed: false },
        { id: 5, name: '🔴 Thắng Xỉu 2 lần', target: 2, current: 0, reward: 1000000, completed: false }
    ];
}

// Export database object và các hàm
module.exports = {
    database,
    loadDB,
    saveDB,
    getUser,
    generateDailyQuests,
    DB_PATH
};
