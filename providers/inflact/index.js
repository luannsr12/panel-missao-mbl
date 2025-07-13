/**
 * @file providers/inflact/index.js
 * @description Provedor Inflact que utiliza Playwright para scraping.
 */

const path = require('path');
const fs = require('fs');

// Importa as funções utilitárias específicas do Playwright
const { saveJsonScripts } = require('../../utils/playwright/jsonSaver');
const { setupImageRequestInterceptor } = require('../../utils/playwright/imageSaver');
const { saveMetas } = require('../../utils/playwright/metaSaver');
const { saveApi } = require('../../utils/playwright/apiSaver'); // Importa saveApi
const { saveJsonResponses } = require('../../utils/playwright/jsonResponseSaver'); // Importa saveJsonResponses
const { saveHtml } = require('../../utils/playwright/save-html');

/**
 * Executa o scraping de um perfil no Inflact usando Playwright.
 * @param {object} options - Opções para o scraping.
 * @param {string} options.username - O nome de usuário do perfil.
 * @param {string} options.dataDir - O diretório base para salvar os dados.
 * @param {object} options.browser - Instância do navegador Playwright.
 * @param {object} options.page - Instância da página Playwright.
 * @param {string} options.baseUrl - URL base do provedor.
 * @param {object} options.selectedProviderConfig - Objeto de configuração do provedor selecionado.
 * @returns {Promise<void>} Uma promessa que resolve quando o scraping é concluído.
 */
async function scrape(options) {
    const { username, dataDir, browser, page, baseUrl, selectedProviderConfig, platform } = options;

    const targetUrl = `${baseUrl}${username}`;

    try {
        // Configura os ouvintes ANTES de navegar para garantir a interceptação de requisições
        await saveApi(page, dataDir);
        await saveJsonResponses(page, dataDir, username, platform, selectedProviderConfig);
        await setupImageRequestInterceptor(page, dataDir);

        console.log(`Navegando para: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90000 }); // Alterado para domcontentloaded
        // Espera por um seletor que indica que o conteúdo principal foi carregado
        await page.waitForSelector('body'); // Exemplo: pode ser um seletor mais específico como 'div.profile-data'
        await page.waitForTimeout(5000); // Espera adicional de 5 segundos para carregamento dinâmico

        // Executa as funções de salvamento
        await saveJsonScripts(page, dataDir, username, platform, selectedProviderConfig);
        await saveMetas(page, dataDir);
        await saveHtml(page, dataDir, `page-${username}`);

        // Screenshot da página do perfil
        await page.screenshot({ path: path.join(dataDir, `screenshot-${username}.png`) });

        console.log(`Scraping de ${username} (Inflact) concluído com sucesso.`);

    } catch (error) {
        console.error(`Erro ao realizar scraping de ${username} (Inflact):`, error);
    }
}

module.exports = {
    scrape,
};
