require('dotenv').config(); 

module.exports = {
    TOKEN: process.env.DISCORD_TOKEN,
    // Chuyển thành danh sách các Admin ID
    ADMIN_IDS: [
        '1100660298073002004', // Admin 1
        '1443158422110339134' // Admin 2 (thay ID thực tế vào đây)
    ],
    BACKUP_CHANNEL_ID: '1447477880329338962',
    GIFTCODE_CHANNEL_ID: '1378404733072703610',
    MAINTENANCE_CHANNEL_ID: '1378404733072703610',
    TOP_CHANNEL_ID: '1478412102044745829',
    PREFIX: '.'
};
