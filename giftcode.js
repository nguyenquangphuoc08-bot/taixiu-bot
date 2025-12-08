const fs = require('fs');

const GIFTCODE_PATH = './database/giftcodes.json';

// Khởi tạo database giftcode
let giftcodeDB = {
    codes: {},
    history: []
};

if (fs.existsSync(GIFTCODE_PATH)) {
    try {
        giftcodeDB = JSON.parse(fs.readFileSync(GIFTCODE_PATH, 'utf8'));
        console.log('✅ Đã load giftcode database!');
    } catch (e) {
        console.error('❌ Lỗi đọc giftcode database:', e);
    }
}

function saveGiftcodeDB() {
    try {
        fs.writeFileSync(GIFTCODE_PATH, JSON.stringify(giftcodeDB, null, 2));
    } catch (e) {
        console.error('❌ Lỗi lưu giftcode database:', e);
    }
}

// Tạo code random
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Tạo giftcode mới (admin tùy chỉnh)
function createGiftcode(creatorId, customReward = null, customHours = 2) {
    const code = generateCode();
    const reward = customReward || (Math.floor(Math.random() * (1000000000 - 5000000 + 1)) + 5000000);
    const expiresAt = Date.now() + (customHours * 60 * 60 * 1000);
    
    giftcodeDB.codes[code] = {
        code: code,
        reward: reward,
        maxUses: 10,
        usedBy: [],
        createdBy: creatorId,
        createdAt: Date.now(),
        expiresAt: expiresAt,
        duration: customHours
    };
    
    saveGiftcodeDB();
    return giftcodeDB.codes[code];
}

// Xóa giftcode
function deleteGiftcode(code) {
    if (!giftcodeDB.codes[code]) {
        return { success: false, message: 'Code không tồn tại!' };
    }
    
    const deletedCode = giftcodeDB.codes[code];
    delete giftcodeDB.codes[code];
    saveGiftcodeDB();
    return { success: true, message: 'Đã xóa code thành công!', code: deletedCode };
}

// Xóa TẤT CẢ code
function deleteAllCodes() {
    const count = Object.keys(giftcodeDB.codes).length;
    giftcodeDB.codes = {};
    saveGiftcodeDB();
    return { success: true, count: count };
}

// Nhập giftcode
function redeemGiftcode(code, userId) {
    const giftcode = giftcodeDB.codes[code];
    
    if (!giftcode) {
        return { success: false, message: '❌ Code không tồn tại!' };
    }
    
    // Kiểm tra hết hạn
    if (Date.now() > giftcode.expiresAt) {
        delete giftcodeDB.codes[code];
        saveGiftcodeDB();
        return { success: false, message: '❌ Code đã hết hạn!' };
    }
    
    // Kiểm tra đã dùng chưa
    if (giftcode.usedBy.includes(userId)) {
        return { success: false, message: '❌ Bạn đã dùng code này rồi!' };
    }
    
    // Kiểm tra hết lượt
    if (giftcode.usedBy.length >= giftcode.maxUses) {
        delete giftcodeDB.codes[code];
        saveGiftcodeDB();
        return { success: false, message: '❌ Code đã hết lượt sử dụng!' };
    }
    
    // Nhập code thành công
    giftcode.usedBy.push(userId);
    
    // Lưu lịch sử
    giftcodeDB.history.push({
        code: code,
        userId: userId,
        reward: giftcode.reward,
        timestamp: Date.now()
    });
    
    // Xóa code nếu đã đủ 10 lượt
    if (giftcode.usedBy.length >= giftcode.maxUses) {
        delete giftcodeDB.codes[code];
    }
    
    saveGiftcodeDB();
    
    return { 
        success: true, 
        reward: giftcode.reward,
        usesLeft: giftcode.maxUses - giftcode.usedBy.length
    };
}

// Lấy danh sách code hiện tại
function listActiveCodes() {
    const codes = Object.values(giftcodeDB.codes);
    
    // Xóa code hết hạn
    const now = Date.now();
    let removed = 0;
    
    codes.forEach(code => {
        if (now > code.expiresAt) {
            delete giftcodeDB.codes[code.code];
            removed++;
        }
    });
    
    if (removed > 0) {
        saveGiftcodeDB();
    }
    
    return Object.values(giftcodeDB.codes);
}

// Lấy thống kê
function getStats() {
    return {
        activeCodes: Object.keys(giftcodeDB.codes).length,
        totalRedeemed: giftcodeDB.history.length,
        totalRewards: giftcodeDB.history.reduce((sum, h) => sum + h.reward, 0)
    };
}

// Tự động xóa code hết hạn mỗi 5 phút
setInterval(() => {
    const now = Date.now();
    let removed = 0;
    
    Object.keys(giftcodeDB.codes).forEach(code => {
        if (now > giftcodeDB.codes[code].expiresAt) {
            delete giftcodeDB.codes[code];
            removed++;
        }
    });
    
    if (removed > 0) {
        console.log(`🗑️ Đã xóa ${removed} giftcode hết hạn`);
        saveGiftcodeDB();
    }
}, 5 * 60 * 1000);

module.exports = {
    createGiftcode,
    deleteGiftcode,
    deleteAllCodes,
    redeemGiftcode,
    listActiveCodes,
    getStats
};
