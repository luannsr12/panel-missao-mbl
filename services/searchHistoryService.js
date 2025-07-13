'use strict';

const db = require('../database');

const searchHistoryService = {
    /**
     * Retorna o histórico de buscas de acordo com o usuário e perfil de administrador.
     * @param {number|null} userId  — id do usuário logado (ou null, se isAdmin=true)
     * @param {boolean}  isAdmin   — se true, retorna todo o histórico
     * @returns {Promise<Array<{
     *   id: number,
     *   profile_id: number,
     *   user_id: number,
     *   platform: string,
     *   username: string,
     *   provider: string,
     *   followers_count: number,
     *   raw_result: string,
     *   timestamp: string
     * }>>}
     */
    async getSearchHistory(userId, isAdmin) {
        // Seleciona só as colunas necessárias
        let sql = `
      SELECT
        id,
        profile_id,
        user_id,
        platform,
        username,
        provider,
        followers_count,
        raw_result,
        timestamp
      FROM search_history
    `;
        const params = [];

        if (!isAdmin) {
            sql += ` WHERE user_id = ?`;
            params.push(userId);
        }

        sql += ` ORDER BY timestamp DESC`;
        return db.allAsync(sql, params);
    },

    /**
     * Insere um novo log de busca.
     * @param {number} profileId
     * @param {string} platform
     * @param {string} username
     * @param {string} provider
     * @param {string} rawResult
     * @param {string} timestamp
     */
    async addSearchHistory(profileId, platform, username, provider, rawResult, timestamp) {
        const sql = `
      INSERT INTO search_history
        (profile_id, user_id, platform, username, provider, followers_count, raw_result, timestamp)
      VALUES (?,        ?,       ?,        ?,       ?,        ?,               ?,          ?)
    `;
        // extraímos followers_count do rawResult antes de gravar
        let followersCount = null;
        try {
            const data = JSON.parse(rawResult);
            followersCount =
                data.followersCount ??
                data.follower_count ??
                data.statistics?.followerCount ??
                data.latest_posts?.[0]?.follower_count ??
                null;
        } catch {
            followersCount = null;
        }

        // supondo que você tenha o user_id no contexto aqui…
        // se não, altere para receber userId como parâmetro
        const userId = /* obtenha user_id do contexto */ null;

        return db.runAsync(sql, [
            profileId,
            userId,
            platform,
            username,
            provider,
            followersCount,
            rawResult,
            timestamp,
        ]);
    },
};

module.exports = searchHistoryService;
