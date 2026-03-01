// giftcode.js - HỖ TRỢ UNLIMITED

const fs = require('fs');
const path = require('path');

const GIFTCODE_FILE = path.join(__dirname, 'database', 'giftcodes.json');

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

function saveGiftcodes(giftcodes) {
    try {
        fs.writeFileSync(GIFTCODE_FILE, JSON.stringify(giftcodes, null, 2));
    } catch (error) {
        console.error('Lỗi save giftcodes:', error);
    }
}

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ===== TẠO CODE TÙY CHỈNH =====
function createGiftcodeCustom(creatorId, customCode, customReward, maxUses = 100, customHours = 24) {
    const giftcodes = loadGiftcodes();
    
    if (giftcodes.find(gc => gc.code === customCode)) {
        return { success: false, message: 'Code đã tồn tại!' };
    }
    
    const expiresAt = customHours === -1 ? -1 : Date.now() + (customHours * 60 * 60 * 1000);
    
    const newCode = {
        code: customCode,
        reward: customReward,
        creatorId: creatorId,
        createdAt: Date.now(),
        expiresAt: expiresAt,
        duration: customHours,
        maxUses: maxUses, // -1 = unlimited
        usedBy: []
    };
    
    giftcodes.push(newCode);
    saveGiftcodes(giftcodes);
    
    return { success: true, ...newCode };
}

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

function redeemGiftcode(code, userId) {
    let giftcodes = loadGiftcodes();
    
    const codeIndex = giftcodes.findIndex(gc => gc.code === code);
    
    if (codeIndex === -1) {
        return { success: false, message: '❌ Code không tồn tại!' };
    }
    
    const giftcode = giftcodes[codeIndex];
    
    // Kiểm tra hết hạn (trừ unlimited time)
    if (giftcode.expiresAt !== -1 && Date.now() > giftcode.expiresAt) {
        giftcodes.splice(codeIndex, 1);
        saveGiftcodes(giftcodes);
        return { success: false, message: '⏰ Code đã hết hạn!' };
    }
    
    // Kiểm tra đã dùng
    if (giftcode.usedBy.includes(userId)) {
        return { success: false, message: '❌ Bạn đã dùng code này rồi!' };
    }
    
    // Kiểm tra hết lượt (trừ unlimited uses)
    if (giftcode.maxUses !== -1 && giftcode.usedBy.length >= giftcode.maxUses) {
        giftcodes.splice(codeIndex, 1);
        saveGiftcodes(giftcodes);
        return { success: false, message: '🔒 Code đã hết lượt!' };
    }
    
    giftcode.usedBy.push(userId);
    
    // Xóa nếu hết lượt (không áp dụng cho unlimited)
    if (giftcode.maxUses !== -1 && giftcode.usedBy.length >= giftcode.maxUses) {
        giftcodes.splice(codeIndex, 1);
    } else {
        giftcodes[codeIndex] = giftcode;
    }
    
    saveGiftcodes(giftcodes);
    
    const usesLeft = giftcode.maxUses === -1 ? 'Unlimited' : (giftcode.maxUses - giftcode.usedBy.length);
    
    return {
        success: true,
        reward: giftcode.reward,
        usesLeft: usesLeft
    };
}

function listActiveCodes() {
    let giftcodes = loadGiftcodes();
    const now = Date.now();
    // Giữ lại code unlimited time hoặc chưa hết hạn
    giftcodes = giftcodes.filter(gc => gc.expiresAt === -1 || gc.expiresAt > now);
    saveGiftcodes(giftcodes);
    return giftcodes;
}

function cleanExpiredCodes() {
    let giftcodes = loadGiftcodes();
    const now = Date.now();
    const before = giftcodes.length;
    giftcodes = giftcodes.filter(gc => gc.expiresAt === -1 || gc.expiresAt > now);
    const after = giftcodes.length;
    if (before !== after) {
        saveGiftcodes(giftcodes);
        console.log(`🗑️ Đã xóa ${before - after} code hết hạn`);
    }
}

function deleteGiftcode(code) {
    let giftcodes = loadGiftcodes();
    const codeIndex = giftcodes.findIndex(gc => gc.code === code);
    if (codeIndex === -1) return { success: false, message: 'Code không tồn tại!' };
    const deletedCode = giftcodes[codeIndex];
    giftcodes.splice(codeIndex, 1);
    saveGiftcodes(giftcodes);
    return { success: true, code: deletedCode };
}

function deleteAllCodes() {
    const giftcodes = loadGiftcodes();
    const count = giftcodes.length;
    saveGiftcodes([]);
    return { count };
}

function getStats() {
    const giftcodes = loadGiftcodes();
    let totalRedeemed = 0;
    let totalRewards = 0;
    giftcodes.forEach(gc => {
        totalRedeemed += gc.usedBy.length;
        totalRewards += gc.reward * gc.usedBy.length;
    });
    return { activeCodes: giftcodes.length, totalRedeemed, totalRewards };
}

setInterval(cleanExpiredCodes, 60 * 60 * 1000);

module.exports = {
    createGiftcode,
    createGiftcodeCustom,
    redeemGiftcode,
    listActiveCodes,
    deleteGiftcode,
    deleteAllCodes,
    getStats,
    cleanExpiredCodes
};
