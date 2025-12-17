// handlers/shop.js - HỆ THỐNG CỬA HÀNG VIP

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');

// Danh sách VIP items
const VIP_ITEMS = {
    vip1: {
        id: 'vip1',
        name: '⭐ VIP 1',
        price: 50000000,
        dailyBonus: 2000000,
        betBonus: 5,
        description: '+2M điểm danh, +5% thắng cược'
    },
    vip2: {
        id: 'vip2',
        name: '⭐⭐ VIP 2',
        price: 1500000000,
        dailyBonus: 5000000,
        betBonus: 10,
        description: '+5M điểm danh, +10% thắng cược'
    },
    vip3: {
        id: 'vip3',
        name: '⭐⭐⭐ VIP 3',
        price: 5000000000,
        dailyBonus: 150000000,
        betBonus: 20,
        description: '+15M điểm danh, +20% thắng cược'
    },
    title_legend: {
        id: 'title_legend',
        name: '👑 Huyền Thoại',
        price: 100000000,
        titleName: 'Huyền Thoại',
        description: 'Danh hiệu độc quyền'
    },
    title_dragon: {
        id: 'title_dragon',
        name: '🐉 Rồng Thần',
        price: 200000000,
        titleName: 'Rồng Thần',
        description: 'Danh hiệu quý hiếm'
    },
    title_god: {
        id: 'title_god',
        name: '🌟 Thần Tài',
        price: 300000000,
        titleName: 'Thần Tài',
        description: 'Danh hiệu siêu VIP'
    }
};

// Lệnh: .mshop
async function handleMShop(message) {
    const user = getUser(message.author.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🏪 CỬA HÀNG VIP')
        .setColor('#f39c12')
        .setDescription(`
💰 **Số dư của bạn:** ${user.balance.toLocaleString('en-US')} Mcoin
⭐ **VIP hiện tại:** ${user.vipTitle || 'Chưa có'} (Level ${user.vipLevel || 0})

**Chọn loại sản phẩm:**
🌟 **VIP Package** - Buff điểm danh & thắng cược
👑 **Danh hiệu** - Tên đẹp, khẳng định đẳng cấp
        `)
        .setFooter({ text: 'Bấm nút bên dưới để xem sản phẩm!' })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_vip')
                .setLabel('🌟 VIP Package')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('shop_title')
                .setLabel('👑 Danh hiệu')
                .setStyle(ButtonStyle.Success)
        );
    
    await message.reply({ embeds: [embed], components: [row] });
}

// Hiển thị VIP packages
async function showVipPackages(interaction) {
    const user = getUser(interaction.user.id);
    
    let vipText = '';
    Object.values(VIP_ITEMS).filter(item => item.dailyBonus).forEach(vip => {
        const owned = user.vipLevel >= parseInt(vip.id.replace('vip', '')) ? '✅' : '❌';
        vipText += `
${owned} **${vip.name}**
💰 Giá: ${vip.price.toLocaleString('en-US')} Mcoin
📝 ${vip.description}
━━━━━━━━━━━━━━
`;
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🌟 VIP PACKAGES')
        .setColor('#9b59b6')
        .setDescription(`
💰 **Số dư:** ${user.balance.toLocaleString('en-US')} Mcoin
⭐ **VIP hiện tại:** Level ${user.vipLevel || 0}

${vipText}

⚠️ **Lưu ý:** Mua VIP cao hơn sẽ GHI ĐÈ VIP cũ!
        `)
        .setFooter({ text: 'Chọn menu bên dưới để mua!' });
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_vip')
        .setPlaceholder('Chọn gói VIP...')
        .addOptions(
            Object.values(VIP_ITEMS)
                .filter(item => item.dailyBonus)
                .map(vip => ({
                    label: vip.name,
                    description: `${vip.price.toLocaleString('en-US')} Mcoin - ${vip.description}`,
                    value: vip.id
                }))
        );
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.update({ embeds: [embed], components: [row] });
}

// Hiển thị danh hiệu
async function showTitles(interaction) {
    const user = getUser(interaction.user.id);
    
    let titleText = '';
    Object.values(VIP_ITEMS).filter(item => item.titleName).forEach(title => {
        const owned = user.ownedTitles?.includes(title.id) ? '✅' : '❌';
        titleText += `
${owned} **${title.name}**
💰 Giá: ${title.price.toLocaleString('en-US')} Mcoin
📝 ${title.description}
━━━━━━━━━━━━━━
`;
    });
    
    const embed = new EmbedBuilder()
        .setTitle('👑 DANH HIỆU')
        .setColor('#e91e63')
        .setDescription(`
💰 **Số dư:** ${user.balance.toLocaleString('en-US')} Mcoin
👑 **Danh hiệu hiện tại:** ${user.vipTitle || 'Chưa có'}

${titleText}

✨ **Danh hiệu sẽ hiển thị trên profile của bạn!**
        `)
        .setFooter({ text: 'Chọn menu để mua danh hiệu!' });
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_title')
        .setPlaceholder('Chọn danh hiệu...')
        .addOptions(
            Object.values(VIP_ITEMS)
                .filter(item => item.titleName)
                .map(title => ({
                    label: title.name,
                    description: `${title.price.toLocaleString('en-US')} Mcoin`,
                    value: title.id
                }))
        );
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.update({ embeds: [embed], components: [row] });
}

// Mua VIP package
async function buyVipPackage(interaction, vipId) {
    const user = getUser(interaction.user.id);
    const vip = VIP_ITEMS[vipId];
    
    if (!vip || !vip.dailyBonus) {
        return interaction.reply({ content: '❌ Gói VIP không tồn tại!', ephemeral: true });
    }
    
    if (user.balance < vip.price) {
        return interaction.reply({ 
            content: `❌ Không đủ tiền! Bạn cần **${vip.price.toLocaleString('en-US')} Mcoin** nhưng chỉ có **${user.balance.toLocaleString('en-US')} Mcoin**!`,
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
        betBonus: vip.betBonus
    };
    saveDB();
    
    const embed = new EmbedBuilder()
        .setTitle('✅ MUA VIP THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`
Bạn đã mua **${vip.name}**!

**Đặc quyền:**
🎁 Điểm danh: +${vip.dailyBonus.toLocaleString('en-US')} Mcoin
🎲 Thắng cược: +${vip.betBonus}%

💰 **Số dư còn lại:** ${user.balance.toLocaleString('en-US')} Mcoin
        `)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

// Mua danh hiệu
async function buyTitle(interaction, titleId) {
    const user = getUser(interaction.user.id);
    const title = VIP_ITEMS[titleId];
    
    if (!title || !title.titleName) {
        return interaction.reply({ content: '❌ Danh hiệu không tồn tại!', ephemeral: true });
    }
    
    if (!user.ownedTitles) user.ownedTitles = [];
    
    if (user.ownedTitles.includes(titleId)) {
        return interaction.reply({ 
            content: `❌ Bạn đã sở hữu danh hiệu **${title.name}** rồi!`,
            ephemeral: true 
        });
    }
    
    if (user.balance < title.price) {
        return interaction.reply({ 
            content: `❌ Không đủ tiền! Bạn cần **${title.price.toLocaleString('en-US')} Mcoin**!`,
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

👑 **Danh hiệu mới:** ${title.titleName}
💰 **Số dư còn lại:** ${user.balance.toLocaleString('en-US')} Mcoin

✨ Danh hiệu sẽ hiển thị trên profile của bạn!
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
