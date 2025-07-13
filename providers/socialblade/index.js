/**
 * @file providers/socialblade/index.js
 * @description Provedor Social Blade para scraping de dados do YouTube.
 */

const path = require('path');
const { saveJson } = require('../../utils/save-json');
const { downloadResource } = require('../../utils/save-image');

/**
 * Executa o scraping de um perfil no Social Blade usando Playwright.
 * @param {object} options - Opções para o scraping.
 * @param {string} options.username - O nome de usuário do perfil do YouTube.
 * @param {string} options.dataDir - O diretório base para salvar os dados.
 * @param {object} options.page - Instância da página Playwright.
 * @param {string} options.baseUrl - URL base do provedor.
 * @param {string} options.platform - A plataforma atual (e.g., 'youtube').
 * @param {object} options.selectedProviderConfig - O objeto de configuração do provedor.
 * @returns {Promise<void>} Uma promessa que resolve quando o scraping é concluído.
 */
async function scrape(options) {
    const { username, dataDir, page, baseUrl, platform, selectedProviderConfig } = options;

    const targetUrl = `${baseUrl}${username}`;

    try {
        console.log(`Navegando para: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });

        // Espera pelo seletor do número de inscritos
        await page.waitForSelector('#youtube-stats-header-subs', { timeout: 60000 });

        const profileData = await page.evaluate(() => {
            const subscriberCountElement = document.querySelector('#youtube-stats-header-subs');
            const subscriberCount = subscriberCountElement ? subscriberCountElement.innerText.replace(/[^\]d]/g, '') : null; // Remove caracteres não numéricos

            const profilePicElement = document.querySelector('img#YouTubeUserTopInfoAvatar');
            const profilePicUrl = profilePicElement ? profilePicElement.src : null;

            return {
                subscriberCount,
                profilePicUrl,
            };
        });

        if (profileData.profilePicUrl) {
            const profilePicPath = await downloadResource(profileData.profilePicUrl, dataDir, page);
            console.log(`Imagem de perfil salva em: ${profilePicPath}`);
        }

        const matchKeyword = `profile_data_socialblade_${platform}`; // Exemplo de palavra-chave
        const matchDateTime = new Date().toISOString();
        saveJson(dataDir, 'profile-data-socialblade', profileData, username, platform, selectedProviderConfig, page, matchKeyword, matchDateTime);
        console.log(`Dados do perfil salvos em: ${path.join(dataDir, 'profile-data-socialblade.json')}`);

    } catch (error) {
        console.error(`Erro ao realizar scraping de ${username} (Social Blade):`, error);
    }
}

module.exports = {
    scrape,
};
