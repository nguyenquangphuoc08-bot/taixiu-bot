// commands/shop.js - HỆ THỐNG VIP 1-10

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// VIP 1-10
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
        price: 18000000000,
        dailyBonus: 90,
        betBonus: 45,
        extraBonus: 50
    },
    vip10: {
        id: 'vip10',
        name: '🔥👑 VIP 10',
        icon: '🔥👑',
        price: 20000000000,
        dailyBonus: 100,
        betBonus: 50,
        extraBonus: 50
    },
    title_legend: {
        id: 'title_legend',
        name: '👑 Huyền Thoại',
        price: 100000000,
        titleName: 'Huyền Thoại'
    },
    title_dragon: {
        id: 'title_dragon',
        name: '🐉 Rồng Thần',
        price: 500000000,
        titleName: 'Rồng Thần'
    },
    title_god: {
        id: 'title_god',
        name: '🌟 Thần Tài',
        price: 3000000000,
        titleName: 'Thần Tài'
    }
};

async function handleMShop(message) {
    const user = getUser(message.author.id);
    
    const vipIcon = user.vipLevel ? VIP_ITEMS[`vip${user.vipLevel}`]?.icon || '⭐' : '❌';
    
    const embed = new EmbedBuilder()
        .setTitle('🏪 CỬA HÀNG VIP')
        .setColor('#f39c12')
        .setDescription(`
💰 **Số dư:** ${formatNumber(user.balance)} Mcoin
${vipIcon} **VIP hiện tại:** Level ${user.vipLevel || 0}
👑 **Danh hiệu:** ${user.vipTitle || 'Chưa có'}

**Chọn loại sản phẩm:**
🌟 **VIP 1-10** - Buff mạnh mẽ
👑 **Danh hiệu** - Tên đẹp
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
                .setLabel('👑 Danh hiệu')
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
        
        vipText += `
${owned} **${vip.name}**
💰 ${formatNumber(vip.price)}
📝 ${bonusText}
━━━━━━━━━━━━━━
`;
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
    Object.values(VIP_ITEMS).filter(item => item.titleName).forEach(title => {
        const owned = user.ownedTitles?.includes(title.id) ? '✅' : '❌';
        titleText += `
${owned} **${title.name}**
💰 ${formatNumber(title.price)}
━━━━━━━━━━━━━━
`;
    });
    
    const embed = new EmbedBuilder()
        .setTitle('👑 DANH HIỆU')
        .setColor('#e91e63')
        .setDescription(`
💰 **Số dư:** ${formatNumber(user.balance)}
👑 **Hiện tại:** ${user.vipTitle || 'Chưa có'}

${titleText}

✨ **Hiển thị trên profile!**
        `)
        .setFooter({ text: 'Chọn menu!' });
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_title')
        .setPlaceholder('Chọn danh hiệu...')
        .addOptions(
            Object.values(VIP_ITEMS)
                .filter(item => item.titleName)
                .map(title => ({
                    label: title.name,
                    description: `${formatNumber(title.price)} Mcoin`,
                    value: title.id
                }))
        );
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.update({ embeds: [embed], components: [row] });
}

async function buyVipPackage(interaction, vipId) {
    const user = getUser(interaction.user.id);
    const vip = VIP_ITEMS[vipId];
    
    if (!vip || !vip.dailyBonus) {
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
            content: `❌ Bạn đã có VIP ${user.vipLevel}!`,
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
    
    let bonusText = `
🎁 Điểm danh: +${vip.dailyBonus}%
🎲 Thắng cược: +${vip.betBonus}%`;
    
    if (vip.extraBonus > 0) {
        bonusText += `\n✨ BONUS thêm: +${vip.extraBonus}%`;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('✅ MUA VIP THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Bạn đã mua **${vip.name}**!

**Đặc quyền:**${bonusText}

💰 **Số dư:** ${formatNumber(user.balance)}
        `)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function buyTitle(interaction, titleId) {
    const user = getUser(interaction.user.id);
    const title = VIP_ITEMS[titleId];
    
    if (!title || !title.titleName) {
        return interaction.reply({ content: '❌ Danh hiệu không tồn tại!', ephemeral: true });
    }
    
    if (!user.ownedTitles) user.ownedTitles = [];
    
    if (user.ownedTitles.includes(titleId)) {
        return interaction.reply({ 
            content: `❌ Đã có **${title.name}**!`,
            ephemeral: true 
        });
    }
    
    if (user.balance < title.price) {
        return interaction.reply({ 
            content: `❌ Không đủ! Cần **${formatNumber(title.price)}**!`,
            ephemeral: true 
        });
    }
    
    user.balance -= title.price;
    user.ownedTitles.push(titleId);
    user.vipTitle = title.titleName;
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('✅ MUA DANH HIỆU THÀNH CÔNG!')
        .setColor('#e91e63')
        .setDescription(`
Bạn đã mua **${title.name}**!

👑 **Danh hiệu:** ${title.titleName}
💰 **Số dư:** ${formatNumber(user.balance)}

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
    VIP_ITEMS
};
