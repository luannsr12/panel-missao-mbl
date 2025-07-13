const path = require('path');
const { chromium } = require('playwright'); // Importa chromium
const { saveJson } = require('../../utils/save-json');
const { downloadResource } = require('../../utils/save-image');

async function scrape(options) {
    const { username, dataDir, platform, selectedProviderConfig } = options;
    const BROWSER_WSS_ENDPOINT = process.env[selectedProviderConfig.browserWSEndpointEnvVar];

    if (!BROWSER_WSS_ENDPOINT) {
        console.error(`Erro: Variável de ambiente ${selectedProviderConfig.browserWSEndpointEnvVar} não definida.`);
        return;
    }

    let browser = null;
    let page = null;

    try {
        console.log(`Conectando ao Bright Data Scraping Browser para ${platform} - ${username}...`);
        browser = await chromium.connect({
            wsEndpoint: BROWSER_WSS_ENDPOINT,
        });
        page = await browser.newPage();

        let profileData = {};
        let targetUrl = '';

        switch (platform) {
            case 'youtube':
                targetUrl = `https://www.youtube.com/@${username}`;
                await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

                // Exemplo de extração para YouTube (pode precisar de ajustes)
                profileData = await page.evaluate(() => {
                    const subscriberCountElement = document.querySelector('#subscriber-count'); // Exemplo de seletor
                    const subscriberCount = subscriberCountElement ? subscriberCountElement.innerText.trim() : null;

                    const profilePicElement = document.querySelector('#img.yt-img-shadow'); // Exemplo de seletor
                    const profilePicUrl = profilePicElement ? profilePicElement.src : null;

                    return {
                        subscriberCount,
                        profilePicUrl,
                    };
                });
                break;
            case 'instagram':
                targetUrl = `https://www.instagram.com/${username}/`;
                await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

                // Exemplo de extração para Instagram (pode precisar de ajustes)
                profileData = await page.evaluate(() => {
                    const followersElement = document.querySelector('a[href$="/followers/"] span'); // Exemplo de seletor
                    const postsElement = document.querySelector('a[href$="/posts/"] span'); // Exemplo de seletor
                    const followingElement = document.querySelector('a[href$="/following/"] span'); // Exemplo de seletor
                    const profilePicElement = document.querySelector('img[alt$="profile picture"]'); // Exemplo de seletor

                    const followersCount = followersElement ? followersElement.innerText.trim() : null;
                    const postsCount = postsElement ? postsElement.innerText.trim() : null;
                    const followingCount = followingElement ? followingElement.innerText.trim() : null;
                    const profilePicUrl = profilePicElement ? profilePicElement.src : null;

                    return {
                        followersCount,
                        postsCount,
                        followingCount,
                        profilePicUrl,
                    };
                });
                break;
            // Adicione outros casos para Twitter, Kwai, TikTok, LinkedIn, Facebook, Reddit, Twitch, Spotify
            // Lembre-se que cada plataforma terá seus próprios seletores CSS e desafios de scraping.
            default:
                console.error(`Plataforma ${platform} não suportada pelo provedor Bright Data (Scraping Browser).`);
                return;
        }

        if (profileData.profilePicUrl) {
            const profilePicPath = path.join(dataDir, `profile-pic-${username}.jpg`);
            try {
                await downloadResource(profileData.profilePicUrl, profilePicPath);
                console.log(`Imagem de perfil salva em: ${profilePicPath}`);
            } catch (imgError) {
                console.error(`Erro ao baixar imagem de perfil: ${imgError.message}`);
            }
        }

        // Salvar dados do perfil
        const matchKeyword = `profile_data_brightdata_${platform}`; // Exemplo de palavra-chave
        const matchDateTime = new Date().toISOString();
        saveJson(dataDir, `profile-data-brightdata-${platform}`, profileData, username, platform, selectedProviderConfig, page, matchKeyword, matchDateTime);
        console.log(`Dados do perfil salvos em: ${path.join(dataDir, `profile-data-brightdata-${platform}.json`)}`);

    } catch (error) {
        console.error(`Erro ao realizar scraping de ${username} (${platform}) com Bright Data (Scraping Browser):`, error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    scrape,
};