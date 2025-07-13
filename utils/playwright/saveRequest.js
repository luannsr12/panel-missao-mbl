const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { saveJson } = require('../../utils/save-json'); // Importa saveJson

/**
 * Intercepta requisições de rede e salva o conteúdo da resposta em um diretório customizado,
 * filtrando por um termo na URL da requisição.
 * @param {object} page - Instância da página do Playwright.
 * @param {string} dataDir - Diretório base para salvar os dados.
 * @param {string|string[]} urlFilter - Termo(s) a ser(em) procurado(s) na URL da requisição para salvar a resposta.
 */
async function saveRequest(page, dataDir, urlFilter) {

    if (!page) return;
    
    console.log(`[saveRequest] Setting up request interception for filters: ${JSON.stringify(urlFilter)}`);
    const saveDir = path.join(dataDir, 'custom-save');
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }

    page.on('response', async (response) => {
        console.log(`[saveRequest] Response intercepted: ${response.url()}`);
        try {
            const url = response.url();
            let shouldSave = false;

            if (Array.isArray(urlFilter)) {
                shouldSave = urlFilter.some(filterTerm => {
                    const includesTerm = url.includes(filterTerm);
                    console.log(`[saveRequest] Checking URL: ${url} against filter: ${filterTerm}. Includes: ${includesTerm}`);
                    return includesTerm;
                });
            } else {
                shouldSave = url.includes(urlFilter);
                console.log(`[saveRequest] Checking URL: ${url} against filter: ${urlFilter}. Includes: ${shouldSave}`);
            }

            if (shouldSave) {
                console.log(`[saveRequest] URL matches filter, attempting to save: ${url}`);
                const contentType = response.headers()['content-type'] || '';
                const urlObj = new URL(url);
                let filename = path.basename(urlObj.pathname);
                let extension = '';

                // Tenta determinar a extensão com base no Content-Type ou na URL
                if (contentType.includes('image/')) {
                    extension = '.' + contentType.split('/')[1];
                } else if (contentType.includes('application/json') || contentType.includes('text/json')) {
                    extension = '.json';
                } else if (contentType.includes('text/html')) {
                    extension = '.html';
                } else if (contentType.includes('video/')) {
                    extension = '.' + contentType.split('/')[1];
                } else if (filename.includes('.')) {
                    extension = path.extname(filename);
                    filename = path.basename(filename, extension);
                }

                // Garante um nome de arquivo único
                let counter = 0;
                let finalFilename = `${filename || 'response'}${extension}`;
                let savePath = path.join(saveDir, finalFilename);

                while (fs.existsSync(savePath)) {
                    counter++;
                    finalFilename = `${filename || 'response'}-${counter}${extension}`;
                    savePath = path.join(saveDir, finalFilename);
                }

                let buffer;
                try {
                    // Verifica se a resposta foi bem-sucedida e se response.buffer é uma função
                    if (response.ok() && typeof response.buffer === 'function') {
                        buffer = await response.buffer();
                        console.log(`[saveRequest] Buffer obtained for ${url}`);
                    } else {
                        console.warn(`[saveRequest] Não foi possível obter o buffer da resposta para ${url}: Resposta não OK ou buffer não disponível. Status: ${response.status()}`);
                        return; // Pula se não conseguir o buffer
                    }
                } catch (e) {
                    console.warn(`[saveRequest] Erro ao obter o buffer da resposta para ${url}: ${e.message}`);
                    return; // Pula se não conseguir o buffer
                }

                // Se for JSON, usa saveJson
                if (extension === '.json') {
                    try {
                        const json = JSON.parse(buffer.toString());
                        const matchKeyword = `custom_save_json_${filename}`;
                        const matchDateTime = new Date().toISOString();
                        saveJson(saveDir, filename, json, null, null, null, page, matchKeyword, matchDateTime);
                        console.log(`Resposta JSON salva via saveJson: ${savePath} (URL: ${url})`);
                    } catch (e) {
                        console.warn(`[saveRequest] Erro ao parsear JSON para saveJson, salvando como texto: ${e.message}`);
                        fs.writeFileSync(savePath, buffer);
                        console.log(`Resposta salva: ${savePath} (URL: ${url})`);
                    }
                } else {
                    fs.writeFileSync(savePath, buffer);
                    console.log(`Resposta salva: ${savePath} (URL: ${url})`);
                }
            } else {
                console.log(`[saveRequest] URL does not match filter: ${url}`);
            }
        } catch (e) {
            console.error(`[saveRequest] Erro ao salvar requisição: ${e.message}`);
        }
    });
}

module.exports = {
    saveRequest,
};