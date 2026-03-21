// utils/canvas.js
const { createCanvas, loadImage } = require("@napi-rs/canvas");

// Khung avatar
const FRAMES = {
    gold:    { color: '#FFD700', shadow: '#FF8C00', width: 5 },
    fire:    { color: '#FF4500', shadow: '#FF0000', width: 5 },
    ice:     { color: '#00BFFF', shadow: '#1E90FF', width: 5 },
    purple:  { color: '#9B59B6', shadow: '#6C3483', width: 5 },
    green:   { color: '#2ecc71', shadow: '#27ae60', width: 5 },
};

function createHistoryChart(historyArray) {
    try {
        let last20 = historyArray.slice(-20);
        if (last20.length < 20) {
            const fakeData = [];
            for (let i = 0; i < 20 - last20.length; i++) {
                const d1 = Math.floor(Math.random() * 6) + 1;
                const d2 = Math.floor(Math.random() * 6) + 1;
                const d3 = Math.floor(Math.random() * 6) + 1;
                fakeData.push({ total: d1+d2+d3, dice1:d1, dice2:d2, dice3:d3, tai:(d1+d2+d3)>=11, timestamp: Date.now()-(20-i)*60000 });
            }
            last20 = [...fakeData, ...last20];
        }
        const canvas = createCanvas(700, 500);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 700, 500);
        const latestPhien = last20[last20.length - 1];
        const phienNumber = historyArray.length || 1;
        const phienResult = latestPhien.tai ? 'TÀI' : 'XỈU';
        const phienDice = `(${latestPhien.dice1}-${latestPhien.dice2}-${latestPhien.dice3})`;
        ctx.fillStyle = '#2d2d2d'; ctx.fillRect(0, 0, 700, 60);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
        ctx.fillText('THỐNG KÊ PHIÊN', 350, 30);
        ctx.fillStyle = '#888888'; ctx.font = '14px Arial';
        ctx.fillText(`Phiên gần nhất: #${phienNumber} ${phienResult} ${phienDice}`, 350, 50);
        const chart1Y=80, chart1Height=150, chartWidth=640, chartX=40;
        ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=1;
        for(let i=3;i<=18;i++){const y=chart1Y+chart1Height-((i-3)/15)*chart1Height;ctx.beginPath();ctx.moveTo(chartX,y);ctx.lineTo(chartX+chartWidth,y);ctx.stroke();}
        for(let i=0;i<=20;i++){const x=chartX+(i/20)*chartWidth;ctx.beginPath();ctx.moveTo(x,chart1Y);ctx.lineTo(x,chart1Y+chart1Height);ctx.stroke();}
        ctx.fillStyle='#666666';ctx.font='bold 11px Arial';ctx.textAlign='right';
        for(let i=3;i<=18;i+=3){const y=chart1Y+chart1Height-((i-3)/15)*chart1Height;ctx.fillText(i.toString(),chartX-8,y+4);}
        ctx.strokeStyle='#ffffff';ctx.lineWidth=2.5;ctx.beginPath();
        last20.forEach((h,i)=>{const x=chartX+(i/19)*chartWidth;const y=chart1Y+chart1Height-((h.total-3)/15)*chart1Height;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
        ctx.stroke();
        last20.forEach((h,i)=>{const x=chartX+(i/19)*chartWidth;const y=chart1Y+chart1Height-((h.total-3)/15)*chart1Height;ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffffff';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(h.total.toString(),x,y);});
        const chart2Y=260,chart2Height=160;
        ctx.strokeStyle='#2a2a2a';ctx.lineWidth=1;
        for(let i=0;i<=6;i++){const y=chart2Y+chart2Height-(i/6)*chart2Height;ctx.beginPath();ctx.moveTo(chartX,y);ctx.lineTo(chartX+chartWidth,y);ctx.stroke();}
        for(let i=0;i<=20;i++){const x=chartX+(i/20)*chartWidth;ctx.beginPath();ctx.moveTo(x,chart2Y);ctx.lineTo(x,chart2Y+chart2Height);ctx.stroke();}
        ctx.fillStyle='#666666';ctx.font='bold 11px Arial';ctx.textAlign='right';ctx.textBaseline='alphabetic';
        for(let i=0;i<=6;i++){const y=chart2Y+chart2Height-(i/6)*chart2Height;ctx.fillText(i.toString(),chartX-8,y+4);}
        const lines=[{name:'Xí ngầu 1',color:'#8b5cf6',data:[]},{name:'Xí ngầu 2',color:'#06b6d4',data:[]},{name:'Xí ngầu 3',color:'#ec4899',data:[]}];
        last20.forEach(h=>{lines[0].data.push(h.dice1||Math.floor(Math.random()*6)+1);lines[1].data.push(h.dice2||Math.floor(Math.random()*6)+1);lines[2].data.push(h.dice3||Math.floor(Math.random()*6)+1);});
        lines.forEach(line=>{ctx.strokeStyle=line.color;ctx.lineWidth=2.5;ctx.beginPath();line.data.forEach((val,i)=>{const x=chartX+(i/19)*chartWidth;const y=chart2Y+chart2Height-(val/6)*chart2Height;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();});
        for(let li=lines.length-1;li>=0;li--){const line=lines[li];line.data.forEach((val,i)=>{const x=chartX+(i/19)*chartWidth;const y=chart2Y+chart2Height-(val/6)*chart2Height;ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle=line.color;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke();});}
        const legendY=445;
        lines.forEach((line,i)=>{const legendX=200+i*120;ctx.fillStyle=line.color;ctx.beginPath();ctx.arc(legendX,legendY,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff';ctx.font='12px Arial';ctx.textAlign='left';ctx.fillText(line.name,legendX+12,legendY+4);});
        ctx.fillStyle='#444444';ctx.font='10px Arial';ctx.textAlign='right';ctx.fillText('Powered by mxtbot.com',690,490);
        return canvas.toBuffer('image/png');
    } catch(error){console.error('❌ createHistoryChart error:',error.message);return null;}
}

async function createProfileCard(user, userData, avatarUrl, client) {
    try {
        const canvas = createCanvas(500, 250);
        const ctx = canvas.getContext('2d');

        // Background
        if (userData.customBg) {
            try {
                const bgImage = await loadImage(userData.customBg);
                ctx.drawImage(bgImage, 0, 0, 500, 250);
            } catch (e) {
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

        // Bot logo goc tren trai
        try {
            if (client && client.user) {
                const botAvatar = await loadImage(client.user.displayAvatarURL({ extension: 'png', size: 64 }));
                ctx.save();
                ctx.beginPath();
                ctx.arc(26, 26, 18, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(botAvatar, 8, 8, 36, 36);
                ctx.restore();
                ctx.strokeStyle = 'rgba(255,255,255,0.85)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(26, 26, 18, 0, Math.PI * 2);
                ctx.stroke();
            }
        } catch (e) {}

        // Ten bot
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px Arial';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('emzy', 50, 30);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Avatar user
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(250, 80, 45, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 205, 35, 90, 90);
            ctx.restore();

            // Khung avatar
            const frame = userData.frame ? FRAMES[userData.frame] : null;
            if (frame) {
                // Shadow glow
                ctx.shadowColor = frame.shadow;
                ctx.shadowBlur = 12;
                ctx.strokeStyle = frame.color;
                ctx.lineWidth = frame.width;
                ctx.beginPath();
                ctx.arc(250, 80, 47, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                // Vien ngoai dam hon
                ctx.strokeStyle = frame.shadow;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(250, 80, 50, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // Vien trang mac dinh
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(250, 80, 45, 0, Math.PI * 2);
                ctx.stroke();
            }
        } catch (e) {
            console.error('Avatar load failed:', e);
        }

        // Ten user
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Arial';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 6;
        ctx.strokeText(user.username, 250, 145);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(user.username, 250, 145);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

        // Stats - bo icon VIP emoji, chi hien text
        function formatNumberShort(num) {
            if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'b';
            if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'm';
            if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k';
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        const vipDisplay = userData.vipLevel > 0 ? `Lv${userData.vipLevel}` : 'Lv0';
        const titleDisplay = (userData.vipTitle || 'Thường').substring(0, 10);

        const stats = [
            { label: 'Mcoin',     value: formatNumberShort(userData.balance), x: 125 },
            { label: 'VIP',       value: vipDisplay,                          x: 250 },
            { label: 'Danh hiệu', value: titleDisplay,                        x: 375 }
        ];

        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
        ctx.font = 'bold 13px Arial';
        stats.forEach(stat => {
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
            ctx.strokeText(stat.label, stat.x, 180);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(stat.label, stat.x, 180);
            ctx.font = 'bold 15px Arial';
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
            ctx.strokeText(stat.value, stat.x, 205);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(stat.value, stat.x, 205);
            ctx.font = 'bold 13px Arial';
        });

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
        const centerX=baseImage.width/2, centerY=baseImage.height/2;
        const diceSize=Math.min(baseImage.width,baseImage.height)*0.15;
        const positions=[{x:centerX,y:centerY-diceSize*0.7},{x:centerX-diceSize*1.1,y:centerY+diceSize*0.5},{x:centerX+diceSize*1.1,y:centerY+diceSize*0.5}];
        [dice1,dice2,dice3].forEach((num,i)=>drawRealisticDice(ctx,num,positions[i].x,positions[i].y,diceSize));
        return canvas.toBuffer('image/png');
    } catch(error){console.error('❌ overlayDiceOnBackground error:',error.message);return null;}
}

function createBowlLift(dice1,dice2,dice3,liftPercent=0){
    try{
        const canvas=createCanvas(800,600);const ctx=canvas.getContext('2d');
        ctx.fillStyle='#2d8a4f';ctx.fillRect(0,0,800,600);
        const centerX=400,centerY=300;
        ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(centerX,centerY,220,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#E0E0E0';ctx.lineWidth=4;ctx.stroke();
        const positions=[{x:centerX,y:centerY-60},{x:centerX-90,y:centerY+50},{x:centerX+90,y:centerY+50}];
        [dice1,dice2,dice3].forEach((num,i)=>drawRealisticDice(ctx,num,positions[i].x,positions[i].y,90));
        const liftAmount=liftPercent*2.5;const bowlY=centerY-liftAmount;
        if(liftPercent<100){ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.arc(centerX+5,bowlY+5,150,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8B5A3C';ctx.beginPath();ctx.arc(centerX,bowlY,150,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#A0694F';ctx.lineWidth=8;ctx.stroke();ctx.fillStyle='rgba(255,255,255,0.3)';ctx.beginPath();ctx.arc(centerX-40,bowlY-30,50,0,Math.PI*2);ctx.fill();}
        return canvas.toBuffer('image/png');
    }catch(error){console.error('❌ createBowlLift error:',error.message);return null;}
}

function createRevealDice(dice){
    try{
        const canvas=createCanvas(600,400);const ctx=canvas.getContext('2d');
        ctx.fillStyle='#2d8a4f';ctx.fillRect(0,0,600,400);
        ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.ellipse(300,220,200,100,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#E0E0E0';ctx.lineWidth=3;ctx.stroke();
        const positions=[{x:300,y:170},{x:240,y:240},{x:360,y:240}];
        dice.forEach((num,index)=>{const pos=positions[index];if(num===0){ctx.fillStyle='rgba(139,90,60,0.7)';ctx.beginPath();ctx.arc(pos.x,pos.y,35,0,Math.PI*2);ctx.fill();}else{drawRealisticDice(ctx,num,pos.x,pos.y,70);}});
        return canvas.toBuffer('image/png');
    }catch(error){console.error('❌ createRevealDice error:',error.message);return null;}
}

function drawRealisticDice(ctx,number,x,y,size=70){
    const half=size/2,radius=size*0.12;
    ctx.fillStyle='#FFFFFF';ctx.beginPath();
    ctx.moveTo(x-half+radius,y-half);ctx.lineTo(x+half-radius,y-half);ctx.quadraticCurveTo(x+half,y-half,x+half,y-half+radius);
    ctx.lineTo(x+half,y+half-radius);ctx.quadraticCurveTo(x+half,y+half,x+half-radius,y+half);
    ctx.lineTo(x-half+radius,y+half);ctx.quadraticCurveTo(x-half,y+half,x-half,y+half-radius);
    ctx.lineTo(x-half,y-half+radius);ctx.quadraticCurveTo(x-half,y-half,x-half+radius,y-half);
    ctx.closePath();ctx.fill();ctx.strokeStyle='#000000';ctx.lineWidth=2.5;ctx.stroke();
    ctx.fillStyle='#000000';
    const dotSize=size*0.16,offset=size*0.28;
    const dots={1:[[0,0]],2:[[-offset,-offset],[offset,offset]],3:[[-offset,-offset],[0,0],[offset,offset]],4:[[-offset,-offset],[offset,-offset],[-offset,offset],[offset,offset]],5:[[-offset,-offset],[offset,-offset],[0,0],[-offset,offset],[offset,offset]],6:[[-offset,-offset*1.1],[offset,-offset*1.1],[-offset,0],[offset,0],[-offset,offset*1.1],[offset,offset*1.1]]};
    (dots[number]||[]).forEach(([dx,dy])=>{ctx.beginPath();ctx.arc(x+dx,y+dy,dotSize,0,Math.PI*2);ctx.fill();});
}

function drawDiceSafe(number){
    try{const canvas=createCanvas(100,100);const ctx=canvas.getContext('2d');ctx.clearRect(0,0,100,100);drawRealisticDice(ctx,number,50,50,90);return canvas;}
    catch(error){console.error('❌ drawDiceSafe error:',error.message);return null;}
}

function createDiceImageSafe(dice1,dice2,dice3){
    try{
        const canvas=createCanvas(360,130);const ctx=canvas.getContext('2d');ctx.clearRect(0,0,360,130);
        [dice1,dice2,dice3].forEach((num,i)=>{const x=60+i*120;ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x-47,18,104,104);drawRealisticDice(ctx,num,x,65,100);});
        return canvas.toBuffer('image/png');
    }catch(error){console.error('❌ createDiceImageSafe error:',error.message);return null;}
}

module.exports = { createBowlLift, createRevealDice, drawDiceSafe, createDiceImageSafe, overlayDiceOnBackground, createHistoryChart, createProfileCard, FRAMES };
