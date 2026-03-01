// commands/shop.js - DANH HIỆU TU TIÊN

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ========================================
// VIP 1-10
// ========================================
const VIP_ITEMS = {
    vip1: {
        id: 'vip1',
        name: '⭐ VIP 1',
        icon: '⭐',
        price: 100000000,
        dailyBonus: 10,
        betBonus: 5,
        extraBonus: 0
    },
    vip2: {
        id: 'vip2',
        name: '⭐⭐ VIP 2',
        icon: '⭐⭐',
        price: 300000000,
        dailyBonus: 20,
        betBonus: 10,
        extraBonus: 0
    },
    vip3: {
        id: 'vip3',
        name: '⭐⭐⭐ VIP 3',
        icon: '⭐⭐⭐',
        price: 500000000,
        dailyBonus: 30,
        betBonus: 15,
        extraBonus: 0
    },
    vip4: {
        id: 'vip4',
        name: '💎 VIP 4',
        icon: '💎',
        price: 1000000000,
        dailyBonus: 40,
        betBonus: 20,
        extraBonus: 0
    },
    vip5: {
        id: 'vip5',
        name: '💎⭐ VIP 5',
        icon: '💎⭐',
        price: 2000000000,
        dailyBonus: 50,
        betBonus: 25,
        extraBonus: 50
    },
    vip6: {
        id: 'vip6',
        name: '💎💎 VIP 6',
        icon: '💎💎',
        price: 5000000000,
        dailyBonus: 60,
        betBonus: 30,
        extraBonus: 50
    },
    vip7: {
        id: 'vip7',
        name: '👑 VIP 7',
        icon: '👑',
        price: 10000000000,
        dailyBonus: 70,
        betBonus: 35,
        extraBonus: 50
    },
    vip8: {
        id: 'vip8',
        name: '👑⭐ VIP 8',
        icon: '👑⭐',
        price: 15000000000,
        dailyBonus: 80,
        betBonus: 40,
        extraBonus: 50
    },
    vip9: {
        id: 'vip9',
        name: '👑💎 VIP 9',
        icon: '👑💎',
        price: 20000000000,
        dailyBonus: 90,
        betBonus: 45,
        extraBonus: 50
    },
    vip10: {
        id: 'vip10',
        name: '🔥👑 VIP 10',
        icon: '🔥👑',
        price: 50000000000,
        dailyBonus: 100,
        betBonus: 50,
        extraBonus: 50
    }
};

// ========================================
// DANH HIỆU TU TIÊN
// ========================================
const TITLE_ITEMS = {
    title_tanhu: {
        id: 'title_tanhu',
        name: 'Tân Thủ',
        price: 100000000,
        titleName: 'Tân Thủ',
        dailyBonus: 5,       // +5% điểm danh
        betBonus: 0,         // +0% thắng
        jackpotBonus: 0      // +0% jackpot
    },
    title_caothu: {
        id: 'title_caothu',
        name: 'Cao Thủ',
        price: 2000000000,
        titleName: 'Cao Thủ',
        dailyBonus: 10,
        betBonus: 0,
        jackpotBonus: 0
    },
    title_banthan: {
        id: 'title_banthan',
        name: 'Bán Thần',
        price: 5000000000,
        titleName: 'Bán Thần',
        dailyBonus: 10,
        betBonus: 5,
        jackpotBonus: 0
    },
    title_devuong: {
        id: 'title_devuong',
        name: 'Đế Vương',
        price: 1500000000,
        titleName: 'Đế Vương',
        dailyBonus: 13,
        betBonus: 5,
        jackpotBonus: 0
    },
    title_daithanh: {
        id: 'title_daithanh',
        name: 'Đại Thánh',
        price: 5000000000,
        titleName: 'Đại Thánh',
        dailyBonus: 16,
        betBonus: 5,
        jackpotBonus: 0
    },
    title_chienthan: {
        id: 'title_chienthan',
        name: 'Chiến Thần',
        price: 10000000000,
        titleName: 'Chiến Thần',
        dailyBonus: 20,
        betBonus: 10,
        jackpotBonus: 10     // +10% jackpot
    }
};

