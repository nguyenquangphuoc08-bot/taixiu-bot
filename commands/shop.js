// commands/shop.js - CANVAS SHOP + PHAN TRANG + KC VIP 5+

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const { getUser, saveDB } = require('../utils/database');
const { createShopImage } = require('../utils/canvasShop');

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmt(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'b';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'k';
    return num.toLocaleString('en-US');
}

// ========================================
// VIP 1-10 (vip5+ can KC)
// ========================================
const VIP_ITEMS = {
    vip1:  { id: 'vip1',  name: '⭐ VIP 1',    icon: '⭐',     price: 100000000,    kcPrice: 0,      dailyBonus: 10,  betBonus: 5,  extraBonus: 0  },
    vip2:  { id: 'vip2',  name: '⭐⭐ VIP 2',  icon: '⭐⭐',   price: 300000000,    kcPrice: 0,      dailyBonus: 20,  betBonus: 10, extraBonus: 0  },
    vip3:  { id: 'vip3',  name: '⭐⭐⭐ VIP 3',icon: '⭐⭐⭐', price: 500000000,    kcPrice: 0,      dailyBonus: 30,  betBonus: 15, extraBonus: 0  },
    vip4:  { id: 'vip4',  name: '💎 VIP 4',    icon: '💎',     price: 1000000000,   kcPrice: 0,      dailyBonus: 40,  betBonus: 20, extraBonus: 0  },
    vip5:  { id: 'vip5',  name: '💎⭐ VIP 5',  icon: '💎⭐',   price: 2000000000,   kcPrice: 1000,   dailyBonus: 50,  betBonus: 25, extraBonus: 50 },
    vip6:  { id: 'vip6',  name: '💎💎 VIP 6',  icon: '💎💎',   price: 5000000000,   kcPrice: 3000,   dailyBonus: 60,  betBonus: 30, extraBonus: 50 },
    vip7:  { id: 'vip7',  name: '👑 VIP 7',    icon: '👑',     price: 10000000000,  kcPrice: 9000,   dailyBonus: 70,  betBonus: 35, extraBonus: 50 },
    vip8:  { id: 'vip8',  name: '👑⭐ VIP 8',  icon: '👑⭐',   price: 15000000000,  kcPrice: 27000,  dailyBonus: 80,  betBonus: 40, extraBonus: 50 },
    vip9:  { id: 'vip9',  name: '👑💎 VIP 9',  icon: '👑💎',   price: 20000000000,  kcPrice: 81000,  dailyBonus: 90,  betBonus: 45, extraBonus: 50 },
    vip10: { id: 'vip10', name: '🔥👑 VIP 10', icon: '🔥👑',   price: 50000000000,  kcPrice: 243000, dailyBonus: 100, betBonus: 50, extraBonus: 50 },
};

// ========================================
// DANH HIỆU TU TIÊN
// ========================================
const TITLE_ITEMS = {
    title_tanhu:    { id: 'title_tanhu',    name: 'Tân Thủ',    price: 100000000,    titleName: 'Tân Thủ',    dailyBonus: 5,   betBonus: 0,  jackpotBonus: 0  },
    title_caothu:   { id: 'title_caothu',   name: 'Cao Thủ',    price: 2000000000,   titleName: 'Cao Thủ',    dailyBonus: 10,  betBonus: 0,  jackpotBonus: 0  },
    title_banthan:  { id: 'title_banthan',  name: 'Bán Thần',   price: 5000000000,   titleName: 'Bán Thần',   dailyBonus: 10,  betBonus: 5,  jackpotBonus: 0  },
    title_devuong:  { id: 'title_devuong',  name: 'Đế Vương',   price: 10000000000,  titleName: 'Đế Vương',   dailyBonus: 13,  betBonus: 5,  jackpotBonus: 0  },
    title_daithanh: { id: 'title_daithanh', name: 'Đại Thánh',  price: 15000000000,  titleName: 'Đại Thánh',  dailyBonus: 16,  betBonus: 5,  jackpotBonus: 0  },
    title_chienthan:{ id: 'title_chienthan',name: 'Chiến Thần', price: 360000000000, titleName: 'Chiến Thần', dailyBonus: 200, betBonus: 10, jackpotBonus: 10 },
};

