const express = require('express');
const router = express.Router();
const profileService = require('../services/profileService');
const searchHistoryService = require('../services/searchHistoryService');
const dashboardService = require('../services/dashboardService'); // Importa o novo serviço
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/dashboard', authenticateToken, async (req, res) => {
    const userId = req.auth.id; // ID do usuário do token JWT
    const isAdmin = req.auth.isAdmin; // isAdmin do token JWT

    try {
        const profiles = await profileService.getProfiles(userId, isAdmin);
        const searchHistory = await searchHistoryService.getSearchHistory(userId, isAdmin);
        const chartData = await dashboardService.getChartData(userId, isAdmin, 1, 'days');

        res.render('dashboard', { 
            profiles: profiles, 
            searchHistory: searchHistory || [], 
            chartData: chartData, // Passa os dados do gráfico para a view
            username: req.auth.username, 
            isAdmin: isAdmin,
            currentPage: 'dashboard'
        });
    } catch (err) {
        console.error("Erro ao buscar dados para dashboard:", err.message);
        res.status(500).send("Erro ao buscar dados para dashboard.");
    }
});

module.exports = router;
