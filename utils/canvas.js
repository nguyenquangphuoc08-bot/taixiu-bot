// utils/canvas.js - Animation TÔ MỞ DẦN như thật

const { createCanvas } = require('canvas');

// Vẽ tô với độ mở khác nhau (0-100%)
function createBowlCover(openPercent = 0) {
    try {
        const canvas = createCanvas(400, 300);
        const ctx = canvas.getContext('2d');
        
        // Nền xanh lá như bàn cờ bạc
        ctx.fillStyle = '#1a7a3e';
        ctx.fillRect(0, 0, 400, 300);
        
        // Vẽ pattern lưới
        ctx.strokeStyle = '#145c2e';
        ctx.lineWidth = 1;
        for (let i = 0; i < 400; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 300);
            ctx.stroke();
        }
        for (let j = 0; j < 300; j += 20) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(400, j);
            ctx.stroke();
        }
        
        // Vẽ tô màu nâu với độ mở
        const centerX = 200;
        const centerY = 150;
        const liftAmount = openPercent * 0.8; // Tô nâng lên dần
        
        // Tô màu nâu
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - liftAmount, 120, 70, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Viền sáng
        ctx.strokeStyle = '#A0522D';
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // Bóng mờ dần khi tô nâng lên
        if (openPercent < 100) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * (1 - openPercent / 100)})`;
            ctx.beginPath();
            ctx.ellipse(centerX + 5, centerY + 5, 120, 70, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createBowlCover error:', error.message);
        return null;
    }
}

// Vẽ xúc xắc từ từ lật ra (0 = chưa lật)
function createRevealDice(dice) {
    try {
        const canvas = createCanvas(400, 300);
        const ctx = canvas.getContext('2d');
        
        // Nền xanh lá
        ctx.fillStyle = '#1a7a3e';
        ctx.fillRect(0, 0, 400, 300);
        
        // Vẽ pattern lưới
        ctx.strokeStyle = '#145c2e';
        ctx.lineWidth = 1;
        for (let i = 0; i < 400; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 300);
            ctx.stroke();
        }
        for (let j = 0; j < 300; j += 20) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(400, j);
            ctx.stroke();
        }
        
        // Vẽ 3 xúc xắc
        const positions = [
            { x: 80, y: 150 },
            { x: 200, y: 150 },
            { x: 320, y: 150 }
        ];
        
        dice.forEach((num, index) => {
            const pos = positions[index];
            
            if (num === 0) {
                // Chưa lật - vẽ dấu ?
                ctx.fillStyle = '#666';
                ctx.fillRect(pos.x - 40, pos.y - 40, 80, 80);
                
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 3;
                ctx.strokeRect(pos.x - 40, pos.y - 40, 80, 80);
                
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 50px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', pos.x, pos.y);
                
            } else {
                // Đã lật - vẽ xúc xắc
                const d = drawDiceSafe(num);
                if (d) {
                    ctx.drawImage(d, pos.x - 40, pos.y - 40, 80, 80);
                }
            }
        });
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createRevealDice error:', error.message);
        return null;
    }
}

// Vẽ 1 viên xúc xắc
function drawDiceSafe(number) {
    try {
        const canvas = createCanvas(100, 100);
        const ctx = canvas.getContext('2d');
        
        // Nền trắng
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 100, 100);
        
        // Viền đen
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, 90, 90);
        
        // Vẽ chấm
        ctx.fillStyle = '#000000';
        const dotSize = 13;
        
        const positions = {
            1: [[50, 50]],
            2: [[30, 30], [70, 70]],
            3: [[30, 30], [50, 50], [70, 70]],
            4: [[30, 30], [70, 30], [30, 70], [70, 70]],
            5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
            6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]]
        };
        
        (positions[number] || []).forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, dotSize, 0, Math.PI * 2);
            ctx.fill();
        });
        
        return canvas;
    } catch (error) {
        console.error('❌ drawDiceSafe error:', error.message);
        return null;
    }
}

// Tạo ảnh 3 xúc xắc
function createDiceImageSafe(dice1, dice2, dice3) {
    try {
        const canvas = createCanvas(340, 130);
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 340, 130);
        
        const d1 = drawDiceSafe(dice1);
        const d2 = drawDiceSafe(dice2);
        const d3 = drawDiceSafe(dice3);
        
        if (!d1 || !d2 || !d3) {
            return null;
        }
        
        ctx.drawImage(d1, 10, 15, 100, 100);
        ctx.drawImage(d2, 120, 15, 100, 100);
        ctx.drawImage(d3, 230, 15, 100, 100);
        
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
        
        ctx.fillStyle = '#2C2F33';
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
    createBowlCover,
    createRevealDice,
    drawDiceSafe,
    createDiceImageSafe,
    createHistoryChart
};
