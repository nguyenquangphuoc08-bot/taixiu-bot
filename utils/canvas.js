// utils/canvas.js - Animation TÔ MỞ DẦN (BỎ LƯỚI)

const { createCanvas } = require('canvas');

// Vẽ tô với độ mở khác nhau (0-100%)
function createBowlCover(openPercent = 0) {
    try {
        const canvas = createCanvas(400, 300);
        const ctx = canvas.getContext('2d');
        
        // NỀN XANH LÁ MƯỢT - KHÔNG CÓ LƯỚI
        const gradient = ctx.createRadialGradient(200, 150, 0, 200, 150, 250);
        gradient.addColorStop(0, '#1ea952');
        gradient.addColorStop(1, '#137a38');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 300);
        
        const centerX = 200;
        const centerY = 150;
        const liftAmount = openPercent * 1.2; // Tô nâng lên mượt hơn
        const tiltAngle = (openPercent / 100) * 0.5; // Tô nghiêng khi lật
        
        ctx.save();
        ctx.translate(centerX, centerY - liftAmount);
        ctx.rotate(tiltAngle);
        
        // BÓNG TÔ
        ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * (1 - openPercent / 100)})`;
        ctx.beginPath();
        ctx.ellipse(5, 10, 125, 75, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // TÔ MÀU NÂU TRẦM
        const bowlGradient = ctx.createRadialGradient(-20, -20, 0, 0, 0, 120);
        bowlGradient.addColorStop(0, '#A0522D');
        bowlGradient.addColorStop(1, '#6B3410');
        ctx.fillStyle = bowlGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, 120, 70, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // VIỀN SÁNG
        ctx.strokeStyle = '#D2691E';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        // HIGHLIGHT
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-30, -20, 40, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
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
        
        // NỀN XANH LÁ MƯỢT - KHÔNG CÓ LƯỚI
        const gradient = ctx.createRadialGradient(200, 150, 0, 200, 150, 250);
        gradient.addColorStop(0, '#1ea952');
        gradient.addColorStop(1, '#137a38');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 300);
        
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
                ctx.fillStyle = '#555';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 3;
                ctx.fillRect(pos.x - 40, pos.y - 40, 80, 80);
                
                ctx.shadowBlur = 0;
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
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 10;
                    ctx.shadowOffsetX = 3;
                    ctx.shadowOffsetY = 3;
                    ctx.drawImage(d, pos.x - 40, pos.y - 40, 80, 80);
                    ctx.shadowBlur = 0;
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
        
        // Nền trắng với gradient
        const gradient = ctx.createLinearGradient(0, 0, 100, 100);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(1, '#F5F5F5');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 100, 100);
        
        // Bo tròn góc
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
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

// Tạo ảnh 3 xúc xắc - NỀN TRONG SUỐT
function createDiceImageSafe(dice1, dice2, dice3) {
    try {
        const canvas = createCanvas(340, 130);
        const ctx = canvas.getContext('2d');
        
        // NỀN TRONG SUỐT
        ctx.clearRect(0, 0, 340, 130);
        
        const d1 = drawDiceSafe(dice1);
        const d2 = drawDiceSafe(dice2);
        const d3 = drawDiceSafe(dice3);
        
        if (!d1 || !d2 || !d3) {
            return null;
        }
        
        // Vẽ bóng cho xúc xắc
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        
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
        
        // Nền tối gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, '#23272A');
        gradient.addColorStop(1, '#2C2F33');
        ctx.fillStyle = gradient;
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
            
            // Gradient cho cột
            const barGradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            if (h.tai) {
                barGradient.addColorStop(0, '#5DADE2');
                barGradient.addColorStop(1, '#2874A6');
            } else {
                barGradient.addColorStop(0, '#EC7063');
                barGradient.addColorStop(1, '#C0392B');
            }
            
            ctx.fillStyle = barGradient;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(total.toString(), x + barWidth / 2, y - 5);
        });
        
        // Legend
        ctx.fillStyle = '#5DADE2';
        ctx.fillRect(20, 280, 20, 15);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Tài', 45, 292);
        
        ctx.fillStyle = '#EC7063';
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
