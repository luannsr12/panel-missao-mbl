require('./logger');
require('dotenv').config(); // Carrega variáveis de ambiente

const express = require('express');
const path = require('path');
const db = require('./database'); // Importa a instância do banco de dados
const cookieParser = require('cookie-parser'); // NOVO: Importa cookie-parser

// Importar middlewares
const { authenticateToken } = require('./middlewares/authMiddleware');

// Importar módulos de rota
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const providerRoutes = require('./routes/providerRoutes');
const webhookRoutes = require('./routes/webhookRoutes'); // NOVO: Importa as rotas do webhook

const app = express();
const PORT = process.env.APP_PORT || 3000;
const HOST = process.env.APP_HOST || 'localhost';

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/toastr', express.static(__dirname + '/node_modules/toastr/build/'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Para lidar com JSON no corpo da requisição, se necessário
app.use(cookieParser()); // NOVO: Usa o middleware cookie-parser

// Rotas de autenticação (login, logout) não são protegidas por JWT
app.use('/', authRoutes);


// Middleware para popular `res.locals` com dados do usuário a partir do token.
// Este middleware é aplicado após a autenticação e antes das rotas protegidas.
const setUserLocals = (req, res, next) => {
    if (req.auth) {
        res.locals.username = req.auth.username;
        res.locals.isAdmin = req.auth.isAdmin;
    } else {
        res.locals.username = null;
        res.locals.isAdmin = false;
    }
    next();
};

// Agrupando rotas protegidas que exigem autenticação
const protectedRoutes = express.Router();
protectedRoutes.use(authenticateToken); // 1. Primeiro, autentica
protectedRoutes.use(setUserLocals);     // 2. Depois, popula res.locals

// Adiciona as rotas ao roteador protegido
protectedRoutes.use('/', dashboardRoutes);
protectedRoutes.use('/', profileRoutes);
protectedRoutes.use('/', userRoutes);
protectedRoutes.use('/', settingsRoutes);
app.use('/', providerRoutes);
app.use('/', webhookRoutes); // NOVO: Adiciona as rotas do webhook

// Monta o roteador protegido no aplicativo principal
app.use('/', protectedRoutes);

// Rota raiz redireciona para o dashboard.
// Se o usuário não estiver logado, a rota /dashboard (que é protegida)
// irá falhar na autenticação e o error handler irá redirecionar para /login.
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Middleware de tratamento de erro para JWT
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        // Se o erro for de autenticação JWT, redireciona para o login
        console.error("Erro de autenticação JWT:", err.message);
        res.clearCookie('token'); // Limpa o cookie do token
        return res.redirect('/login');
    }
    next(err); // Passa outros erros para o próximo middleware de erro
});

// Iniciar servidor
const server = app.listen(PORT, () => {
    console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});

module.exports = server; // Exporta a instância do servidor