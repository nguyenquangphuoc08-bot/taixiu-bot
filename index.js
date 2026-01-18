// index.js - FIXED VERSION
const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

const TOKEN = process.env.DISCORD_TOKEN;

console.log('🔑 Token length:', TOKEN ? TOKEN.length : 'MISSING');
console.log('🔑 Token preview:', TOKEN ? TOKEN.substring(0, 30) + '...' : 'NONE');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    ws: {
        properties: {
            browser: 'Discord Client'
        }
    },
    // ✅ THÊM: Timeout dài hơn
    rest: {
        timeout: 120000,
        retries: 10
    }
});

// Debug logs
client.on('debug', info => {
    console.log('🐛 DEBUG:', info);
});

client.on('warn', info => console.warn('⚠️ WARN:', info));

client.on('error', error => {
    console.error('❌ CLIENT ERROR:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
});

// ✅ THÊM: WebSocket specific handlers
client.ws.on('ready', () => {
    console.log('✅ WebSocket connected!');
});

client.ws.on('close', (event) => {
    console.error('❌ WebSocket closed!');
    console.error('Code:', event.code);
    console.error('Reason:', event.reason);
});

client.ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

client.on('ready', () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ BOT ONLINE:', client.user.tag);
    console.log('🆔 Bot ID:', client.user.id);
    console.log('🎮 Servers:', client.guilds.cache.size);
    console.log('🏓 Ping:', client.ws.ping + 'ms');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
});

client.on('messageCreate', async (message) => {
    if (message.content === '.ping') {
        await message.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }
});

// ✅ HTTP Server với healthcheck tốt hơn
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    const status = `Bot Status: ${client.isReady() ? '✅ Online' : '❌ Offline'}
Ping: ${client.ws.ping || 'N/A'}ms
Uptime: ${Math.floor(process.uptime())}s
WS Status: ${client.ws.status}`;
    res.end(status);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🌐 HTTP Server running on port', PORT);
    console.log('🌐 Listening on 0.0.0.0:' + PORT);
});

// ✅ Self-ping mỗi 5 phút
setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL;
    if (!url) return;
    
    const https = require('https');
    https.get(`https://${url.replace(/^https?:\/\//, '')}`, () => {}).on('error', () => {});
}, 5 * 60 * 1000);

// Login
console.log('🚀 Attempting login...');

// ✅ THÊM: Test network trước
const https = require('https');
console.log('🌐 Testing Discord API...');
https.get('https://discord.com/api/v10/gateway', (res) => {
    console.log('✅ Discord API reachable! Status:', res.statusCode);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const gateway = JSON.parse(data);
            console.log('📡 Gateway URL:', gateway.url);
        } catch (e) {
            console.error('❌ Failed to parse gateway response');
        }
    });
}).on('error', (err) => {
    console.error('❌ CANNOT REACH DISCORD API!');
    console.error('Error:', err.message);
    console.error('🚨 Render may be blocking Discord!');
});

// Wait 2s for network test
setTimeout(() => {
    client.login(TOKEN)
        .then(() => console.log('✅ Login request sent'))
        .catch(error => {
            console.error('❌ LOGIN FAILED!');
            console.error('Error:', error.message);
            console.error('Code:', error.code);
            console.error('Stack:', error.stack);
            
            if (error.code === 'TokenInvalid') {
                console.error('🚨 TOKEN INVALID! Reset token in Discord Developer Portal!');
            } else if (error.code === 'DisallowedIntents') {
                console.error('🚨 INTENTS NOT ENABLED! Enable all 3 intents in Developer Portal!');
            }
            
            process.exit(1);
        });
}, 2000);

// ✅ THÊM: Check connection mỗi 30s
setInterval(() => {
    if (!client.isReady()) {
        console.error('⚠️ Bot is NOT ready! WS Status:', client.ws.status);
    } else {
        console.log('✅ Bot is ready! Ping:', client.ws.ping + 'ms');
    }
}, 30000);
