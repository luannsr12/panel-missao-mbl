const express = require('express');
const router = express.Router();
const profileService = require('../services/profileService');
const userService = require('../services/userService');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Rota para listar perfis
router.get('/profiles', authenticateToken, async (req, res) => {
    const userId = req.auth.id;
    const isAdmin = req.auth.isAdmin;

    try {
        const profiles = await profileService.getProfiles(userId, isAdmin);
        const users = isAdmin ? await userService.getAllUsers() : [];
        res.render('profiles', { 
            profiles: profiles, 
            users: users, 
            isAdmin: isAdmin,
            currentPage: 'profiles'
        });
    } catch (err) {
        console.error("Erro ao buscar perfis:", err.message);
        res.status(500).send("Erro ao buscar perfis.");
    }
});

// Rota para adicionar perfil
router.post('/profiles', authenticateToken, async (req, res) => {
    const { url, platform, user_id_owner } = req.body;
    const username = url.split('/').filter(Boolean).pop().replace('@', '');
    const ownerId = req.auth.isAdmin ? (user_id_owner || req.auth.id) : req.auth.id;

    try {
        const existingProfile = await profileService.checkProfileExists(username, platform, ownerId);
        if (existingProfile) {
            return res.redirect('/profiles');
        }

        await profileService.createProfile(username, platform, url, ownerId);
        res.redirect('/profiles');
    } catch (err) {
        console.error("Erro ao adicionar perfil:", err.message);
        res.status(500).send("Erro ao adicionar perfil.");
    }
});

// Rota para deletar perfil
router.post('/profiles/delete/:id', authenticateToken, async (req, res) => {
    const profileId = req.params.id;
    const userId = req.auth.id;
    const isAdmin = req.auth.isAdmin;

    try {
        const profile = await profileService.getProfileById(profileId);
        if (!profile) {
            return res.status(404).send("Perfil não encontrado.");
        }

        if (!isAdmin && profile.user_id !== userId) {
            return res.status(403).send("Acesso negado.");
        }

        await profileService.deleteProfile(profileId);
        res.redirect('/profiles');
    } catch (err) {
        console.error("Erro ao deletar perfil:", err.message);
        res.status(500).send("Erro ao deletar perfil.");
    }
});

// Rota para analisar perfil
router.post('/profiles/analyze/:id', authenticateToken, async (req, res) => {
    const profileId = req.params.id;
    const userId = req.auth.id;
    const isAdmin = req.auth.isAdmin;

    try {
        const profile = await profileService.getProfileById(profileId);
        if (!profile) {
            return res.status(404).send("Perfil não encontrado.");
        }

        if (!isAdmin && profile.user_id !== userId) {
            return res.status(403).send("Acesso negado.");
        }

        // Inicia a análise em segundo plano
        await profileService.analyzeProfile(profile);

        res.redirect('/profiles'); // Redireciona imediatamente
    } catch (err) {
        console.error("Erro ao iniciar análise de perfil:", err.message);
        res.status(500).send("Erro ao iniciar análise de perfil.");
    }
});

module.exports = router;
