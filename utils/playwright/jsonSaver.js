const fs = require('fs');
const path = require('path');
const { saveJson } = require('../../utils/save-json'); // Importa saveJson

/**
 * Salva scripts com tipo 'application/json' ou 'application/ld+json' encontrados na página.
 * @param {object} page - Instância da página do Playwright.
 * @param {string} dataDir - Diretório base para salvar os dados.
 * @param {string} username - O nome de usuário atual para a estrutura de diretórios.
 * @param {string} platform - A plataforma atual para a estrutura de diretórios.
 * @param {object} providerConfig - O objeto de configuração do provedor.
 */
async function saveJsonScripts(page, dataDir, username, platform, providerConfig) {

    if (!page) return;
    
    const saveDir = path.join(dataDir, 'application-json');
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }

    const scripts = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('script[type]'));
        const filtered = nodes.filter(node =>
            node.type.includes('application/json') || node.type.includes('application/ld+json')
        );
        return filtered.map(node => ({
            label: node.id || (typeof node.className === 'string' ? node.className : ''),
            json: node.innerText.trim()
        }));
    });

    for (const { label, json } of scripts) {
        if (!json) continue;
        let filename;
        if (label) {
            filename = `${label.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '')}`;
        } else {
            filename = `${Date.now()}`;
        }

        try {
            const parsed = JSON.parse(json);
            // Passa todos os parâmetros necessários para saveJson, incluindo a instância 'page'
            await saveJson(saveDir, filename, parsed, username, platform, providerConfig, page, `script_json_${label}`, new Date().toISOString());
        } catch (e) {
            // Não salva se não for JSON válido
            console.warn(`Erro ao parsear ou salvar JSON de script: ${e.message}`);
        }
    }
}

module.exports = {
    saveJsonScripts,
};
