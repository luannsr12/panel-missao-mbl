/**
 * @file providers/hypeauditor.js
 * @description Provider que faz requisições à API do HypeAuditor para obter sugestões de perfil.
 */

const https = require('https');
const { saveJson } = require('../../utils/save-json');
const path = require('path');

/**
 * Faz uma requisição GET à API do HypeAuditor.
 * @param {object} options - Opções para a requisição.
 * @param {string} options.platform - A plataforma da rede social (ex: 'youtube', 'instagram').
 * @param {string} options.username - O nome de usuário do perfil.
 * @param {string} options.dataDir - O diretório base para salvar os dados.
 * @param {string} options.baseUrl - URL base do provedor.
 * @param {object} options.selectedProviderConfig - Objeto de configuração do provedor selecionado.
 * @returns {Promise<void>} Uma promessa que resolve quando a requisição é concluída e os dados são salvos.
 */
async function scrape(options) {
    const { platform, username, dataDir, baseUrl, selectedProviderConfig } = options;

    let platformCode = '';
    switch (platform.toLowerCase()) {
        case 'youtube':
            platformCode = 'yt';
            break;
        case 'instagram':
            platformCode = 'ig';
            break;
        case 'tiktok':
            platformCode = 'tt';
                break;
        // Adicione outros casos conforme necessário
        default:
            console.error(`Plataforma ${platform} não suportada pelo provider HypeAuditor.`);
            return;
    }

    // Remove o '@' do username, se presente
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;

    const url = `${baseUrl}suggest/?search=${cleanUsername}&st=${platformCode}&excl_st=sn`;

    console.log(`Fazendo requisição HypeAuditor para: ${url}`);

    const urlObj = new URL(url);

    const requestOptions = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7',
            'Referer': 'https://hypeauditor.com/', // Simula que a requisição veio do site deles
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    const filename = `hypeauditor_${cleanUsername}_${platformCode}`;
                    const matchKeyword = `profile_data_hypeauditor_${platform}`; // Exemplo de palavra-chave
                    const matchDateTime = new Date().toISOString();
                    saveJson(dataDir, filename, jsonData, username, platform, options.selectedProviderConfig, null, matchKeyword, matchDateTime);
                    console.log(`Dados do HypeAuditor para ${cleanUsername} (${platform}) salvos com sucesso.`);
                    resolve();
                } catch (e) {
                    console.error(`Erro ao parsear ou salvar JSON do HypeAuditor para ${cleanUsername}:`, e.message);
                    console.error('Resposta recebida (não JSON):', data.substring(0, 500) + '...'); // Loga parte da resposta
                    reject(e);
                }
            });
        });

        req.on('error', (err) => {
            console.error(`Erro na requisição HypeAuditor para ${cleanUsername}:`, err.message);
            reject(err);
        });

        req.end();
    });
}

module.exports = {
    scrape,
};