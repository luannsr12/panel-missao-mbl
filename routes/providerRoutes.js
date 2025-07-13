const express = require('express');
const router = express.Router();
const providerService = require('../services/providerService');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Rota para exibir configurações de provedores (apenas admin)
router.get('/settings/providers', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
    try {
        const availableProviders = await providerService.getAvailableProviders();
        const currentSettings = await providerService.getCurrentProviderSettings();
        res.render('provider_settings', { 
            availableProviders, 
            currentSettings,
            isAdmin: req.auth.isAdmin,
            currentPage: 'providers'
        });
    } catch (err) {
        console.error("Erro ao buscar configurações de provedores:", err.message);
        res.status(500).send("Erro ao buscar configurações de provedores.");
    }
});

// Rota para atualizar configurações de provedores (apenas admin)
router.post('/settings/providers', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
    const { platform, provider_name } = req.body;
    try {
        await providerService.updateProviderSetting(platform, provider_name);
        res.redirect('/settings/providers');
    } catch (err) {
        console.error("Erro ao atualizar provedor:", err.message);
        res.status(500).send("Erro ao atualizar provedor.");
    }
});

module.exports = router;
