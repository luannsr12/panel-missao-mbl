require('dotenv').config(); // Carrega variáveis de ambiente

const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('Conectado ao banco de dados MySQL para migração.');

        // Criar tabela users se não existir e adicionar is_admin
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE
            );
        `);
        console.log("Tabela 'users' verificada/criada.");

        // Adicionar coluna is_admin se não existir
        try {
            await connection.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;");
            console.log("Coluna 'is_admin' adicionada à tabela 'users'.");
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log("Coluna 'is_admin' já existe na tabela 'users'.");
            } else {
                throw error;
            }
        }

        // Criar tabela profiles se não existir
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                platform VARCHAR(255) NOT NULL,
                url TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                user_id INT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(username, platform, user_id)
            );
        `);
        console.log("Tabela 'profiles' verificada/criada.");

        // Migrar dados de old_profiles para profiles, se old_profiles existir
        const [rows] = await connection.execute("SHOW TABLES LIKE 'old_profiles';");
        if (rows.length > 0) {
            console.log("Tabela 'old_profiles' encontrada. Migrando dados...");
            await connection.execute(`
                INSERT INTO profiles (id, username, platform, url, status, user_id)
                SELECT id, username, platform, url, status, 1 FROM old_profiles;
            `);
            console.log("Dados copiados para a nova tabela 'profiles'. (user_id fixo em 1)");
            await connection.execute("DROP TABLE old_profiles;");
            console.log("Tabela 'old_profiles' excluída.");
        } else {
            console.log("Tabela 'old_profiles' não encontrada. Nenhuma migração de dados necessária.");
        }

        // Criar tabela search_history se não existir
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS search_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                profile_id INT NOT NULL,
                platform VARCHAR(255) NOT NULL,
                username VARCHAR(255) NOT NULL,
                provider VARCHAR(255) NOT NULL,
                raw_result JSON,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profile_id) REFERENCES profiles(id)
            );
        `);
        console.log("Tabela 'search_history' verificada/criada.");

        // Criar tabela settings se não existir
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                setting_key VARCHAR(255) PRIMARY KEY,
                value TEXT
            );
        `);
        console.log("Tabela 'settings' verificada/criada.");

        // Criar tabela provider_settings se não existir
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS provider_settings (
                platform VARCHAR(255) PRIMARY KEY,
                provider_name VARCHAR(255) NOT NULL,
                is_default BOOLEAN DEFAULT FALSE
            );
        `);
        console.log("Tabela 'provider_settings' verificada/criada.");

        console.log("Migração do banco de dados concluída com sucesso.");
    } catch (error) {
        console.error("Erro durante a migração do banco de dados:", error);
    } finally {
        if (connection) {
            await connection.end();
            console.log("Conexão com o banco de dados MySQL fechada.");
        }
    }
}

migrate();