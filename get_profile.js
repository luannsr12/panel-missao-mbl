"use strict";
require('dotenv').config();
//require('./logger');

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const axios = require('axios');
const { buildProfileUrl } = require('./utils/url-builder');

// Timeout padrão para requisição de webhook (ms)
const WEBHOOK_TIMEOUT = 10000;
const WEBHOOK_RETRIES = 3;
const WEBHOOK_RETRY_DELAY = 1000;

/**
 * Carrega configurações de todos os provedores de pasta ./providers
 * @returns {Promise<Object<string, object>>}
 */
async function loadProvidersConfig() {
    const cfg = {};
    const dir = path.join(__dirname, 'providers');
    try {
        for (const name of fs.readdirSync(dir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)) {
            const file = path.join(dir, name, 'config.json');
            if (fs.existsSync(file)) {
                const json = fs.readFileSync(file, 'utf8');
                const conf = JSON.parse(json);
                if (conf.name) cfg[conf.name] = conf;
            }
        }
    } catch (err) {
        console.error('[loadProvidersConfig] Falha ao carregar configs:', err);
    }
    return cfg;
}

/**
 * Envia payload para webhook com retries
 * @param {object} payload
 * @returns {Promise<boolean>} sucesso
 */
async function sendWebhook(payload) {
    const host = process.env.APP_HOST || 'localhost';
    const port = process.env.APP_PORT || '3000';
    const url = `http://${host}:${port}/webhook/scraping-completed`;

    for (let attempt = 1; attempt <= WEBHOOK_RETRIES; attempt++) {
        try {
            console.log(`[sendWebhook] Tentativa ${attempt} para ${url}`);
            await axios.post(url, payload, { timeout: WEBHOOK_TIMEOUT });
            console.log('[sendWebhook] Webhook enviado com sucesso.');
            return true;
        } catch (err) {
            console.error(`[sendWebhook] Erro (tentativa ${attempt}):`, err.message);
            if (attempt < WEBHOOK_RETRIES) await new Promise(r => setTimeout(r, WEBHOOK_RETRY_DELAY));
        }
    }
    console.error('[sendWebhook] Todas as tentativas falharam.');
    return false;
}

/**
 * Função principal de scraping
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 5) {
        console.error('Uso: node get_profile.js <platform> <username> <provider> <profileId> <userId>');
        process.exit(1);
    }

    const [platform, username, providerName, profileId, userId] = args;
    let browser;
    let page;

    try {
        const providers = await loadProvidersConfig();
        const cfg = providers[providerName];
        if (!cfg) throw new Error(`Provedor não encontrado: ${providerName}`);

        // Diretório para salvar dados (YYYY-MM-DD)
        const date = new Date().toISOString().split('T')[0];
        const dataDir = path.join(__dirname, 'data', String(userId), platform, cfg.name, date);
        const profileDir = path.join(dataDir, 'profile');
        fs.mkdirSync(dataDir, { recursive: true });
        
        const timestamp = new Date().toISOString();
        const filename_json = `raw-${platform}-${timestamp}.json`;
        const path_json_raw = path.join(dataDir, filename_json);

        let status = 'error';
        let errorMessage = null;
        let resultData = null;

        try {
            // Se precisar de browser, instancia
            if (cfg.requiresBrowser) {
                browser = await chromium.launch({ headless: true, timeout: 60000 });
                page = await browser.newPage();
                await page.setViewportSize({ width: 1280, height: 800 });
            }

            const modPath = path.join(__dirname, 'providers', cfg.name, 'index.js');
            const provider = require(modPath);
            if (typeof provider.scrape !== 'function') {
                throw new Error('Módulo de provedor sem função scrape');
            }

            // Executa scraping
            await provider.scrape({
                platform,
                username,
                dataDir,
                browser,
                page,
                baseUrl: cfg.baseUrl,
                selectedProviderConfig: cfg,
                profileId,
                userId,
                filename_json
            });

            status = 'completed';
            console.log(`[main] Scraping concluído: ${username} (${platform})`);

            // Tenta ler resultado
            const resultPath = path.join(profileDir, 'profile-data.json');
            if (fs.existsSync(resultPath)) {
                resultData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
            }
        } catch (err) {
            console.error('[main] Erro durante scraping:', err);
            errorMessage = err.message;
            
            if (browser) await browser.close().catch(e => console.error('[main] Erro ao fechar browser:', e));
            process.abort();

        } finally {
            if (browser) await browser.close().catch(e => console.error('[main] Erro ao fechar browser:', e));
        }

        // Monta payload e envia webhook
        const payload = {
            profileId,
            userId,
            platform,
            username,
            provider: providerName,
            status,
            path_profile: profileDir || '',
            json_raw: path_json_raw || '',
            rawResult: resultData || {} ,
            local_profile_pic: null,
            profile_pic_url: resultData?.profile_pic_url || false,
            followers_count: resultData?.followers_count || 0,
            errorMessage
        }; 

        await sendWebhook(payload);
    } catch (err) {
        console.error('[main] Erro no processo principal:', err);
    }
}

// Captura erros não tratados
process.on('unhandledRejection', (reason, promise) => {
    console.error('[unhandledRejection]', promise, reason);
});
process.on('uncaughtException', err => {
    console.error('[uncaughtException]', err);
});

main();
