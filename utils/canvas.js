const { createCanvas } = require('canvas');

// Vẽ tô úp xúc xắc (như casino thật)
function createDiceBowlImage(state, dice1, dice2, dice3) {
    try {
        const canvas = createCanvas(500, 400);
        const ctx = canvas.getContext('2d');
        
        // Nền xanh lá (bàn casino)
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#0a4d0a');
        gradient.addColorStop(1, '#064206');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 500, 400);
        
        // Vẽ vân gỗ nhẹ
        ctx.strokeStyle = '#0a5a0a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 500; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 400);
            ctx.stroke();
        }
        
        if (state === 'closed') {
            // ===== TÔ ĐẬY KÍN =====
            // Vẽ bóng tô
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.ellipse(250, 250, 140, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Vẽ tô màu nâu đỏ
            const bowlGradient = ctx.createRadialGradient(250, 180, 20, 250, 180, 120);
            bowlGradient.addColorStop(0, '#C17817');
            bowlGradient.addColorStop(0.7, '#8B4513');
            bowlGradient.addColorStop(1, '#654321');
            ctx.fillStyle = bowlGradient;
            
            ctx.beginPath();
            ctx.ellipse(250, 180, 120, 100, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Viền tô
            ctx.strokeStyle = '#4A2511';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Ánh sáng trên tô
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.ellipse(220, 160, 40, 30, -0.5, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (state === 'opening') {
            // ===== TÔ ĐANG HÉ =====
            // Bóng
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.ellipse(250, 250, 140, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Tô bị nghiêng
            ctx.save();
            ctx.translate(250, 180);
            ctx.rotate(-0.3);
            
            const bowlGradient2 = ctx.createRadialGradient(0, 0, 20, 0, 0, 120);
            bowlGradient2.addColorStop(0, '#C17817');
            bowlGradient2.addColorStop(0.7, '#8B4513');
            bowlGradient2.addColorStop(1, '#654321');
            ctx.fillStyle = bowlGradient2;
            
            ctx.beginPath();
            ctx.ellipse(0, 0, 120, 100, 0, 0, Math.PI);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#4A2511';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.restore();
            
            // Hé một chút - thấy mờ mờ
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('???', 240, 240);
            
        } else {
            // ===== LẬT MỞ - HIỆN XÚC XẮC =====
            // Tô lật sang bên
            ctx.save();
            ctx.translate(350, 200);
            ctx.rotate(1.2);
            
            const bowlGradient3 = ctx.createRadialGradient(0, 0, 20, 0, 0, 80);
            bowlGradient3.addColorStop(0, '#C17817');
            bowlGradient3.addColorStop(0.7, '#8B4513');
            bowlGradient3.addColorStop(1, '#654321');
            ctx.fillStyle = bowlGradient3;
            
            ctx.beginPath();
            ctx.ellipse(0, 0, 80, 60, 0, 0, Math.PI);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#4A2511';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
            
            // VẼ XÚC XẮC
            const diceToShow = [];
            if (state === 'reveal1' && dice1) diceToShow.push(dice1);
            if (state === 'reveal2' && dice1 && dice2) diceToShow.push(dice1, dice2);
            if (state === 'reveal3' && dice1 && dice2 && dice3) diceToShow.push(dice1, dice2, dice3);
            
            const positions = [
                { x: 180, y: 220 },
                { x: 250, y: 220 },
                { x: 320, y: 220 }
            ];
            
            diceToShow.forEach((num, idx) => {
                const pos = positions[idx];
                drawDice3D(ctx, pos.x, pos.y, num);
            });
            
            // Vẽ ??? cho xúc xắc chưa lật
            for (let i = diceToShow.length; i < 3; i++) {
                const pos = positions[i];
                ctx.fillStyle = '#333';
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', pos.x, pos.y);
            }
        }
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createDiceBowlImage error:', error.message);
        return null;
    }
}

// Vẽ xúc xắc 3D đẹp hơn
function drawDice3D(ctx, x, y, number) {
    const size = 50;
    
    // Bóng đổ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x - size/2 + 5, y - size/2 + 5, size, size);
    
    // Mặt chính (trắng)
    const gradient = ctx.createLinearGradient(x - size/2, y - size/2, x + size/2, y + size/2);// Tạo GIF lắc xúc xắc
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
const GIFEncoder = require('gifencoder');

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
    drawDiceSafe,
    createDiceImageSafe,
    createHistoryChart
};
