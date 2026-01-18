// index.js - TEST VERSION
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
    ]
});

// Debug logs
client.on('debug', info => {
    if (!info.includes('Heartbeat')) {
        console.log('🐛 DEBUG:', info);
    }
});

client.on('warn', info => console.warn('⚠️ WARN:', info));

client.on('error', error => {
    console.error('❌ CLIENT ERROR:', error.message);
    console.error('Error code:', error.code);
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

// HTTP Server
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Bot: ${client.isReady() ? 'Online' : 'Offline'}\nPing: ${client.ws.ping}ms`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log('🌐 HTTP Server running on port', PORT);
});

// Login
console.log('🚀 Attempting login...');
client.login(TOKEN)
    .then(() => console.log('✅ Login request sent'))
    .catch(error => {
        console.error('❌ LOGIN FAILED!');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'TokenInvalid') {
            console.error('🚨 TOKEN INVALID! Reset token in Discord Developer Portal!');
        } else if (error.code === 'DisallowedIntents') {
            console.error('🚨 INTENTS NOT ENABLED! Enable all 3 intents in Developer Portal!');
        }
        
        process.exit(1);
    });
