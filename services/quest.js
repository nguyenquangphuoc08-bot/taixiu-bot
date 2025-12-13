const { getUser, saveDB } = require('../utils/database');

// Cập nhật tiến độ nhiệm vụ
function updateQuest(userId, questId, amount = 1) {
    const user = getUser(userId);
    const quest = user.dailyQuests.quests.find(q => q.id === questId);
    
    if (quest && !quest.completed) {
        quest.current += amount;
        if (quest.current >= quest.target) {
            quest.current = quest.target;
            quest.completed = true;
        }
        saveDB();
    }
}

// Kiểm tra đã hoàn thành tất cả nhiệm vụ chưa
function checkAllQuestsCompleted(userId) {
    const user = getUser(userId);
    return user.dailyQuests.quests.every(q => q.completed);
}

module.exports = {
    updateQuest,
    checkAllQuestsCompleted
};
