"use strict";

const fs = require('fs');
const path = require('path');
 
/**
 * Padroniza os dados do perfil independentemente da rede social
 * @param {object} data - Dados brutos da API
 * @param {string|null} platform - Nome da plataforma (ex: 'instagram')
 * @returns {object} Dados padronizados
 */
function standardizeProfileData(data, platform = null) {
    const result = {
        platform,
        username: null,
        full_name: null,
        bio: null,
        is_verified: false,
        followers_count: null,
        following_count: null,
        posts_count: null,
        likes_count: null,
        views_count: null,
        profile_pic_url: null,
        profile_url: null,
        local_profile_pic: null,
        extracted_at: new Date().toISOString(),
        original_data: {},
        extraction_paths: {}
    };

    const FIELD_MAPPINGS = {
        username: { paths: ['username', 'screen_name', 'login', 'user_name', 'account_name', 'handle'], transform: v => String(v).trim() },
        full_name: { paths: ['fullName', 'full_name', 'name', 'display_name', 'title', 'nickname'], transform: v => String(v).trim() },
        bio: { paths: ['bio', 'description', 'about', 'summary', 'biography'], transform: v => String(v).trim() },
        is_verified: { paths: ['is_verified', 'verified', 'is_authentic'], transform: v => Boolean(v) },
        followers_count: { paths: ['followersCount', 'followers_count', 'follower_count', 'subscribers_count', 'followers'], transform: v => Number(v) || 0 },
        following_count: { paths: ['followingCount', 'following_count', 'follow_count', 'friends_count', 'following'], transform: v => Number(v) || 0 },
        posts_count: { paths: ['postsCount', 'posts_count', 'media_count', 'statuses_count', 'tweet_count'], transform: v => Number(v) || 0 },
        likes_count: { paths: ['likes_count', 'like_count', 'favorites_count'], transform: v => Number(v) || 0 },
        views_count: { paths: ['views_count', 'view_count', 'plays_count'], transform: v => Number(v) || 0 },
        profile_pic_url: { paths: ['profilePicUrl', 'profile_pic_url', 'avatar_url', 'picture_url', 'profile_image_url'], transform: v => String(v).trim() },
        profile_url: { paths: ['profile_url', 'url', 'html_url', 'permalink'], transform: v => String(v).trim() }
    };

    const extractValue = (obj, key) => key.split('.').reduce((o, p) => o && o[p] !== undefined ? o[p] : null, obj);
    const registerPath = (field, p, val) => {
        if (val == null) return;
        result.extraction_paths[field] = result.extraction_paths[field] || [];
        if (!result.extraction_paths[field].includes(p)) result.extraction_paths[field].push(p);
        if (!result.original_data[field]) result.original_data[field] = { value: val, source: p };
    };

    for (const [field, { paths, transform }] of Object.entries(FIELD_MAPPINGS)) {
        for (const p of paths) {
            const val = p.includes('.') ? extractValue(data, p) : data[p];
            if (val !== undefined && val !== null) {
                result[field] = transform(val);
                registerPath(field, p, val);
                break;
            }
        }
    }

    // se não encontrou username, tenta campos alternativos
    if (!result.username) {
        ['id', 'user_id', 'author_id'].forEach(p => {
            if (!result.username && data[p] != null) {
                result.username = String(data[p]).trim();
                registerPath('username', p, data[p]);
            }
        });
    }

    // se não achou profile_url, constrói de baseURL
    if (!result.profile_url && result.username && platform) {
        const bases = { twitter: 'https://twitter.com/', instagram: 'https://instagram.com/', facebook: 'https://facebook.com/', youtube: 'https://youtube.com/' };
        const b = bases[platform.toLowerCase()];
        if (b) {
            result.profile_url = b + result.username;
            registerPath('profile_url', 'constructed_from_username', result.profile_url);
        }
    }

    return result;
}

/**
 * Salva JSON padronizado e baixa imagem de perfil, se existir
 * @param {string} dir - Diretório base para salvar
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {object} data - Dados brutos
 * @param {string} username
 * @param {string} platform
 * @param {object} providerConfig
 * @param {object|null} page - Playwright page (opcional)
 * @param {string|null} matchKeyword
 * @param {string|null} matchDateTime
 */
async function saveJson(
    dir,
    filename,
    data,
    username,
    platform,
    providerConfig,
    page = null,
    matchKeyword = null,
    matchDateTime = null,
    onlySave = false
) {
    if (typeof dir !== 'string' || typeof filename !== 'string') {
        throw new TypeError('saveJson: parâmetros dir e filename devem ser strings');
    }
    const baseDir = path.resolve(dir);
    fs.mkdirSync(baseDir, { recursive: true });

    if (onlySave){
        fs.writeFileSync(path.join(baseDir, filename), JSON.stringify(data, null, 2));
        return true;
    }

    const profileDir = path.join(baseDir, 'profile');
    fs.mkdirSync(profileDir, { recursive: true });

    const std = standardizeProfileData(data, platform);
    std.platform = platform;
    std.username = username;

    const finalData = {
        metadata: { extracted_at: new Date().toISOString(), platform, username, match_keyword: matchKeyword, match_datetime: matchDateTime },
        profile: std,
        raw_data: data
    };

    // grava JSON principal
    fs.writeFileSync(path.join(baseDir, filename), JSON.stringify(finalData, null, 2));
    // grava profile-data
    fs.writeFileSync(path.join(profileDir, 'profile-data.json'), JSON.stringify(std, null, 2));
}

module.exports = { saveJson };