// ========================================
// KHUNG AVATAR
// ========================================
const FRAME_ITEMS = {
    frame_gold:   { id: 'frame_gold',   name: '🟡 Khung Vàng',  price: 500000000,  frame: 'gold',   desc: 'Viền vàng rực rỡ' },
    frame_fire:   { id: 'frame_fire',   name: '🔴 Khung Lửa',   price: 1000000000, frame: 'fire',   desc: 'Viền đỏ cam rực lửa' },
    frame_ice:    { id: 'frame_ice',    name: '🔵 Khung Băng',  price: 1000000000, frame: 'ice',    desc: 'Viền xanh băng giá' },
    frame_purple: { id: 'frame_purple', name: '🟣 Khung Tím',   price: 800000000,  frame: 'purple', desc: 'Viền tím huyền bí' },
    frame_green:  { id: 'frame_green',  name: '🟢 Khung Xanh',  price: 600000000,  frame: 'green',  desc: 'Viền xanh tươi mát' },
};

const ITEMS_PER_PAGE = 8;

function getOwnedIds(user) {
    const owned = [];
    if (user.vipLevel > 0) {
        for (let i = 1; i <= user.vipLevel; i++) owned.push(`vip${i}`);
    }
    if (user.ownedTitles) owned.push(...user.ownedTitles);
    if (user.ownedFrames) owned.push(...user.ownedFrames);
    return owned;
}

function buildShopComponents(items, page, totalPages, selectCustomId) {
    const pageItems = items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
    if (pageItems.length === 0) {
        const lastPage = Math.max(0, totalPages - 1);
        return buildShopComponents(items, lastPage, totalPages, selectCustomId);
    }

    const options = pageItems.map(item => {
        const isTitle = item.id.startsWith('title_');
        const isFrame = item.id.startsWith('frame_');
        let bonus = '';
        if (isTitle) bonus = `+${item.dailyBonus}% dd${item.betBonus > 0 ? ` +${item.betBonus}% TH` : ''}`;
        else if (isFrame) bonus = item.desc;
        else {
            bonus = `+${item.betBonus}% thắng`;
            if (item.kcPrice > 0) bonus += ` + ${fmt(item.kcPrice)}KC`;
        }
        return {
            label: (item.titleName || item.name).substring(0, 25),
            description: `${fmt(item.price)} | ${bonus}`.substring(0, 50),
            value: item.id,
        };
    });

    const tabKey = selectCustomId === 'buy_vip' ? 'vip' : selectCustomId === 'buy_title' ? 'title' : 'frame';

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(selectCustomId)
        .setPlaceholder(`Chọn vật phẩm (Trang ${page + 1}/${totalPages})`)
        .addOptions(options);

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`shop_prev_${tabKey}_${page}`)
            .setLabel('◀ Trước')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`shop_page_${tabKey}_${page}`)
            .setLabel('Nhập trang')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`shop_next_${tabKey}_${page}`)
            .setLabel('Sau ▶')
            .setStyle(ButtonStyle.Success)
            .setDisabled(page >= totalPages - 1),
    );

    return { selectRow: new ActionRowBuilder().addComponents(selectMenu), navRow, pageItems };
}

function buildTypeRow(active) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_tab_vip').setLabel('🌟 VIP').setStyle(active === 'vip' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shop_tab_titles').setLabel('⚔️ Danh Hiệu').setStyle(active === 'title' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shop_tab_frames').setLabel('🎨 Khung Avatar').setStyle(active === 'frame' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );
}

// ========================================
// .mshop
// ========================================
async function handleMShop(message) {
    const user = getUser(message.author.id);
    const ownedIds = getOwnedIds(user);
    const vipList = Object.values(VIP_ITEMS);
    const totalPages = Math.ceil(vipList.length / ITEMS_PER_PAGE);
    const imgBuffer = await createShopImage(vipList.slice(0, ITEMS_PER_PAGE), 'VIP (Trang 1/' + totalPages + ')', ownedIds, 1, totalPages);
    const { selectRow, navRow } = buildShopComponents(vipList, 0, totalPages, 'buy_vip');
    await message.reply({
        content: `💰 **Số dư:** ${formatNumber(user.balance)} | 💎 **${user.diamonds || 0} KC** | 👑 VIP ${user.vipLevel || 0}`,
        files: [new AttachmentBuilder(imgBuffer, { name: 'shop.png' })],
        components: [buildTypeRow('vip'), navRow, selectRow],
    });
}

