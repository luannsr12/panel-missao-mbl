const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = {
    async runAsync(sql, params) {
        const [result] = await pool.execute(sql, params);
        return { lastID: result.insertId, changes: result.affectedRows };
    },

    async getAsync(sql, params) {
        const [rows] = await pool.execute(sql, params);
        return rows[0];
    },

    async allAsync(sql, params) {
        const [rows] = await pool.execute(sql, params);
        return rows;
    },

    // Adiciona um método para fechar a pool de conexões, útil para testes ou encerramento da aplicação
    async close() {
        await pool.end();
    }
};

module.exports = db;
