// index.js - FULL CODE ĐÃ FIX (ỔN ĐỊNH, KHÔNG CRASH LOOP)

process.removeAllListeners('warning');

const http = require('http');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { TOKEN, ADMIN_ID, GIFTCODE_CHANNEL_ID, BACKUP_CHANNEL_ID } = require('./config');
const { database, saveDB, getUser } = require('./utils/database');
const { autoBackup } = require('./services/backup');

// Import commands
const { handleTaiXiu, handleSoiCau, getBettingSession } = require('./commands/game');
const { handleMcoin, handleSetBg, handleTang, handleDiemDanh } = require('./commands/user');
const { handleDaily, handleClaimAll } = require('./commands/quest');
const { 
  handleDbInfo, handleBackup, handleBackupNow, handleRestore, handleRestoreFile,
  handleSendCode, handleGiveVip, handleRemoveVip, handleGiveTitle,
  handleCreateGiftcode, handleCode, handleDeleteCode, handleDeleteAllCodes, handleDonate
} = require('./commands/admin');
const { handleMShop, buyVipPackage, buyTitle, showVipPackages, showTitles } = require('./commands/shop');
const { handleButtonClick } = require('./handlers/buttonHandler');

if (!TOKEN) { console.error('❌ DISCORD_TOKEN missing'); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  shards: 'auto',
  rest: { timeout: 60000, retries: 5 }
});

// ===== BACKUP KHI TẮT =====
async function emergencyBackup() {
  try {
    if (!client.isReady()) return;
    const channel = await client.channels.fetch(BACKUP_CHANNEL_ID).catch(() => null);
    if (!channel) return;
    const buffer = Buffer.from(JSON.stringify(database, null, 2), 'utf-8');
    const fileName = `emergency_${Date.now()}.json`;
    await channel.send({ content: '🚨 BACKUP KHẨN CẤP', files: [{ attachment: buffer, name: fileName }] });
  } catch (e) { console.error('Backup error:', e.message); }
}

['SIGTERM','SIGINT','SIGHUP'].forEach(sig => process.on(sig, async () => { await emergencyBackup(); setTimeout(()=>process.exit(0),3000);})); 
process.on('uncaughtException', async e => { console.error(e); await emergencyBackup(); setTimeout(()=>process.exit(1),3000); });
process.on('unhandledRejection', async e => { console.error(e); await emergencyBackup(); setTimeout(()=>process.exit(1),3000); });

// ===== READY =====
client.once('ready', () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  client.user.setPresence({ activities:[{ name:'🎲 Tài Xỉu | .help', type:ActivityType.Playing }], status:'online' });
});

// ===== SHARD LOG =====
client.on('shardDisconnect', (_, id)=>console.warn(`⚠️ Shard ${id} disconnect`));
client.on('shardReconnecting', id=>console.log(`🔄 Shard ${id} reconnecting...`));
client.on('shardResume', id=>console.log(`✅ Shard ${id} resumed`));
client.on('error', e=>console.error('Client error:', e.message));

// ===== HEARTBEAT LOG =====
setInterval(()=>{ if(client.isReady()) console.log(`💓 Ping: ${client.ws.ping}ms`); }, 5*60*1000);

// ===== MESSAGE =====
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const args = message.content.trim().split(/\s+/); const cmd = args[0].toLowerCase();
  try {
    if (cmd === '.ping') return message.reply('🏓 Pong!');
    if (cmd === '.tx') return handleTaiXiu(message, client);
    if (cmd === '.sc' || cmd === '.soicau') return handleSoiCau(message);
    if (cmd === '.mcoin') return handleMcoin(message);
    if (cmd === '.setbg') return handleSetBg(message, args);
    if (cmd === '.tang') return handleTang(message, args);
    if (cmd === '.diemdanh' || cmd === '.dd') return handleDiemDanh(message);
    if (cmd === '.daily') return handleDaily(message);
    if (cmd === '.claimall') return handleClaimAll(message);
    if (cmd === '.mshop') return handleMShop(message);
    if (cmd === '.giftcode' || cmd === '.gc') return handleCreateGiftcode(message, args);
    if (cmd === '.code') return handleCode(message, args);
    if (cmd === '.delcode' || cmd === '.xoacode') return handleDeleteCode(message, args);
    if (cmd === '.delallcode' || cmd === '.xoatatca') return handleDeleteAllCodes(message);
    if (cmd === '.dbinfo') return handleDbInfo(message);
    if (cmd === '.backup') return handleBackup(message);
    if (cmd === '.backupnow') return handleBackupNow(message);
    if (cmd === '.restore') return handleRestore(message);
    if (cmd === '.sendcode') return handleSendCode(message, GIFTCODE_CHANNEL_ID);
    if (cmd === '.givevip') return handleGiveVip(message, args);
    if (cmd === '.removevip') return handleRemoveVip(message, args);
    if (cmd === '.givetitle') return handleGiveTitle(message, args);
    if (cmd === '.donate') return handleDonate(message, args);
    if (cmd === '.restart' && message.author.id === ADMIN_ID) { await emergencyBackup(); return process.exit(0); }
  } catch (e) { console.error(e); message.reply('❌ Có lỗi xảy ra!').catch(()=>{}); }
});

// ===== HTTP =====
const server = http.createServer((req,res)=>{
  if (req.url === '/health') {
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({status:'online', ready: client.isReady(), ping: client.ws.ping, mem: Math.round(process.memoryUsage().heapUsed/1024/1024)+'MB'}));
  } else {
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('🤖 Bot online');
  }
});
const PORT = process.env.PORT || 10000; 
server.listen(PORT, ()=>console.log('🌐 HTTP Server:',PORT));

// ===== SELF PING =====
setInterval(()=>{
  let url = process.env.RENDER_EXTERNAL_URL; 
  if(!url) return; 
  if(!/^https?:/.test(url)) url='https://'+url; 
  url=url.replace(/\/$/,'');
  const lib = url.startsWith('https')?require('https'):require('http'); 
  lib.get(url+'/health').on('error',()=>{});
}, 5*60*1000);

// ===== LOGIN =====
client.login(TOKEN).then(()=>console.log('✅ Login OK')).catch(e=>{console.error(e); process.exit(1);});
