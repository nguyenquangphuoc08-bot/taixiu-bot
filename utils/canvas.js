// Tạo GIF lắc xúc xắc
function createShakingDiceGIF() {
    try {
        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');
        const encoder = new GIFEncoder(400, 400);
        
        const stream = encoder.createReadStream();
        const chunks = [];
        
        stream.on('data', chunk => chunks.push(chunk));
        
        encoder.start();
        encoder.setRepeat(0);   // 0 = loop vô hạn
        encoder.setDelay(100);  // 100ms mỗi frame
        encoder.setQuality(10);
        
        // 10 frames animation lắcconst { createCanvas } = require('canvas');

// Vẽ tô úp màu nâu (giống ảnh)
function createBowlCover(state = 'shaking') {
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
        
        // Vẽ tô màu nâu
        const centerX = 200;
        const centerY = 150;
        
        if (state === 'shaking') {
            // Tô úp - hình elip nâu
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 120, 70, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Viền sáng
            ctx.strokeStyle = '#A0522D';
            ctx.lineWidth = 8;
            ctx.stroke();
            
            // Bóng
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(centerX + 5, centerY + 5, 120, 70, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🔊 Sột soạt...', centerX, centerY + 120);
            
        } else if (state === 'lifting') {
            // Tô đang hé lên
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY - 30, 120, 70, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Viền
            ctx.strokeStyle = '#A0522D';
            ctx.lineWidth = 8;
            ctx.stroke();
            
            // Mũi tên chỉ lên
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('↗️', centerX + 80, centerY - 20);
            
            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Đang mở...', centerX, centerY + 100);
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

// Vẽ 1 viên xúc xắc (an toàn, không crash)
function drawDiceSafe(number) {
    try {
        if (typeof createCanvas !== 'function') {
            console.error('❌ createCanvas not available');
            return null;
        }
        
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

// Tạo ảnh 3 xúc xắc (an toàn, không crash)
function createDiceImageSafe(dice1, dice2, dice3) {
    try {
        console.log(`🎲 Creating dice: ${dice1}-${dice2}-${dice3}`);
        
        const canvas = createCanvas(340, 130);
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 340, 130);
        
        const d1 = drawDiceSafe(dice1);
        const d2 = drawDiceSafe(dice2);
        const d3 = drawDiceSafe(dice3);
        
        if (!d1 || !d2 || !d3) {
            console.log('⚠️ Cannot create dice, using text fallback');
            return null;
        }
        
        ctx.drawImage(d1, 10, 15, 100, 100);
        ctx.drawImage(d2, 120, 15, 100, 100);
        ctx.drawImage(d3, 230, 15, 100, 100);
        
        const buffer = canvas.toBuffer('image/png');
        console.log(`✅ Dice image created: ${buffer.length} bytes`);
        return buffer;
        
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
            return canvas.toBuffer();
        }
        
        const barWidth = 35;
        const spacing = 5;
        const maxHeight = 200;
        
        last20.forEach((h, i) => {
            const x = 20 + i * (barWidth + spacing);
            const barHeight = (h.total / 18) * maxHeight;
            const y = 270 - barHeight;
            
            ctx.fillStyle = h.tai ? '#3498db' : '#e74c3c';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(h.total, x + barWidth / 2, y - 5);
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
        
        return canvas.toBuffer();
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
