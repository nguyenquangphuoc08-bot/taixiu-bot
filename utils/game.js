// utils/game.js

/**
 * Tung 3 xúc xắc ngẫu nhiên
 * @returns {Object} { dice1, dice2, dice3, total }
 */
function rollDice() {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2 + dice3;
    
    return { dice1, dice2, dice3, total };
}

/**
 * Kiểm tra kết quả Tài/Xỉu/Chẵn/Lẻ
 * @param {number} total - Tổng điểm 3 xúc xắc
 * @returns {Object} { tai, xiu, chan, le }
 */
function checkResult(total) {
    return {
        tai: total >= 11 && total <= 18,
        xiu: total >= 3 && total <= 10,
        chan: total % 2 === 0,
        le: total % 2 !== 0
    };
}

/**
 * Kiểm tra nổ hũ (3 xúc xắc giống nhau)
 * @param {number} dice1 
 * @param {number} dice2 
 * @param {number} dice3 
 * @returns {boolean}
 */
function checkJackpot(dice1, dice2, dice3) {
    return dice1 === dice2 && dice2 === dice3;
}

module.exports = {
    rollDice,
    checkResult,
    checkJackpot
};
