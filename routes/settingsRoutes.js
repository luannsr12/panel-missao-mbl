const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const userService = require('../services/userService');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Rota para exibir configurações
router.get('/settings', authenticateToken, async (req, res) => {
    try {
        const headless = await settingsService.getHeadlessSetting();
        res.render('settings', { 
            headless: headless, 
            isAdmin: req.auth.isAdmin,
            currentPage: 'settings'
        });
    } catch (err) {
        console.error("Erro ao buscar configurações:", err.message);
        res.status(500).send("Erro ao buscar configurações.");
    }
});

// Rota para alterar senha
router.post('/settings/password', authenticateToken, async (req, res) => {
    const { newPassword } = req.body;
    try {
        await userService.updatePassword(req.auth.id, newPassword);
        res.redirect('/settings');
    } catch (err) {
        console.error("Erro ao atualizar senha:", err.message);
        res.status(500).send("Erro ao atualizar senha.");
    }
});

// Rota para configurar modo headless (apenas admin)
router.post('/settings/headless', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
    const { headless } = req.body;
    try {
        await settingsService.updateHeadlessSetting(headless);
        res.redirect('/settings');
    } catch (err) {
        console.error("Erro ao atualizar configuração headless:", err.message);
        res.status(500).send("Erro ao atualizar configuração headless.");
    }
});

module.exports = router;
