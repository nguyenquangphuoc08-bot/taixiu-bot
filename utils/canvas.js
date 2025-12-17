// utils/canvas.js - THÊM HÀM VẼ PROFILE CARD

const { createCanvas, loadImage } = require('canvas');

// === HÀM MỚI: VẼ PROFILE CARD ===
async function createProfileCard(user, userData, avatarUrl) {
    try {
        const canvas = createCanvas(500, 250);
        const ctx = canvas.getContext('2d');
        
        // Background gradient hồng
        const gradient = ctx.createLinearGradient(0, 0, 500, 250);
        gradient.addColorStop(0, '#FFB6C1');
        gradient.addColorStop(1, '#FFE4E1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 500, 250);
        
        // Avatar circle
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(250, 80, 45, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 205, 35, 90, 90);
            ctx.restore();
            
            // Avatar border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(250, 80, 45, 0, Math.PI * 2);
            ctx.stroke();
        } catch (e) {
            console.error('Avatar load failed:', e);
        }
        
        // Username
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(user.username, 250, 145);
        
        // Stats boxes (4 ô ngang)
        const stats = [
            { label: 'Mcoin', value: userData.balance.toLocaleString('en-US'), x: 75 },
            { label: 'Cược', value: (userData.tai + userData.xiu + userData.chan + userData.le).toString(), x: 190 },
            { label: 'VIP', value: `Lv${userData.vipLevel || 0}`, x: 305 },
            { label: 'Danh hiệu', value: (userData.vipTitle || 'Thường').substring(0, 8), x: 420 }
        ];
        
        ctx.font = 'bold 13px Arial';
        stats.forEach(stat => {
            // Label
            ctx.fillStyle = '#666666';
            ctx.fillText(stat.label, stat.x, 180);
            
            // Value
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 15px Arial';
            ctx.fillText(stat.value, stat.x, 205);
            ctx.font = 'bold 13px Arial';
        });
        
        // VIP Badge nếu có
        if (userData.vipLevel && userData.vipLevel > 0) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`⭐ VIP ${userData.vipLevel}`, 250, 230);
        }
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ Lỗi tạo profile card:', error);
        return null;
    }
}

// === CÁC HÀM CŨ GIỮ NGUYÊN ===

// Vẽ xúc xắc ĐÈ LÊN ẢNH NỀN (không cần che gì)
async function overlayDiceOnBackground(bgImagePath, dice1, dice2, dice3) {
    try {
        const baseImage = await loadImage(bgImagePath);
        
        const canvas = createCanvas(baseImage.width, baseImage.height);
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(baseImage, 0, 0);
        
        const centerX = baseImage.width / 2;
        const centerY = baseImage.height / 2;
        const diceSize = Math.min(baseImage.width, baseImage.height) * 0.15;
        
        const positions = [
            { x: centerX, y: centerY - diceSize * 0.7 },
            { x: centerX - diceSize * 1.1, y: centerY + diceSize * 0.5 },
            { x: centerX + diceSize * 1.1, y: centerY + diceSize * 0.5 }
        ];
        
        [dice1, dice2, dice3].forEach((num, i) => {
            drawRealisticDice(ctx, num, positions[i].x, positions[i].y, diceSize);
        });
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ overlayDiceOnBackground error:', error.message);
        return null;
    }
}