// ========================================
// SHOW PAGES
// ========================================
async function showVipPage(interaction, page) {
    const user = getUser(interaction.user.id);
    const ownedIds = getOwnedIds(user);
    const vipList = Object.values(VIP_ITEMS);
    const totalPages = Math.ceil(vipList.length / ITEMS_PER_PAGE);
    const p = Math.max(0, Math.min(page, totalPages - 1));
    const pageItems = vipList.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);
    const imgBuffer = await createShopImage(pageItems, `VIP (Trang ${p + 1}/${totalPages})`, ownedIds, p + 1, totalPages);
    const { selectRow, navRow } = buildShopComponents(vipList, p, totalPages, 'buy_vip');
    const payload = {
        content: `💰 **Số dư:** ${formatNumber(user.balance)} | 💎 **${user.diamonds || 0} KC** | 👑 VIP ${user.vipLevel || 0}`,
        attachments: [],
        files: [new AttachmentBuilder(imgBuffer, { name: 'shop.png' })],
        components: [buildTypeRow('vip'), navRow, selectRow],
    };
    if (interaction.isModalSubmit()) await interaction.reply(payload);
    else await interaction.update(payload);
}

async function showTitlePage(interaction, page) {
    const user = getUser(interaction.user.id);
    const ownedIds = getOwnedIds(user);
    const titleList = Object.values(TITLE_ITEMS);
    const totalPages = Math.ceil(titleList.length / ITEMS_PER_PAGE);
    const p = Math.max(0, Math.min(page, totalPages - 1));
    const pageItems = titleList.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);
    const imgBuffer = await createShopImage(pageItems, `Danh Hiệu (Trang ${p + 1}/${totalPages})`, ownedIds, p + 1, totalPages);
    const { selectRow, navRow } = buildShopComponents(titleList, p, totalPages, 'buy_title');
    const payload = {
        content: `💰 **Số dư:** ${formatNumber(user.balance)} | 👑 ${user.vipTitle || 'Chưa có danh hiệu'}`,
        attachments: [],
        files: [new AttachmentBuilder(imgBuffer, { name: 'shop.png' })],
        components: [buildTypeRow('title'), navRow, selectRow],
    };
    if (interaction.isModalSubmit()) await interaction.reply(payload);
    else await interaction.update(payload);
}

async function showFramePage(interaction, page) {
    const user = getUser(interaction.user.id);
    const ownedIds = getOwnedIds(user);
    const frameList = Object.values(FRAME_ITEMS);
    const totalPages = Math.ceil(frameList.length / ITEMS_PER_PAGE);
    const p = Math.max(0, Math.min(page, totalPages - 1));
    const pageItems = frameList.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);
    const imgBuffer = await createShopImage(pageItems, `Khung Avatar (Trang ${p + 1}/${totalPages})`, ownedIds, p + 1, totalPages);
    const { selectRow, navRow } = buildShopComponents(frameList, p, totalPages, 'buy_frame');
    const payload = {
        content: `💰 **Số dư:** ${formatNumber(user.balance)} | 🎨 Khung: ${user.frame || 'Mặc định'}`,
        attachments: [],
        files: [new AttachmentBuilder(imgBuffer, { name: 'shop.png' })],
        components: [buildTypeRow('frame'), navRow, selectRow],
    };
    if (interaction.isModalSubmit()) await interaction.reply(payload);
    else await interaction.update(payload);
}

async function showVipPackages(interaction) { return showVipPage(interaction, 0); }
async function showTitles(interaction) { return showTitlePage(interaction, 0); }

