/**
 * @file providers/default_playwright.js
 * @description Provider padrão que utiliza Playwright para scraping.
 */

const path = require('path');
const fs = require('fs');

// Importa as funções utilitárias específicas do Playwright
const { saveJsonScripts } = require('../../utils/playwright/jsonSaver');
const { setupImageRequestInterceptor } = require('../../utils/playwright/imageSaver');
const { saveMetas } = require('../../utils/playwright/metaSaver');
const { saveApi } = require('../../utils/playwright/apiSaver');
const { saveJsonResponses } = require('../../utils/playwright/jsonResponseSaver');
const { saveRequest } = require('../../utils/playwright/saveRequest');

// Importa as funções utilitárias genéricas
const { buildProfileUrl } = require('../../utils/url-builder');

/**
 * Executa o scraping de um perfil usando Playwright.
 * @param {object} options - Opções para o scraping.
 * @param {string} options.platform - A plataforma da rede social (ex: 'instagram', 'youtube').
 * @param {string} options.username - O nome de usuário do perfil.
 * @param {string} options.dataDir - O diretório base para salvar os dados.
 * @param {object} options.browser - Instância do navegador Playwright.
 * @param {object} options.page - Instância da página Playwright.
 * @param {object} options.baseUrl - URL base do provedor.
 * @param {object} options.selectedProviderConfig - Objeto de configuração do provedor selecionado.
 * @returns {Promise<void>} Uma promessa que resolve quando o scraping é concluído.
 */
async function scrape(options) {
    const { platform, username, dataDir, browser, page, baseUrl, selectedProviderConfig } = options;

    const url_plataform = baseUrl || buildProfileUrl(platform, username);

    if (!url_plataform) {
        console.error(`Não foi possível gerar a URL para a plataforma ${platform} e usuário ${username}.`);
        return;
    }

    try {
        // Configura os ouvintes ANTES de navegar para garantir a interceptação de requisições
        await saveApi(page, dataDir);
        await saveJsonResponses(page, dataDir, username, platform, selectedProviderConfig, page);
        await setupImageRequestInterceptor(page, dataDir);
        await saveRequest(page, dataDir, ['web_profile_info', username], page);

        console.log(`Navegando para: ${url_plataform}`);
        await page.goto(url_plataform, { waitUntil: 'networkidle', timeout: 90000 }); // Alterado para networkidle
        await page.waitForTimeout(5000); // Espera adicional de 5 segundos para carregamento dinâmico

        // Adicionar lógica de extração de dados de perfil aqui
        let profileData = {};
        if (platform === 'youtube') {
            profileData = await page.evaluate(() => {
                const subscriberCountElement = document.querySelector('#subscriber-count');
                const subscriberCount = subscriberCountElement ? subscriberCountElement.innerText.trim() : null;

                const profilePicElement = document.querySelector('#img.yt-img-shadow'); // Seletor comum para imagem de perfil
                const profilePicUrl = profilePicElement ? profilePicElement.src : null;

                return {
                    subscriberCount,
                    profilePicUrl,
                };
            });
        }
        // ... (adicionar lógica para outras plataformas se o provedor default for genérico) ...

        // Salvar os dados do perfil
        if (Object.keys(profileData).length > 0) {
            const matchKeyword = `profile_data_default_${platform}`; // Exemplo de palavra-chave
            const matchDateTime = new Date().toISOString();
            saveJson(dataDir, `profile-data-default-${platform}`, profileData, username, platform, selectedProviderConfig, page, matchKeyword, matchDateTime);
            console.log(`Dados do perfil salvos em: ${path.join(dataDir, `profile-data-default-${platform}.json`)}`);
        } else {
            console.log(`Nenhum dado de perfil extraído para ${username} (${platform}) usando o provedor default.`);
        }

    } catch (error) {
        console.error(`Erro ao realizar scraping de ${username} (${platform}):`, error);
    }
}

module.exports = {
    scrape,
};
