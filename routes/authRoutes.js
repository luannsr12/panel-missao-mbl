const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const jwtUtils = require('../utils/jwt');
const bcrypt = require('bcrypt');

const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await userService.findByUsername(username);
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const token = jwtUtils.generateToken({ id: user.id, username: user.username, isAdmin: user.is_admin === 1 });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' }); // Define o token como um cookie HTTP-only
        return res.status(200).json({ message: 'Login efetuado com sucesso!' });

    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});


router.get('/logout', (req, res) => {
    res.clearCookie('token'); // Limpa o cookie do token
    res.redirect('/login');
});

module.exports = router;
