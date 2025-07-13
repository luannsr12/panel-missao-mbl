require('dotenv').config(); // Carrega variáveis de ambiente

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

const seedAdmin = async () => {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);

        console.log("Verificando se o usuário 'admin' existe...");
        const [adminRows] = await connection.execute("SELECT * FROM users WHERE username = ?", ['admin']);
        const adminUser = adminRows[0];

        if (!adminUser) {
            console.log("Usuário 'admin' não encontrado. Criando...");
            const username = 'admin';
            const password = 'admin';
            const isAdmin = true;
            
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(password, salt);
            await connection.execute('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', [username, hash, isAdmin ? 1 : 0]);
            console.log(`Usuário 'admin' criado com sucesso.`);
        } else {
            console.log("Usuário 'admin' já existe.");
            console.log("Atualizando a senha do 'admin' para garantir consistência...");
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin', salt);
            await connection.execute('UPDATE users SET password = ?, is_admin = 1 WHERE username = ?', [hash, 'admin']);
            console.log("Senha e permissão do usuário 'admin' foram sincronizadas.");
        }

        console.log("Verificando e configurando a opção 'headless'...");
        try {
            await connection.execute("INSERT IGNORE INTO settings (setting_key, value) VALUES (?, ?)", ['headless', 'true']);
            console.log("Configuração 'headless' adicionada ou já existente.");
        } catch (error) {
            console.error("Erro ao tentar inserir/ignorar configuração 'headless':", error);
        }

    } catch (error) {
        console.error("Erro ao executar o script de seed:", error);
    } finally {
        if (connection) {
            await connection.end();
            console.log("Conexão com o banco de dados MySQL fechada.");
        }
    }
};

seedAdmin();
