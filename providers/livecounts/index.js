/**
 * @file providers/livecounts/index.js
 * @description Provedor Livecounts para scraping de dados do YouTube.
 */

const path = require('path');
const { saveJson } = require('../../utils/save-json');
const { downloadResource } = require('../../utils/save-image');

/**
 * Executa o scraping de um perfil no Livecounts usando Playwright.
 * @param {object} options - Opções para o scraping.
 * @param {string} options.username - O nome de usuário do perfil do YouTube.
 * @param {string} options.dataDir - O diretório base para salvar os dados.
 * @param {object} options.page - Instância da página Playwright.
 * @param {string} options.baseUrl - URL base do provedor.
 * @returns {Promise<void>} Uma promessa que resolve quando o scraping é concluído.
 */
async function scrape(options) {
    const { username, dataDir, page, baseUrl, platform, selectedProviderConfig } = options;

    const targetUrl = `${baseUrl}${username}`;

    try {
        console.log(`Navegando para: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle' });

        await page.waitForSelector('.odometer-inside', { timeout: 60000 });

        const profileData = await page.evaluate(() => {
            const subscriberCount = document.querySelector('.odometer-inside')?.innerText;
            const profilePicUrl = document.querySelector('img.user-img')?.src;

            return {
                subscriberCount,
                profilePicUrl,
            };
        });

        if (profileData.profilePicUrl) {
            const profilePicPath = await downloadResource(profileData.profilePicUrl, dataDir, page);
            console.log(`Imagem de perfil salva em: ${profilePicPath}`);
        }

        const profileDataPath = path.join(dataDir, `profile-data-livecounts.json`);
        const matchKeyword = `profile_data_livecounts_${platform}`; // Exemplo de palavra-chave
        const matchDateTime = new Date().toISOString();
        saveJson(dataDir, 'profile-data-livecounts', profileData, username, platform, selectedProviderConfig, page, matchKeyword, matchDateTime);
        console.log(`Dados do perfil salvos em: ${profileDataPath}`);

    } catch (error) {
        console.error(`Erro ao realizar scraping de ${username} (Livecounts):`, error);
    }
}

module.exports = {
    scrape,
};
