const db = require('../database');
const path = require('path');
const fs = require('fs');

const providerService = {
    async getAvailableProviders() {
        const providersDir = path.join(__dirname, '..', 'providers');
        const platformFolders = fs.readdirSync(providersDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const availableProviders = {};
        for (const folder of platformFolders) {
            const configPath = path.join(providersDir, folder, 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                availableProviders[config.name] = config.name;
            }
        }
        return availableProviders;
    },

    async getCurrentProviderSettings() {
        return await db.allAsync("SELECT * FROM provider_settings");
    },

    async updateProviderSetting(platform, provider_name) {
        await db.runAsync(
            "INSERT INTO provider_settings (platform, provider_name, is_default) " +
            "VALUES (?, ?, 1) " +
            "ON DUPLICATE KEY UPDATE is_default = 1",
            [platform, provider_name]
        );

        await db.runAsync(
            "UPDATE provider_settings SET is_default = 0 " +
            "WHERE platform = ? AND provider_name <> ?",
            [platform, provider_name]
        );
    }
};

module.exports = providerService;