// ========================================
// MUA VIP
// ========================================
async function buyVipPackage(interaction, vipId) {
    const user = getUser(interaction.user.id);
    const vip = VIP_ITEMS[vipId];
    if (!vip) return interaction.reply({ content: '❌ VIP không tồn tại!', ephemeral: true });

    const vipLevel = parseInt(vipId.replace('vip', ''));
    if (user.vipLevel >= vipLevel)
        return interaction.reply({ content: `❌ Bạn đã có VIP ${user.vipLevel} rồi!`, ephemeral: true });

    if (user.balance < vip.price)
        return interaction.reply({ content: `❌ Không đủ Mcoin! Cần **${fmt(vip.price)}** nhưng có **${fmt(user.balance)}**`, ephemeral: true });

    if (vip.kcPrice > 0 && (user.diamonds || 0) < vip.kcPrice)
        return interaction.reply({ content: `❌ Không đủ Kim Cương! Cần **${vip.kcPrice} KC** nhưng có **${user.diamonds || 0} KC**`, ephemeral: true });

    user.balance -= vip.price;
    if (vip.kcPrice > 0) user.diamonds = (user.diamonds || 0) - vip.kcPrice;
    user.vipLevel = vipLevel;
    user.vipBonus = { dailyBonus: vip.dailyBonus, betBonus: vip.betBonus, extraBonus: vip.extraBonus };
    saveDB();

    let bonusText = `🎁 Điểm danh: +${vip.dailyBonus}%\n🎲 Thắng cược: +${vip.betBonus}%`;
    if (vip.extraBonus > 0) bonusText += `\n✨ BONUS: +${vip.extraBonus}%`;
    let costText = `💰 ${fmt(vip.price)}`;
    if (vip.kcPrice > 0) costText += ` + 💎 ${vip.kcPrice} KC`;

    const embed = new EmbedBuilder()
        .setTitle('✅ MUA VIP THÀNH CÔNG!')
        .setColor('#2ecc71')
        .setDescription(`Bạn đã mua **${vip.name}**!\n\n${bonusText}\n\n${costText} đã được trừ`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ========================================
// MUA DANH HIỆU
// ========================================
async function buyTitle(interaction, titleId) {
    const user = getUser(interaction.user.id);
    const title = TITLE_ITEMS[titleId];
    if (!title) return interaction.reply({ content: '❌ Danh hiệu không tồn tại!', ephemeral: true });
    if (!user.ownedTitles) user.ownedTitles = [];

    if (user.ownedTitles.includes(titleId)) {
        user.vipTitle = title.titleName;
        user.titleBonus = { dailyBonus: title.dailyBonus, betBonus: title.betBonus, jackpotBonus: title.jackpotBonus };
        saveDB();
        return interaction.reply({ content: `✅ Đã trang bị danh hiệu **${title.titleName}**!`, ephemeral: true });
    }

    if (user.balance < title.price)
        return interaction.reply({ content: `❌ Không đủ! Cần **${fmt(title.price)}** nhưng có **${fmt(user.balance)}**`, ephemeral: true });

    user.balance -= title.price;
    user.ownedTitles.push(titleId);
    user.vipTitle = title.titleName;
    user.titleBonus = { dailyBonus: title.dailyBonus, betBonus: title.betBonus, jackpotBonus: title.jackpotBonus };
    saveDB();

    let bonusText = `🎁 Điểm danh: +${title.dailyBonus}%`;
    if (title.betBonus > 0) bonusText += `\n🎲 Thắng cược: +${title.betBonus}%`;
    if (title.jackpotBonus > 0) bonusText += `\n🎰 Jackpot: +${title.jackpotBonus}%`;

    const embed = new EmbedBuilder()
        .setTitle('✅ MUA DANH HIỆU THÀNH CÔNG!')
        .setColor('#e91e63')
        .setDescription(`Bạn đã mua **${title.titleName}**!\n\n${bonusText}\n\n💰 Còn lại: **${fmt(user.balance)}**`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ========================================
// MUA KHUNG AVATAR
// ========================================
async function buyFrame(interaction, frameId) {
    const user = getUser(interaction.user.id);
    const frame = FRAME_ITEMS[frameId];
    if (!frame) return interaction.reply({ content: '❌ Khung không tồn tại!', ephemeral: true });
    if (!user.ownedFrames) user.ownedFrames = [];

    if (user.ownedFrames.includes(frameId)) {
        user.frame = frame.frame;
        saveDB();
        return interaction.reply({ content: `✅ Đã trang bị **${frame.name}**! Xem ngay: \`.mcoin\``, ephemeral: true });
    }

    if (user.balance < frame.price)
        return interaction.reply({ content: `❌ Không đủ! Cần **${fmt(frame.price)}** nhưng có **${fmt(user.balance)}**`, ephemeral: true });

    user.balance -= frame.price;
    user.ownedFrames.push(frameId);
    user.frame = frame.frame;
    saveDB();

    const embed = new EmbedBuilder()
        .setTitle('✅ MUA KHUNG THÀNH CÔNG!')
        .setColor('#FFD700')
        .setDescription(`Bạn đã mua **${frame.name}**!\n${frame.desc}\n\n💰 Còn lại: **${fmt(user.balance)}**\n\nXem ngay: \`.mcoin\``)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = {
    handleMShop,
    showVipPage,
    showTitlePage,
    showFramePage,
    showVipPackages,
    showTitles,
    buyVipPackage,
    buyTitle,
    buyFrame,
    VIP_ITEMS,
    TITLE_ITEMS,
    FRAME_ITEMS,
};
