"use strict";

const path = require('path');
const { spawn } = require('child_process');
const db = require('../database');

const SCRIPT_PATH = path.join(__dirname, '../get_profile.js');

const profileService = {
    /**
     * Busca perfis (todos ou do usuário)
     */
    async getProfiles(userId, isAdmin) {
        let sql = `
      SELECT p.*, u.username AS owner_username
      FROM profiles p
      JOIN users u ON p.user_id = u.id`;
        const params = [];

        if (!isAdmin) {
            sql += ' WHERE p.user_id = ?';
            params.push(userId);
        }
        sql += ' ORDER BY p.id DESC';

        return db.allAsync(sql, params);
    },

    /**
     * Busca perfil por ID
     */
    async getProfileById(profileId) {
        return db.getAsync('SELECT * FROM profiles WHERE id = ?', [profileId]);
    },

    /**
     * Checa existência de perfil
     */
    async checkProfileExists(username, platform, userId) {
        return db.getAsync(
            'SELECT 1 AS exists_flag FROM profiles WHERE username = ? AND platform = ? AND user_id = ?',
            [username, platform, userId]
        );
    },

    /**
     * Cria um novo perfil
     */
    async createProfile(username, platform, url, ownerId) {
        const result = await db.runAsync(
            'INSERT INTO profiles (username, platform, url, user_id, status) VALUES (?, ?, ?, ?, ?)',
            [username, platform, url, ownerId, 'pending']
        );
        return result.lastID;
    },

    /**
     * Remove perfil
     */
    async deleteProfile(profileId) {
        return db.runAsync('DELETE FROM profiles WHERE id = ?', [profileId]);
    },

    /**
     * Atualiza o status do perfil
     */
    async updateProfileStatus(profileId, status) {
        return db.runAsync(
            'UPDATE profiles SET status = ? WHERE id = ?',
            [status, profileId]
        );
    },

    /**
     * Retorna o nome do provedor default para uma plataforma
     */
    async getDefaultProvider(platform) {
        const row = await db.getAsync(
            'SELECT provider_name FROM provider_settings WHERE platform = ? AND is_default = 1',
            [platform]
        );
        return row?.provider_name || 'default';
    },

    /**
     * Dispara o processo de scraping para um perfil
     */
    async analyzeProfile(profile) {
        const { id, platform, username, user_id } = profile;
        await this.updateProfileStatus(id, 'analyzing');

        const providerName = await this.getDefaultProvider(platform);

        const child = spawn(
            process.execPath,
            [SCRIPT_PATH, platform, username, providerName, String(id), String(user_id)],
            { cwd: process.cwd() }
        );

        child.stdout.on('data', chunk =>
            console.log(`[Scraper stdout] ${chunk.toString().trim()}`)
        );

        child.stderr.on('data', chunk =>
            console.error(`[Scraper stderr] ${chunk.toString().trim()}`)
        );

        child.on('error', err => {
            console.error(`[Scraper] Falha ao iniciar processo: ${err.message}`);
            this.updateProfileStatus(id, 'error').catch(e => console.error(e));
        });

        child.on('close', (code, signal) => {
            console.log(`[Scraper] Processo para profile ${id} finalizado com código ${code}${signal ? ' signal ' + signal : ''}`);
            if (code !== 0) {
                this.updateProfileStatus(id, 'error').catch(e => console.error(e));
            }
        });

        return child;
    },

    /**
     * Processa payload recebido via webhook de scraping
     */
    async processScrapingResult(payload) {
        try {

            const { 
                profileId, 
                userId, 
                status, 
                rawResult, 
                provider, 
                profile_pic_url, 
                username, 
                platform, 
                followers_count, 
                path_profile, 
                json_raw, 
                path_image_profile 
            } = payload;

            await this.updateProfileStatus(profileId, status);
            console.log(`[Webhook] Profile ${profileId} status: ${status}`);

            if (status === 'completed' && rawResult) {

                delete rawResult.original_data;
                delete rawResult.extraction_paths;
                
                const raw ={
                    ...rawResult,
                    "remote_photo": profile_pic_url,
                    "paths": {
                        "image": path_image_profile,
                        "profile": `${path_profile}/profile-data.json`,
                        "raw": json_raw
                    }
                }

                await db.runAsync(
                    `INSERT INTO search_history
            (profile_id, user_id, platform, username, provider, raw_result, followers_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [profileId, userId, platform, username, provider, JSON.stringify(raw), followers_count || 0]
                );
                console.log(`[Webhook] History inserido para profile ${profileId}`);
            }
        } catch (err) {
            console.error(`[Webhook] Erro processando resultado profile:`, err);
        }
    }
};

module.exports = profileService;
