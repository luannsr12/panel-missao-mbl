const { expressjwt: expressJwt } = require("express-jwt");

const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret_key';

const authMiddleware = {
    authenticateToken: expressJwt({
        secret: SECRET_KEY,
        algorithms: ['HS256'],
        requestProperty: 'auth', // O payload do JWT será anexado a req.auth
        getToken: function fromCookie(req) {
            if (req.cookies && req.cookies.token) {
                return req.cookies.token;
            }
            return null;
        }
    }),

    authorizeRoles: (requiredRoles) => (req, res, next) => {
        if (!req.auth) {
            return res.status(401).send("Acesso negado. Token não fornecido.");
        }

        if (requiredRoles.includes('admin') && !req.auth.isAdmin) {
            return res.status(403).send("Acesso negado. Permissão de administrador necessária.");
        }

        // Adiciona os dados de autenticação ao res.locals para acesso nas views
        res.locals.auth = req.auth;

        next();
    },

    // Middleware para passar dados de autenticação para todas as views
    injectAuthToViews: (req, res, next) => {
        if (req.auth) {
            res.locals.auth = req.auth;
        } else {
            res.locals.auth = null;
        }
        next();
    }
};

module.exports = authMiddleware;