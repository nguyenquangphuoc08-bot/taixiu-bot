// services/quest.js - RESET 0H MỖI NGÀY
const { getUser, saveDB } = require('../utils/database');

function initDailyQuests() {
    return {
        quests: [
            { id: 1, name: 'Đặt cược tổng 20M',    type: 'bet_total',    target: 20000000, current: 0, reward: 2000000, completed: false },
            { id: 2, name: 'Đặt cược 5 lần',        type: 'bet_count',    target: 5,        current: 0, reward: 1000000, completed: false },
            { id: 3, name: 'Điểm danh 1 lần',       type: 'checkin',      target: 1,        current: 0, reward: 500000,  completed: false },
            { id: 4, name: 'Gửi 10 tin nhắn',       type: 'message_count',target: 10,       current: 0, reward: 800000,  completed: false },
            { id: 5, name: 'Tặng tiền cho 1 người', type: 'gift_money',   target: 1,        current: 0, reward: 1500000, completed: false }
        ],
        lastReset: Date.now()
    };
}

// Lấy mốc 0h theo giờ VN (UTC+7)
function getTodayStartVN() {
    const vnOffset = 7 * 60;
    const utc = Date.now() + new Date().getTimezoneOffset() * 60000;
    const vnNow = new Date(utc + vnOffset * 60000);
    vnNow.setHours(0, 0, 0, 0);
    return vnNow.getTime() - vnOffset * 60000;
}

function getTimeLeftToMidnightVN() {
    const now = Date.now();
    const nextMidnight = getTodayStartVN() + 24 * 60 * 60 * 1000;
    const timeLeft = nextMidnight - now;
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}p`;
}

// Kiểm tra đã qua 0h VN chưa
function shouldReset(lastReset) {
    return !lastReset || lastReset < getTodayStartVN();
}

function updateQuest(userId, questId, value = 1) {
    const user = getUser(userId);

    if (!user.dailyQuests || !user.dailyQuests.quests) {
        user.dailyQuests = initDailyQuests();
    }

    // Reset nếu đã qua 0h
    if (shouldReset(user.dailyQuests.lastReset)) {
        user.dailyQuests = initDailyQuests();
    }

    const quest = user.dailyQuests.quests.find(q => q.id === questId);
    if (!quest || quest.completed) return;

    if (quest.type === 'bet_total') {
        quest.current += value;
    } else {
        quest.current += 1;
    }

    if (quest.current >= quest.target) {
        quest.current = quest.target;
        quest.completed = true;
    }

    saveDB();
}

function checkAllQuestsCompleted(userId) {
    const user = getUser(userId);
    if (!user.dailyQuests || !user.dailyQuests.quests) return false;
    return user.dailyQuests.quests.every(q => q.completed);
}

module.exports = { initDailyQuests, updateQuest, checkAllQuestsCompleted, shouldReset, getTodayStartVN, getTimeLeftToMidnightVN };
