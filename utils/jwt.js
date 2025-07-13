const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Use uma chave secreta forte e armazene em variáveis de ambiente

const jwtUtils = {
    generateToken(payload) {
        return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' }); // Token expira em 1 hora
    },

    verifyToken(token) {
        try {
            return jwt.verify(token, SECRET_KEY);
        } catch (error) {
            return null; // Token inválido ou expirado
        }
    }
};

module.exports = jwtUtils;
