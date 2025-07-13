/**
 * @file metaSaver.js
 * @description Módulo para salvar meta tags de uma página.
 */

const fs = require('fs');
const path = require('path');

/**
 * Salva todas as meta tags de uma página.
 * @param {object} page - Instância da página do Playwright.
 * @param {string} dataDir - Diretório base para salvar os dados.
 */
async function saveMetas(page, dataDir){

    if (!page) return;
    
    const OUTPUT_DIR = path.join(dataDir, 'meta-tags');

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const metaTags = await page.evaluate(() => {
        const meta = Array.from(document.querySelectorAll('meta'));
        return meta.map(tag => tag.outerHTML).join('\n');
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, `meta.html`), metaTags);
}

module.exports = {
    saveMetas,
};
