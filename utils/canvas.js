const { createCanvas, loadImage, registerFont } = require('canvas');

// Vẽ profile card cho .mcoin
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
        
        // Stats boxes
        const stats = [
            { label: 'Mcoin', value: userData.balance.toLocaleString('en-US'), x: 75 },
            { label: 'Cược', value: (userData.tai + userData.xiu + userData.chan + userData.le).toString(), x: 180 },
            { label: 'VIP', value: userData.vipTitle || 'Thường', x: 285 },
            { label: 'Danh hiệu', value: userData.vipLevel || '0', x: 390 },
            { label: 'Trạng thái', value: userData.vipStatus || 'Độc thân', x: 490 }
        ];
        
        ctx.font = 'bold 14px Arial';
        stats.forEach(stat => {
            // Label
            ctx.fillStyle = '#666666';
            ctx.fillText(stat.label, stat.x, 180);
            
            // Value
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(stat.value, stat.x, 205);
            ctx.font = 'bold 14px Arial';
        });
        
        // VIP Badge (nếu có)
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

// Export các hàm cần thiết (giữ nguyên các hàm cũ)
function createDiceImageSafe(dice1, dice2, dice3) {
    // ... code cũ của bạn
}

function createHistoryChart(history) {
    // ... code cũ của bạn
}

function createBowlLift(dice1, dice2, dice3, liftPercent) {
    // ... code cũ của bạn
}

// Vẽ profile card cho .mcoin
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
        
        // Stats boxes
        const stats = [
            { label: 'Mcoin', value: userData.balance.toLocaleString('en-US'), x: 75 },
            { label: 'Cược', value: (userData.tai + userData.xiu + userData.chan + userData.le).toString(), x: 180 },
            { label: 'VIP', value: userData.vipTitle || 'Thường', x: 285 },
            { label: 'Danh hiệu', value: userData.vipLevel || '0', x: 390 }
        ];
        
        ctx.font = 'bold 14px Arial';
        stats.forEach(stat => {
            // Label
            ctx.fillStyle = '#666666';
            ctx.fillText(stat.label, stat.x, 180);
            
            // Value
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(stat.value, stat.x, 205);
            ctx.font = 'bold 14px Arial';
        });
        
        // VIP Badge (nếu có)
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

module.exports = {
    createDiceImageSafe,
    createHistoryChart,
    createBowlLift,
    createRevealDice,
    drawDiceSafe,
    overlayDiceOnBackground,
    createProfileCard
};
