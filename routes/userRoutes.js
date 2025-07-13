const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Rota para listar usuários (apenas admin)
router.get('/users', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.render('users', { 
            users: users, 
            auth: req.auth,
            isAdmin: req.auth.isAdmin,
            currentPage: 'users'
        });
    } catch (err) {
        console.error("Erro ao buscar usuários:", err.message);
        res.status(500).send("Erro ao buscar usuários.");
    }
});

// Rota para adicionar usuário (apenas admin)
router.post('/users', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
    const { username, password, is_admin } = req.body;
    const isAdminValue = is_admin === 'on' ? 1 : 0;

    if (!username || !password) {
        return res.status(400).send("Nome de usuário e senha são obrigatórios.");
    }

    try {
        const existingUser = await userService.findByUsername(username);
        if (existingUser) {
            return res.status(409).send("Nome de usuário já existe.");
        }

        await userService.create(username, password, isAdminValue);
        res.redirect('/users');
    } catch (err) {
        console.error("Erro ao adicionar usuário:", err.message);
        res.status(500).send("Erro ao adicionar usuário.");
    }
});

// Rota para deletar usuário (apenas admin)
router.post('/users/delete/:id', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
    const userIdToDelete = req.params.id;
    if (parseInt(userIdToDelete) === req.auth.id) {
        return res.status(403).send("Você não pode deletar sua própria conta.");
    }

    try {
        await userService.deleteUser(userIdToDelete);
        res.redirect('/users');
    } catch (err) {
        console.error("Erro ao deletar usuário:", err.message);
        res.status(500).send("Erro ao deletar usuário.");
    }
});

module.exports = router;
