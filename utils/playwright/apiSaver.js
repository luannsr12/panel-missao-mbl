const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { saveJson } = require('../../utils/save-json'); // Importa saveJson

/**
 * Intercepta e salva respostas de API que contenham padrões comuns de API na URL.
 * @param {object} page - Instância da página do Playwright.
 * @param {string} dataDir - Diretório base para salvar os dados.
 */
async function saveApi(page, dataDir){

    if (!page) return;

    const OUTPUT_DIR = path.join(dataDir, 'requests');

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Expressão regular para capturar URLs que contenham 'api', 'v1', 'v2', etc., ou 'api.' no hostname
    const apiRegex = /(api|v\d+)/i;

    page.on('response', async (response) => {
        try {
            const url = response.url();
            const urlObj = new URL(url);

            // Verifica se a URL ou o hostname contêm padrões de API
            if (apiRegex.test(urlObj.pathname) || apiRegex.test(urlObj.hostname)) {
                console.log('API URL detectada:', url);

                let endpoint = urlObj.pathname.replace(/\//g, '-');
                if (endpoint.startsWith('-')) endpoint = endpoint.slice(1);
                
                // Adiciona um hash ou timestamp para evitar colisões de nome de arquivo
                const filename = `${endpoint}-${Date.now()}`; // Removido .json aqui, saveJson adiciona

                const body = await response.text();

                try {
                    const json = JSON.parse(body);
                    const matchKeyword = `api_response_${endpoint}`; // Exemplo de palavra-chave
                    const matchDateTime = new Date().toISOString();
                    // Chama saveJson para salvar o JSON
                    saveJson(OUTPUT_DIR, filename, json, null, null, null, page, matchKeyword, matchDateTime);
                    console.log('Salvo:', path.join(OUTPUT_DIR, `${filename}.json`));
                } catch (e) {
                    // Não salva se não for JSON válido (pode ser HTML, CSS, JS, etc.)
                    // console.warn(`Conteúdo não JSON para ${url}:`, e.message);
                }
            }
        } catch (e) {
            // Ignora erros na interceptação ou processamento da resposta
            // console.error(`Erro ao processar resposta de ${response.url()}:`, e.message);
        }
    });
}

module.exports = {
    saveApi,
};
