// giftcode.js - Quản lý giftcode
const fs = require('fs');
const path = require('path');

const GIFTCODE_FILE = path.join(__dirname, 'database', 'giftcodes.json');

// Load giftcodes từ file
function loadGiftcodes() {
    try {
        if (fs.existsSync(GIFTCODE_FILE)) {
            const data = fs.readFileSync(GIFTCODE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Lỗi load giftcodes:', error);
    }
    return [];
}

// Save giftcodes vào file
function saveGiftcodes(giftcodes) {
    try {
        fs.writeFileSync(GIFTCODE_FILE, JSON.stringify(giftcodes, null, 2));
    } catch (error) {
        console.error('Lỗi save giftcodes:', error);
    }
}

// Tạo mã code ngẫu nhiên
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Tạo giftcode mới
function createGiftcode(creatorId, customReward = null, customHours = 2) {
    const giftcodes = loadGiftcodes();
    
    const code = generateCode();
    const reward = customReward || Math.floor(Math.random() * (1000000000 - 5000000 + 1)) + 5000000;
    const duration = customHours;
    const expiresAt = Date.now() + (duration * 60 * 60 * 1000);
    
    const newCode = {
        code: code,
        reward: reward,
        creatorId: creatorId,
        createdAt: Date.now(),
        expiresAt: expiresAt,
        duration: duration,
        maxUses: 10,
        usedBy: []
    };
    
    giftcodes.push(newCode);
    saveGiftcodes(giftcodes);
    
    return newCode;
}

// Nhập giftcode
function redeemGiftcode(code, userId) {
    let giftcodes = loadGiftcodes();
    
    const codeIndex = giftcodes.findIndex(gc => gc.code === code);
    
    if (codeIndex === -1) {
        return { success: false, message: '❌ Code không tồn tại!' };
    }
    
    const giftcode = giftcodes[codeIndex];
    
    // Kiểm tra hết hạn
    if (Date.now() > giftcode.expiresAt) {
        giftcodes.splice(codeIndex, 1);
        saveGiftcodes(giftcodes);
        return { success: false, message: '⏰ Code đã hết hạn!' };
    }
    
    // Kiểm tra đã dùng chưa
    if (giftcode.usedBy.includes(userId)) {
        return { success: false, message: '❌ Bạn đã dùng code này rồi!' };
    }
    
    // Kiểm tra hết lượt
    if (giftcode.usedBy.length >= giftcode.maxUses) {
        giftcodes.splice(codeIndex, 1);
        saveGiftcodes(giftcodes);
        return { success: false, message: '🔒 Code đã hết lượt!' };
    }
    
    // Thêm user vào danh sách đã dùng
    giftcode.usedBy.push(userId);
    
    // Nếu đã hết lượt, xóa code
    if (giftcode.usedBy.length >= giftcode.maxUses) {
        giftcodes.splice(codeIndex, 1);
    } else {
        giftcodes[codeIndex] = giftcode;
    }
    
    saveGiftcodes(giftcodes);
    
    return {
        success: true,
        reward: giftcode.reward,
        usesLeft: giftcode.maxUses - giftcode.usedBy.length
    };
}

// Lấy danh sách code đang hoạt động
function listActiveCodes() {
    let giftcodes = loadGiftcodes();
    const now = Date.now();
    
    // Lọc code còn hạn
    giftcodes = giftcodes.filter(gc => gc.expiresAt > now);
    saveGiftcodes(giftcodes);
    
    return giftcodes;
}

// Xóa code hết hạn tự động
function cleanExpiredCodes() {
    let giftcodes = loadGiftcodes();
    const now = Date.now();
    
    const before = giftcodes.length;
    giftcodes = giftcodes.filter(gc => gc.expiresAt > now);
    const after = giftcodes.length;
    
    if (before !== after) {
        saveGiftcodes(giftcodes);
        console.log(`🗑️ Đã xóa ${before - after} code hết hạn`);
    }
}

// Xóa 1 code
function deleteGiftcode(code) {
    let giftcodes = loadGiftcodes();
    const codeIndex = giftcodes.findIndex(gc => gc.code === code);
    
    if (codeIndex === -1) {
        return { success: false, message: 'Code không tồn tại!' };
    }
    
    const deletedCode = giftcodes[codeIndex];
    giftcodes.splice(codeIndex, 1);
    saveGiftcodes(giftcodes);
    
    return { success: true, code: deletedCode };
}

// Xóa tất cả code
function deleteAllCodes() {
    const giftcodes = loadGiftcodes();
    const count = giftcodes.length;
    
    saveGiftcodes([]);
    
    return { count };
}

// Thống kê
function getStats() {
    const giftcodes = loadGiftcodes();
    
    let totalRedeemed = 0;
    let totalRewards = 0;
    
    giftcodes.forEach(gc => {
        totalRedeemed += gc.usedBy.length;
        totalRewards += gc.reward * gc.usedBy.length;
    });
    
    return {
        activeCodes: giftcodes.length,
        totalRedeemed,
        totalRewards
    };
}

// Auto cleanup mỗi 1 giờ
setInterval(cleanExpiredCodes, 60 * 60 * 1000);

module.exports = {
    createGiftcode,
    redeemGiftcode,
    listActiveCodes,
    deleteGiftcode,
    deleteAllCodes,
    getStats,
    cleanExpiredCodes
};
