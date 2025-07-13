const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { saveJson } = require('../../utils/save-json');
const { downloadResource } = require('../../utils/save-image');

async function scrape(options) {
    const { username, dataDir, baseUrl, platform, selectedProviderConfig } = options;
    const ZENROWS_API_KEY = process.env[selectedProviderConfig.apiKeyEnvVar];

    if (!ZENROWS_API_KEY) {
        console.error(`Erro: Variável de ambiente ${selectedProviderConfig.apiKeyEnvVar} não definida.`);
        return;
    }

    const targetUrl = `https://www.youtube.com/@${username}`;

    try {
        console.log(`Raspando ${targetUrl} usando ZenRows...`);
        const response = await axios.get(baseUrl, {
            params: {
                url: targetUrl,
                apikey: ZENROWS_API_KEY,
                js_render: 'true',
                // premium_proxy: 'true' // Opcional: se precisar de proxies premium
            }
        });

        const $ = cheerio.load(response.data);

        // Extrair número de inscritos
        // Inspecione o HTML retornado pelo ZenRows para encontrar o seletor correto
        // Exemplo: pode ser um meta tag, ou um elemento com uma classe específica
        let subscriberCount = null;
        const subscriberMeta = $('meta[itemprop="interactionCount"]');
        if (subscriberMeta.length > 0) {
            subscriberCount = subscriberMeta.attr('content');
        } else {
            // Tentar outros seletores se o meta tag não funcionar
            // Ex: $('yt-formatted-string#subscriber-count').text()
            // Ex: $('[aria-label*="subscribers"]').text()
            // Para o Google, o número de inscritos pode estar em um formato como "13.3M subscribers"
            const subscriberText = $('body').text().match(/(\d+\.?\d*[KMGT]?)\s*(subscribers|inscritos)/i);
            if (subscriberText && subscriberText[1]) {
                subscriberCount = subscriberText[1];
            }
        }

        // Extrair URL da imagem de perfil
        let profilePicUrl = null;
        const profilePicMeta = $('meta[property="og:image"]');
        if (profilePicMeta.length > 0) {
            profilePicUrl = profilePicMeta.attr('content');
        } else {
            // Tentar outros seletores se o meta tag não funcionar
            // Ex: $('img#img.yt-img-shadow').attr('src')
            const profilePicElement = $('img[src*="yt3.ggpht.com"]');
            if (profilePicElement.length > 0) {
                profilePicUrl = profilePicElement.attr('src');
            }
        }

        const profileData = {
            subscriberCount,
            profilePicUrl,
        };

        if (profileData.profilePicUrl) {
            const profilePicPath = path.join(dataDir, `profile-pic-${username}.jpg`); // Define um nome de arquivo para a imagem
            try {
                await downloadResource(profileData.profilePicUrl, profilePicPath);
                console.log(`Imagem de perfil salva em: ${profilePicPath}`);
            } catch (imgError) {
                console.error(`Erro ao baixar imagem de perfil: ${imgError.message}`);
            }
        }

        const matchKeyword = `profile_data_zenrows_${platform}`; // Exemplo de palavra-chave
        const matchDateTime = new Date().toISOString();
        saveJson(dataDir, 'profile-data-zenrows', profileData, username, platform, selectedProviderConfig, null, matchKeyword, matchDateTime);
        console.log(`Dados do perfil salvos em: ${path.join(dataDir, 'profile-data-zenrows.json')}`);

    } catch (error) {
        console.error(`Erro ao realizar scraping de ${username} (ZenRows):`, error);
    }
}

module.exports = {
    scrape,
};