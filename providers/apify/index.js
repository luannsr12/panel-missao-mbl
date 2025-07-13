"use strict";

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { saveJson } = require('../../utils/save-json');

/**
 * Sanitiza erros com referências circulares
 */
function sanitizeErrorObject(error) {
    if (!(error instanceof Error)) return error;
    const clean = { name: error.name, message: error.message, stack: error.stack };
    if (error.config) clean.config = { url: error.config.url, method: error.config.method, headers: error.config.headers };
    if (error.response) clean.response = { status: error.response.status, statusText: error.response.statusText, data: error.response.data };
    return clean;
}

// Configurações de input por plataforma
const PLATFORM_INPUT_MAP = {
    instagram: username => ({ usernames: [username], resultsLimit: 1, proxyConfiguration: { useApifyProxy: true } }),
    twitter: username => ({ user_names: [username] }),
    tiktok: username => ({ usernames: [username] }),
    youtube: username => ({ channels: [`@${username}`] }),
    facebook: username => ({ startUrls: [{ url: `https://www.facebook.com/${username}` }], scrapeProfileOnly: true, proxyConfiguration: { useApifyProxy: true } }),
    linkedin: username => ({ profiles: [username], scrapeProfileOnly: true, proxyConfiguration: { useApifyProxy: true } }),
    reddit: username => ({ usernames: [username], scrapeUserInfoOnly: true }),
    twitch: username => ({ usernames: [username], scrapeProfileOnly: true })
};

// Mapeadores de dados padronizados
const PLATFORM_DATA_MAPPER = {
    instagram: data => ({
        username: data[0].username,
        fullName: data[0].fullName,
        bio: data[0].biography,
        followersCount: data[0].followersCount,
        followingCount: data[0].followsCount,
        postsCount: data[0].postsCount,
        isPrivate: data[0].private,
        isVerified: data[0].verified,
        profilePicUrl: data[0].profilePicUrl,
        externalUrl: data[0].externalUrl
    }),
    twitter: data => ({
        username: data[0].core.screen_name ?? '',
        name: data[0].core.name ?? '',
        bio: data[0].profile_bio.description ?? '',
        followersCount: data[0].relationship_counts.followers ?? 0,
        followingCount: data[0].relationship_counts.following ?? 0,
        postsCount: data[0].tweet_counts.tweets ?? 0,
        isVerified: data[0].verification.is_blue_verified ?? false,
        profilePicUrl: data?.[0]?.avatar?.image_url
            ? data[0].avatar.image_url.replace('normal', '400x400')
            : null,
        location: null,
    }),
    tiktok: data => ({
        username: data[0].unique_id,
        name: data[0].nickname,
        bio: data[0].signature,
        followersCount: data[0].follower_count,
        followingCount: data[0].following_count,
        likesCount: data[0].total_favorited,
        postsCount: data[0].visible_videos_count,
        isVerified: data[0].custom_verify.length > 0,
        profilePicUrl: data[0]?.avatar_larger?.url_list[0] ?? null
    }),
    youtube: data => ({
        username: data[0].customUrl.replace('@', ''),
        name: data[0].title,
        bio: data[0].description,
        followersCount: data[0].subscriberCount,
        followingCount: 0,
        videoCount: data[0].videoCount,
        viewCount: data[0].viewCount,
        profilePicUrl: data[0].thumbnails.medium
    }),
    facebook: data => ({
        username: data.username,
        name: data.name,
        about: data.about,
        followersCount: data.followersCount,
        profilePicUrl: data.profilePicUrl,
        isVerified: data.isVerified
    }),
    linkedin: data => ({
        username: data.username,
        headline: data.headline,
        summary: data.summary,
        connectionsCount: data.connectionsCount,
        profilePicUrl: data.profilePicUrl
    })
};

/**
 * Retry com backoff exponencial
 */
async function scrapeWithRetry(url, options, retries = 3, delay = 1000) {
    try {
        return await axios(url, options);
    } catch (err) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, delay));
            return scrapeWithRetry(url, options, retries - 1, delay * 2);
        }
        throw err;
    }
}

/**
 * Executa scraping via Apify Actor, padroniza dados e salva JSON + imagem
 */
async function scrape(options) {
    const { username, dataDir, platform, selectedProviderConfig, filename_json } = options;
    const token = process.env[selectedProviderConfig.apiKeyEnvVar];
    if (!token) throw new Error(`Env var ${selectedProviderConfig.apiKeyEnvVar} não definida.`);

    const timestamp = new Date().toISOString();

    const actorId = selectedProviderConfig.actorIds[platform];
    if (!actorId) throw new Error(`Ator não configurado para ${platform}`);

    // garantir pasta fecha do profile
    const profileDir = path.join(dataDir, 'profile');
    fs.mkdirSync(profileDir, { recursive: true });

    try {
        console.log(`Scraping ${username} em ${platform} com ${actorId}`);
        const inputData = PLATFORM_INPUT_MAP[platform]?.(username);
        if (!inputData) throw new Error(`Plataforma ${platform} não suportada.`);

        // iniciar run
        const startRes = await scrapeWithRetry(
            `${selectedProviderConfig.baseUrl}${actorId}/runs?token=${token}`,
            { method: 'POST', data: inputData, headers: { 'Content-Type': 'application/json' } }
        );
        const runId = startRes.data.data.id;
        console.log(`Run ID: ${runId}`);

        // poll status
        const maxTime = 5 * 60 * 1000;
        const interval = 5000;
        const t0 = Date.now();
        let status;
        do {
            await new Promise(r => setTimeout(r, interval));
            const resp = await scrapeWithRetry(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${token}&timeout=60`
            );
            status = resp.data.data.status;
            if (Date.now() - t0 > maxTime) { status = 'TIMED_OUT'; break; }
        } while (['RUNNING', 'READY'].includes(status));

        if (status !== 'SUCCEEDED') throw new Error(`Status final: ${status}`);

        // obter resultados
        const items = (await scrapeWithRetry(
            `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}`
        )).data;
        if (!items?.length) throw new Error('Nenhum resultado do actor');

        console.log('API-RES', items);

        const raw = items[0];
        const mapper = PLATFORM_DATA_MAPPER[platform];
        if (!mapper) throw new Error(`Mapper para ${platform} não existe`);
        const formatted = mapper(items);

        await saveJson(
            path.join(dataDir, 'request-api'),
            'api-response.json',
            items,
            username,
            platform,
            selectedProviderConfig,
            null,
            `profile_data_apify_${platform}`,
            timestamp,
            true
        );

        // salva JSON + download imagem internamente
        
        await saveJson(
            dataDir,
            filename_json,
            formatted,
            username,
            platform,
            selectedProviderConfig,
            null,
            `profile_data_apify_${platform}`,
            timestamp
        );

        return { success: true, data: formatted };
    } catch (err) {
        const clean = sanitizeErrorObject(err);
        console.error('Erro no scraping:', clean.message);
        return { success: false, error: clean };
    }
}

module.exports = { scrape };
