const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { saveJson } = require('../../utils/save-json'); // Importa saveJson

/**
 * Intercepta e salva respostas de rede que são do tipo JSON.
 * @param {object} page - Instância da página do Playwright.
 * @param {string} dataDir - Diretório base para salvar os dados.
 * @param {string} username - O nome de usuário atual para a estrutura de diretórios.
 * @param {string} platform - A plataforma atual para a estrutura de diretórios.
 * @param {object} providerConfig - O objeto de configuração do provedor, contendo jsonKeywordsForProfileData e jsonKeysForImageUrls.
 */
async function saveJsonResponses(page, dataDir, username, platform, providerConfig) {
    
    if (!page) return;
    
    const OUTPUT_DIR = path.join(dataDir, 'json_responses');

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    page.on('response', async (response) => {
        try {
            const contentType = response.headers()['content-type'];
            const url = response.url();

            // Verifica se o Content-Type indica JSON
            if (contentType && (contentType.includes('application/json') || contentType.includes('text/json'))) {
                console.log('JSON Response detectado:', url);

                const urlObj = new URL(url);
                let filename = urlObj.pathname.replace(/\//g, '-');
                if (filename.startsWith('-')) filename = filename.slice(1);
                if (!filename) filename = 'root'; // Para URLs como '/'

                // Adiciona um timestamp para garantir unicidade e evitar sobrescrever
                filename = `${filename}-${Date.now()}`;
                const savePath = path.join(OUTPUT_DIR, filename);

                const body = await response.text();

                try {
                    const json = JSON.parse(body);
                    // Chama saveJson com os novos parâmetros
                    saveJson(OUTPUT_DIR, filename, json, username, platform, providerConfig, page, `json_response_${filename}`, new Date().toISOString());
                } catch (e) {
                    // Não salva se não for JSON válido (pode ser um erro de parsing)
                    console.warn(`Erro ao parsear ou salvar JSON de ${url}:`, e.message);
                }
            }
        } catch (e) {
            // Ignora erros na interceptação ou processamento da resposta
            console.error(`Erro ao processar resposta de ${response.url()}:`, e.message);
        }
    });
}

module.exports = {
    saveJsonResponses,
};
