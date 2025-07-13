const db = require('../database');
const bcrypt = require('bcrypt');

const userService = {
    async findByUsername(username) {
        const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
        
        return user;
    },

    async findById(id) {
        const user = await db.getAsync('SELECT id, username, is_admin FROM users WHERE id = ?', [id]);
        if (user) {
            user.is_admin = user.is_admin === 1; // Converte TINYINT(1) para booleano
        }
        return user;
    },

    async create(username, password, isAdmin) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const isAdminValue = isAdmin ? 1 : 0; // MySQL usa 0 ou 1 para BOOLEAN
        const result = await db.runAsync('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', [username, hash, isAdminValue]);
        return result.lastID;
    },

    async deleteUser(id) {
        return await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
    },

    async updatePassword(userId, newPassword) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(newPassword, salt);
        return await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
    },

    async getAllUsers() {
        const users = await db.allAsync('SELECT id, username, is_admin FROM users');
        return users.map(user => ({
            ...user,
            is_admin: user.is_admin === 1 // Converte TINYINT(1) para booleano
        }));
    }
};

module.exports = userService;