async function handleMShop(message) {
    const user = getUser(message.author.id);
    
    const vipIcon = user.vipLevel ? VIP_ITEMS[`vip${user.vipLevel}`]?.icon || '⭐' : '❌';
    
    const embed = new EmbedBuilder()
        .setTitle('🏪 CỬA HÀNG')
        .setColor('#f39c12')
        .setDescription(`
💰 **Số dư:** ${formatNumber(user.balance)} Mcoin
${vipIcon} **VIP hiện tại:** Level ${user.vipLevel || 0}
👑 **Danh hiệu:** ${user.vipTitle || 'Chưa có'}

**Chọn loại sản phẩm:**
🌟 **VIP 1-10** - Buff mạnh mẽ
⚔️ **Danh hiệu** - Tu tiên thăng cấp
        `)
        .setFooter({ text: 'Bấm nút để xem!' })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_vip')
                .setLabel('🌟 VIP 1-10')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('shop_titles')
                .setLabel('⚔️ Danh hiệu')
                .setStyle(ButtonStyle.Success)
        );
    
    await message.reply({ embeds: [embed], components: [row] });
}

async function showVipPackages(interaction) {
    const user = getUser(interaction.user.id);
    
    let vipText = '';
    for (let i = 1; i <= 10; i++) {
        const vip = VIP_ITEMS[`vip${i}`];
        const owned = user.vipLevel >= i ? '✅' : '❌';
        
        let bonusText = `+${vip.dailyBonus}% điểm danh, +${vip.betBonus}% thắng`;
        if (vip.extraBonus > 0) {
            bonusText += `, +${vip.extraBonus}% BONUS`;
        }
        
        vipText += `${owned} **${vip.name}**\n💰 ${formatNumber(vip.price)}\n📝 ${bonusText}\n━━━━━━━━━━━━━━\n`;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🌟 VIP 1-10')
        .setColor('#9b59b6')
        .setDescription(`
💰 **Số dư:** ${formatNumber(user.balance)}
⭐ **VIP hiện tại:** Level ${user.vipLevel || 0}

${vipText}
⚠️ **Mua VIP cao hơn sẽ GHI ĐÈ VIP cũ!**
        `)
        .setFooter({ text: 'Chọn menu để mua!' });
    
    const options = [];
    for (let i = 1; i <= 10; i++) {
        const vip = VIP_ITEMS[`vip${i}`];
        options.push({
            label: vip.name,
            description: `${formatNumber(vip.price)} Mcoin`,
            value: vip.id
        });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_vip')
        .setPlaceholder('Chọn gói VIP...')
        .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.update({ embeds: [embed], components: [row] });
}

async function showTitles(interaction) {
    const user = getUser(interaction.user.id);
    
    let titleText = '';
    Object.values(TITLE_ITEMS).forEach(title => {
        const owned = user.ownedTitles?.includes(title.id) ? '✅' : '❌';
        const active = user.vipTitle === title.titleName ? ' ◀ Đang dùng' : '';
        
        let bonusText = `+${title.dailyBonus}% điểm danh`;
        if (title.betBonus > 0) bonusText += `, +${title.betBonus}% thắng`;
        if (title.jackpotBonus > 0) bonusText += `, +${title.jackpotBonus}% jackpot`;
        
        titleText += `${owned} **${title.titleName}**${active}\n💰 ${formatNumber(title.price)}\n📝 ${bonusText}\n━━━━━━━━━━━━━━\n`;
    });
    
    const embed = new EmbedBuilder()
        .setTitle('⚔️ DANH HIỆU TU TIÊN')
        .setColor('#e91e63')
        .setDescription(`
💰 **Số dư:** ${formatNumber(user.balance)}
👑 **Hiện tại:** ${user.vipTitle || 'Chưa có'}

${titleText}
✨ **Mua xong hiển thị trên profile!**
        `)
        .setFooter({ text: 'Chọn menu để mua!' });
    
    const options = Object.values(TITLE_ITEMS).map(title => ({
        label: title.titleName,
        description: `${formatNumber(title.price)} Mcoin`,
        value: title.id
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_title')
        .setPlaceholder('Chọn danh hiệu...')
        .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.update({ embeds: [embed], components: [row] });
}

async function buyVipPackage(interaction, vipId) {
    const user = getUser(interaction.user.id);
    const vip = VIP_ITEMS[vipId];
    
    if (!vip) {
        return interaction.reply({ content: '❌ VIP không tồn tại!', ephemeral: true });
    }
    
    if (user.balance < vip.price) {
        return interaction.reply({ 
            content: `❌ Không đủ! Cần **${formatNumber(vip.price)}** nhưng chỉ có **${formatNumber(user.balance)}**!`,
            ephemeral: true 
        });
    }
    
    const vipLevel = parseInt(vipId.replace('vip', ''));
    
    if (user.vipLevel >= vipLevel) {
        return interaction.reply({ 
            content: `❌ Bạn đã có VIP ${user.vipLevel} rồi!`,
            ephemeral: true 
        });
    }
    
    user.balance -= vip.price;
    user.vipLevel = vipLevel;
    user.vipBonus = {
        dailyBonus: vip.dailyBonus,
        betBonus: vip.betBonus,
        extraBonus: vip.extraBonus
    };
    saveDB();
    
    let bonusText = `🎁 Điểm danh: +${vip.dailyBonus}%\n🎲 Thắng cược: +${vip.betBonus}%`;
    if (vip.extraBonus > 0) bonusText += `\n✨ BONUS thêm: +${vip.extraBonus}%`;
    
    const embed = new EmbedBuilder()
        .setTitle('✅ MUA VIP THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Bạn đã mua **${vip.name}**!

**Đặc quyền:**
${bonusText}

💰 **Số dư còn lại:** ${formatNumber(user.balance)}
        `)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function buyTitle(interaction, titleId) {
    const user = getUser(interaction.user.id);
    const title = TITLE_ITEMS[titleId];
    
    if (!title) {
        return interaction.reply({ content: '❌ Danh hiệu không tồn tại!', ephemeral: true });
    }
    
    if (!user.ownedTitles) user.ownedTitles = [];
    
    if (user.ownedTitles.includes(titleId)) {
        // Đã có thì chỉ trang bị
        user.vipTitle = title.titleName;
        user.titleBonus = {
            dailyBonus: title.dailyBonus,
            betBonus: title.betBonus,
            jackpotBonus: title.jackpotBonus
        };
        saveDB();
        
        return interaction.reply({ 
            content: `✅ Đã trang bị danh hiệu **${title.titleName}**!`,
            ephemeral: true 
        });
    }
    
    if (user.balance < title.price) {
        return interaction.reply({ 
            content: `❌ Không đủ! Cần **${formatNumber(title.price)}** nhưng chỉ có **${formatNumber(user.balance)}**!`,
            ephemeral: true 
        });
    }
    
    user.balance -= title.price;
    user.ownedTitles.push(titleId);
    user.vipTitle = title.titleName;
    user.titleBonus = {
        dailyBonus: title.dailyBonus,
        betBonus: title.betBonus,
        jackpotBonus: title.jackpotBonus
    };
    saveDB();
    
    let bonusText = `🎁 Điểm danh: +${title.dailyBonus}%`;
    if (title.betBonus > 0) bonusText += `\n🎲 Thắng cược: +${title.betBonus}%`;
    if (title.jackpotBonus > 0) bonusText += `\n🎰 Jackpot: +${title.jackpotBonus}%`;
    
    const embed = new EmbedBuilder()
        .setTitle('✅ MUA DANH HIỆU THÀNH CÔNG!')
        .setColor('#e91e63')
        .setDescription(`
Bạn đã mua **${title.titleName}**!

**Đặc quyền:**
${bonusText}

💰 **Số dư còn lại:** ${formatNumber(user.balance)}
✨ Hiển thị trên profile!
        `)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

module.exports = {
    handleMShop,
    showVipPackages,
    showTitles,
    buyVipPackage,
    buyTitle,
    VIP_ITEMS,
    TITLE_ITEMS
};