// Vẽ xúc xắc cố định + tô NÂNG LÊN (không mờ)
function createBowlLift(dice1, dice2, dice3, liftPercent = 0) {
    try {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#2d8a4f';
        ctx.fillRect(0, 0, 800, 600);
        
        const centerX = 400;
        const centerY = 300;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 220, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        const diceSize = 90;
        const positions = [
            { x: centerX, y: centerY - 60 },
            { x: centerX - 90, y: centerY + 50 },
            { x: centerX + 90, y: centerY + 50 }
        ];
        
        [dice1, dice2, dice3].forEach((num, i) => {
            drawRealisticDice(ctx, num, positions[i].x, positions[i].y, diceSize);
        });
        
        const liftAmount = liftPercent * 2.5;
        const bowlY = centerY - liftAmount;
        
        if (liftPercent < 100) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(centerX + 5, bowlY + 5, 150, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#8B5A3C';
            ctx.beginPath();
            ctx.arc(centerX, bowlY, 150, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#A0694F';
            ctx.lineWidth = 8;
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(centerX - 40, bowlY - 30, 50, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createBowlLift error:', error.message);
        return null;
    }
}

// Vẽ 3 xúc xắc xếp tam giác GIỐNG ẢNH MẪU
function createRevealDice(dice) {
    try {
        const canvas = createCanvas(600, 400);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#2d8a4f';
        ctx.fillRect(0, 0, 600, 400);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(300, 220, 200, 100, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        const positions = [
            { x: 300, y: 170 },
            { x: 240, y: 240 },
            { x: 360, y: 240 }
        ];
        
        dice.forEach((num, index) => {
            const pos = positions[index];
            
            if (num === 0) {
                ctx.fillStyle = 'rgba(139, 90, 60, 0.7)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
                ctx.fill();
            } else {
                drawRealisticDice(ctx, num, pos.x, pos.y, 70);
            }
        });
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createRevealDice error:', error.message);
        return null;
    }
}

// Vẽ xúc xắc GIỐNG HÌNH
function drawRealisticDice(ctx, number, x, y, size = 70) {
    const half = size / 2;
    const radius = size * 0.12;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x - half + radius, y - half);
    ctx.lineTo(x + half - radius, y - half);
    ctx.quadraticCurveTo(x + half, y - half, x + half, y - half + radius);
    ctx.lineTo(x + half, y + half - radius);
    ctx.quadraticCurveTo(x + half, y + half, x + half - radius, y + half);
    ctx.lineTo(x - half + radius, y + half);
    ctx.quadraticCurveTo(x - half, y + half, x - half, y + half - radius);
    ctx.lineTo(x - half, y - half + radius);
    ctx.quadraticCurveTo(x - half, y - half, x - half + radius, y - half);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    ctx.fillStyle = '#000000';
    const dotSize = size * 0.16;
    const offset = size * 0.28;
    
    const dots = {
        1: [[0, 0]],
        2: [[-offset, -offset], [offset, offset]],
        3: [[-offset, -offset], [0, 0], [offset, offset]],
        4: [[-offset, -offset], [offset, -offset], [-offset, offset], [offset, offset]],
        5: [[-offset, -offset], [offset, -offset], [0, 0], [-offset, offset], [offset, offset]],
        6: [[-offset, -offset * 1.1], [offset, -offset * 1.1], [-offset, 0], [offset, 0], [-offset, offset * 1.1], [offset, offset * 1.1]]
    };
    
    (dots[number] || []).forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, dotSize, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Vẽ 1 viên xúc xắc đơn
function drawDiceSafe(number) {
    try {
        const canvas = createCanvas(100, 100);
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 100, 100);
        drawRealisticDice(ctx, number, 50, 50, 90);
        
        return canvas;
    } catch (error) {
        console.error('❌ drawDiceSafe error:', error.message);
        return null;
    }
}

// Tạo ảnh 3 xúc xắc nằm ngang cho kết quả cuối
function createDiceImageSafe(dice1, dice2, dice3) {
    try {
        const canvas = createCanvas(360, 130);
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 360, 130);
        
        [dice1, dice2, dice3].forEach((num, i) => {
            const x = 60 + i * 120;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(x - 47, 18, 104, 104);
            
            drawRealisticDice(ctx, num, x, 65, 100);
        });
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createDiceImageSafe error:', error.message);
        return null;
    }
}

// Tạo biểu đồ lịch sử
function createHistoryChart(historyArray) {
    try {
        const last20 = historyArray.slice(-20);
        const canvas = createCanvas(800, 300);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#23272A';
        ctx.fillRect(0, 0, 800, 300);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('LỊCH SỬ 20 PHIÊN GẦN NHẤT', 250, 30);
        
        if (last20.length === 0) {
            ctx.fillStyle = '#99AAB5';
            ctx.font = '16px Arial';
            ctx.fillText('Chưa có dữ liệu', 350, 150);
            return canvas.toBuffer('image/png');
        }
        
        const barWidth = 35;
        const spacing = 5;
        const maxHeight = 200;
        
        last20.forEach((h, i) => {
            const x = 20 + i * (barWidth + spacing);
            const total = h.total || 0;
            const barHeight = (total / 18) * maxHeight;
            const y = 270 - barHeight;
            
            ctx.fillStyle = h.tai ? '#3498db' : '#e74c3c';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(total.toString(), x + barWidth / 2, y - 5);
        });
        
        ctx.fillStyle = '#3498db';
        ctx.fillRect(20, 280, 20, 15);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Tài', 45, 292);
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(100, 280, 20, 15);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Xỉu', 125, 292);
        
        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error('❌ createHistoryChart error:', error.message);
        return null;
    }
}

module.exports = {
    createBowlLift,
    createRevealDice,
    drawDiceSafe,
    createDiceImageSafe,
    overlayDiceOnBackground,
    createHistoryChart,
    createProfileCard  // 
};
