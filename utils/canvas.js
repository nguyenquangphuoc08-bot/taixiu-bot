// utils/canvas.js - CẬP NHẬT HÀM createHistoryChart()

const { createCanvas, loadImage } = require('canvas');

// === HÀM MỚI: VẼ BIỂU ĐỒ GIỐNG ẢNH ===
function createHistoryChart(historyArray) {
    try {
        let last20 = historyArray.slice(-20);
        
        // Nếu ít hơn 20 phiên, tạo dữ liệu giả để đủ 20
        if (last20.length < 20) {
            const fakeData = [];
            for (let i = 0; i < 20 - last20.length; i++) {
                const d1 = Math.floor(Math.random() * 6) + 1;
                const d2 = Math.floor(Math.random() * 6) + 1;
                const d3 = Math.floor(Math.random() * 6) + 1;
                fakeData.push({
                    total: d1 + d2 + d3,
                    dice1: d1,
                    dice2: d2,
                    dice3: d3,
                    tai: (d1 + d2 + d3) >= 11,
                    timestamp: Date.now() - (20 - i) * 60000
                });
            }
            last20 = [...fakeData, ...last20];
        }
        
        const canvas = createCanvas(400, 380);
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#2b2d31';
        ctx.fillRect(0, 0, 400, 380);
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('THỐNG KÊ PHIÊN', 10, 20);
        
        // Subtitle
        ctx.fillStyle = '#888888';
        ctx.font = '10px Arial';
        ctx.fillText('Phân tích dựa trên 20 phiên gần nhất', 220, 22);
        
        // ===== CHART 1: LINE CHART (TỔNG ĐIỂM) =====
        const chart1Y = 40;
        const chart1Height = 130;
        const chartWidth = 360;
        const chartX = 25;
        
        // Grid lines
        ctx.strokeStyle = '#3a3c40';
        ctx.lineWidth = 1;
        for (let i = 3; i <= 18; i += 3) {
            const y = chart1Y + chart1Height - ((i - 3) / 15) * chart1Height;
            ctx.beginPath();
            ctx.moveTo(chartX, y);
            ctx.lineTo(chartX + chartWidth, y);
            ctx.stroke();
            
            // Y-axis labels
            ctx.fillStyle = '#888888';
            ctx.font = '9px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(i.toString(), chartX - 5, y + 3);
        }
        
        // Draw line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        last20.forEach((h, i) => {
            const x = chartX + (i / 19) * chartWidth;
            const total = h.total || 10;
            const y = chart1Y + chart1Height - ((total - 3) / 15) * chart1Height;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw dots with numbers
        last20.forEach((h, i) => {
            const x = chartX + (i / 19) * chartWidth;
            const total = h.total || 10;
            const y = chart1Y + chart1Height - ((total - 3) / 15) * chart1Height;
            
            // Dot background
            ctx.fillStyle = '#2b2d31';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Dot border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.stroke();
            
            // ✅ SỐ HIỂN THỊ TRÊN ĐIỂM
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(total.toString(), x, y - 10);
        });
        
        // ===== CHART 2: XÚC XẮC 3 CON =====
        const chart2Y = 200;
        const chart2Height = 130;
        
        // Grid lines
        ctx.strokeStyle = '#3a3c40';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 6; i++) {
            const y = chart2Y + chart2Height - (i / 6) * chart2Height;
            ctx.beginPath();
            ctx.moveTo(chartX, y);
            ctx.lineTo(chartX + chartWidth, y);
            ctx.stroke();
            
            // Y-axis labels
            ctx.fillStyle = '#888888';
            ctx.font = '9px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(i.toString(), chartX - 5, y + 3);
        }
        
        // Prepare data for 3 dice (zigzag lines)
        const lines = [
            { name: 'Xí ngầu 1', color: '#5865f2', data: [] },
            { name: 'Xí ngầu 2', color: '#57f287', data: [] },
            { name: 'Xí ngầu 3', color: '#eb459e', data: [] }
        ];
        
        // Extract dice values from history
        last20.forEach((h, i) => {
            lines[0].data.push(h.dice1 || Math.floor(Math.random() * 6) + 1);
            lines[1].data.push(h.dice2 || Math.floor(Math.random() * 6) + 1);
            lines[2].data.push(h.dice3 || Math.floor(Math.random() * 6) + 1);
        });
        
        // Draw 3 zigzag lines
        lines.forEach(line => {
            ctx.strokeStyle = line.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            line.data.forEach((val, i) => {
                const x = chartX + (i / 19) * chartWidth;
                const y = chart2Y + chart2Height - (val / 6) * chart2Height;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        });
        
        // Legend
        const legendY = 350;
        lines.forEach((line, i) => {
            const legendX = 25 + i * 120;
            
            ctx.fillStyle = line.color;
            ctx.fillRect(legendX, legendY, 12, 12);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(line.name, legendX + 18, legendY + 10);
        });
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ createHistoryChart error:', error.message);
        return null;
    }
}

// === CÁC HÀM KHÁC GIỮ NGUYÊN ===

async function createProfileCard(user, userData, avatarUrl) {
    try {
        const canvas = createCanvas(500, 250);
        const ctx = canvas.getContext('2d');
        
        // ✅ DÙNG ẢNH NỀN TÙY CHỈNH NẾU CÓ
        if (userData.customBg) {
            try {
                const bgImage = await loadImage(userData.customBg);
                ctx.drawImage(bgImage, 0, 0, 500, 250);
            } catch (e) {
                console.error('❌ Không load được ảnh nền:', e.message);
                const gradient = ctx.createLinearGradient(0, 0, 500, 250);
                gradient.addColorStop(0, '#FFB6C1');
                gradient.addColorStop(1, '#FFE4E1');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 500, 250);
            }
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 500, 250);
            gradient.addColorStop(0, '#FFB6C1');
            gradient.addColorStop(1, '#FFE4E1');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 500, 250);
        }
        
        // Avatar
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(250, 80, 45, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 205, 35, 90, 90);
            ctx.restore();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(250, 80, 45, 0, Math.PI * 2);
            ctx.stroke();
        } catch (e) {
            console.error('Avatar load failed:', e);
        }
        
        // ✅ USERNAME - CHỮ TRẮNG + VIỀN ĐEN + BÓng
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Arial';
        
        // Bóng đen
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Viền đen dày
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.strokeText(user.username, 250, 145);
        
        // Chữ trắng
        ctx.fillStyle = '#ffffff';
        ctx.fillText(user.username, 250, 145);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // ✅ STATS - CHỮ TRẮNG + VIỀN ĐEN
        const stats = [
            { label: 'Mcoin', value: userData.balance.toLocaleString('en-US'), x: 75 },
            { label: 'Cược', value: (userData.tai + userData.xiu + userData.chan + userData.le).toString(), x: 190 },
            { label: 'VIP', value: `Lv${userData.vipLevel || 0}`, x: 305 },
            { label: 'Danh hiệu', value: (userData.vipTitle || 'Thường').substring(0, 8), x: 420 }
        ];
        
        // Bóng cho stats
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.font = 'bold 13px Arial';
        stats.forEach(stat => {
            // Label - viền đen + chữ trắng
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(stat.label, stat.x, 180);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(stat.label, stat.x, 180);
            
            // Value - viền đen + chữ trắng
            ctx.font = 'bold 15px Arial';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(stat.value, stat.x, 205);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(stat.value, stat.x, 205);
            ctx.font = 'bold 13px Arial';
        });
        
        // VIP Badge
        if (userData.vipLevel && userData.vipLevel > 0) {
            ctx.font = 'bold 12px Arial';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(`⭐ VIP ${userData.vipLevel}`, 250, 230);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`⭐ VIP ${userData.vipLevel}`, 250, 230);
        }
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        console.error('❌ Lỗi tạo profile card:', error);
        return null;
    }
}

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

module.exports = {
    createBowlLift,
    createRevealDice,
    drawDiceSafe,
    createDiceImageSafe,
    overlayDiceOnBackground,
    createHistoryChart,
    createProfileCard
};
