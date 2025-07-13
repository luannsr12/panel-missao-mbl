/**
 * @file save-html.js
 * @description Módulo para salvar o HTML completo de uma página.
 */

const fs = require('fs');
const path = require('path');

/**
 * Salva o HTML completo de uma página.
 * @param {object} page - Instância da página do Playwright.
 * @param {string} dataDir - Diretório base para salvar os dados.
 * @param {string} filename - Nome do arquivo HTML a ser salvo (sem extensão).
 * @returns {Promise<void>} Uma promessa que resolve quando o HTML é salvo.
 */
async function saveHtml(page, dataDir, filename) {

    if (!page) return;
    
    const saveDir = path.join(dataDir, 'html');
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }

    const htmlContent = await page.content();
    const filePath = path.join(saveDir, `${filename}.html`);

    try {
        fs.writeFileSync(filePath, htmlContent);
        console.log(`HTML salvo em: ${filePath}`);
    } catch (e) {
        console.error(`Erro ao salvar HTML em ${filePath}:`, e.message);
    }
}

module.exports = {
    saveHtml,
};
