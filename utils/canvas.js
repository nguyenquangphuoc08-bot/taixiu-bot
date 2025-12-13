const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Vẽ tô trên đĩa trắng
function createBowlCover(openPercent = 0, shakeOffset = 0) {
    try {
        const canvas = createCanvas(600, 400);
        const ctx = canvas.getContext('2d');
        
        // NỀN XANH LÁ
        ctx.fillStyle = '#2d8a4f';
        ctx.fillRect(0, 0, 600, 400);
        
        const centerX = 300;
        const centerY = 200;
        
        // VẼ ĐĨA TRẮNG
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 20, 200, 100, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Tính vị trí tô
        const liftAmount = openPercent * 1.5;
        const bowlX = centerX + shakeOffset;
        const bowlY = centerY - liftAmount;
        
        // Bóng tô
        if (openPercent < 100) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(bowlX + 3, bowlY + 8, 130, 75, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // VẼ TÔ
        ctx.fillStyle = '#8B5A3C';
        ctx.beginPath();
        ctx.ellipse(bowlX, bowlY, 130, 75, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#A0694F';
        ctx.lineWidth = 6;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.ellipse(bowlX - 35, bowlY - 20, 45, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createBowlCover error:', error.message);
        return null;
    }
}

// Vẽ 3 xúc xắc xếp tam giác GIỐNG ẢNH MẪU
function createRevealDice(dice) {
    try {
        const canvas = createCanvas(600, 400);
        const ctx = canvas.getContext('2d');
        
        // NỀN XANH
        ctx.fillStyle = '#2d8a4f';
        ctx.fillRect(0, 0, 600, 400);
        
        // ĐĨA TRẮNG
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(300, 220, 200, 100, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // VỊ TRÍ TAM GIÁC
        const positions = [
            { x: 300, y: 170 },  // Trên
            { x: 240, y: 240 },  // Dưới trái
            { x: 360, y: 240 }   // Dưới phải
        ];
        
        dice.forEach((num, index) => {
            const pos = positions[index];
            
            if (num === 0) {
                // Chưa hé - che bởi tô
                ctx.fillStyle = 'rgba(139, 90, 60, 0.7)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Đã hé - vẽ xúc xắc GIỐNG ẢNH
                drawRealisticDice(ctx, num, pos.x, pos.y, 70);
            }
        });
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createRevealDice error:', error.message);
        return null;
    }
}

// Vẽ xúc xắc GIỐNG HÌNH BẠN GỬI
function drawRealisticDice(ctx, number, x, y, size = 70) {
    const half = size / 2;
    const radius = size * 0.12; // Bo góc
    
    // Vẽ hình vuông bo góc
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
    
    // Viền đen mỏng
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // Vẽ chấm đen TRÒN
    ctx.fillStyle = '#000000';
    const dotSize = size * 0.16; // Chấm to hơn
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

// Vẽ 1 viên xúc xắc đơn (dùng cho fallback)
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

// ✅ SỬA LỖI: Tạo ảnh 3 xúc xắc nằm ngang
function createDiceImageSafe(dice1, dice2, dice3) {
    try {
        const canvas = createCanvas(360, 130);
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 360, 130);
        
        const y = 65; // ✅ ĐỊNH NGHĨA y Ở ĐÂY
        
        // Vẽ 3 viên ngang
        [dice1, dice2, dice3].forEach((num, i) => {
            const x = 60 + i * 120;
            
            // Bóng
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.ellipse(x + 2, y + 52, 48, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Vẽ xúc xắc
            drawRealisticDice(ctx, num, x, y, 100);
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

// Vẽ đè xúc xắc mới lên GIF frame cuối
async function overlayDiceOnGif(gifFramePath, dice1, dice2, dice3) {
    try {
        const baseImage = await loadImage(gifFramePath);
        
        const canvas = createCanvas(baseImage.width, baseImage.height);
        const ctx = canvas.getContext('2d');
        
        // Vẽ ảnh GIF làm nền
        ctx.drawImage(baseImage, 0, 0);
        
        // === CHE VÙNG XÚC XẮC CŨ ===
        const centerX = baseImage.width / 2;
        const centerY = baseImage.height / 2;
        
        // Vẽ hình ellipse trắng che đĩa (đè lên xúc xắc cũ)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 10, 180, 90, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Viền đĩa
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // === VẼ 3 XÚC XẮC MỚI (tam giác) ===
        const diceSize = 70;
        
        const positions = [
            { x: centerX, y: centerY - 35 },      // Trên
            { x: centerX - 70, y: centerY + 30 }, // Dưới trái
            { x: centerX + 70, y: centerY + 30 }  // Dưới phải
        ];
        
        [dice1, dice2, dice3].forEach((num, i) => {
            drawRealisticDice(ctx, num, positions[i].x, positions[i].y, diceSize);
        });
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ overlayDiceOnGif error:', error.message);
        return null;
    }
}

module.exports = {
    createBowlCover,
    createRevealDice,
    drawDiceSafe,
    createDiceImageSafe,
    createHistoryChart,
    overlayDiceOnGif  // ← Thêm export
};

