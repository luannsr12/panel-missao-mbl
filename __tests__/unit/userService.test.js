const userService = require('../../services/userService');
const db = require('../../database'); // Importa o módulo real, que será mockado pelo Jest
const bcrypt = require('bcrypt');

jest.mock('../../database'); // Mocka o módulo database

jest.mock('bcrypt');

describe('userService', () => {
    beforeEach(() => {
        // Limpa os mocks antes de cada teste
        db.runAsync.mockClear();
        db.getAsync.mockClear();
        db.allAsync.mockClear();
        bcrypt.genSaltSync.mockClear();
        bcrypt.hashSync.mockClear();
    });

    describe('findByUsername', () => {
        test('deve retornar um usuário se encontrado', async () => {
            const mockUser = { id: 1, username: 'testuser', password: 'hashedpass', is_admin: 0 };
            db.getAsync.mockResolvedValue(mockUser);
            const user = await userService.findByUsername('testuser');
            expect(user).toEqual(mockUser);
            expect(db.getAsync).toHaveBeenCalledWith('SELECT * FROM users WHERE username = ?', ['testuser']);
        });

        test('deve retornar null se o usuário não for encontrado', async () => {
            db.getAsync.mockResolvedValue(null);
            const user = await userService.findByUsername('nonexistent');
            expect(user).toBeNull();
        });
    });

    describe('findById', () => {
        test('deve retornar um usuário por ID', async () => {
            const mockUser = { id: 1, username: 'testuser', is_admin: 0 };
            db.getAsync.mockResolvedValue(mockUser);
            const user = await userService.findById(1);
            expect(user).toEqual(mockUser);
            expect(db.getAsync).toHaveBeenCalledWith('SELECT id, username, is_admin FROM users WHERE id = ?', [1]);
        });
    });

    describe('create', () => {
        test('deve criar um novo usuário e retornar o ID', async () => {
            bcrypt.genSaltSync.mockReturnValue('salt');
            bcrypt.hashSync.mockReturnValue('hashedpassword');
            db.runAsync.mockResolvedValue({ lastID: 1 });

            const userId = await userService.create('newuser', 'password123', false);
            expect(userId).toBe(1);
            expect(bcrypt.genSaltSync).toHaveBeenCalledWith(10);
            expect(bcrypt.hashSync).toHaveBeenCalledWith('password123', 'salt');
            expect(db.runAsync).toHaveBeenCalledWith('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', ['newuser', 'hashedpassword', 0]);
        });

        test('deve criar um novo usuário admin', async () => {
            bcrypt.genSaltSync.mockReturnValue('salt');
            bcrypt.hashSync.mockReturnValue('hashedpassword');
            db.runAsync.mockResolvedValue({ lastID: 2 });

            const userId = await userService.create('adminuser', 'adminpass', true);
            expect(userId).toBe(2);
            expect(db.runAsync).toHaveBeenCalledWith('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', ['adminuser', 'hashedpassword', 1]);
        });
    });

    describe('deleteUser', () => {
        test('deve deletar um usuário', async () => {
            db.runAsync.mockResolvedValue({ changes: 1 });
            await userService.deleteUser(1);
            expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?', [1]);
        });
    });

    describe('updatePassword', () => {
        test('deve atualizar a senha de um usuário', async () => {
            bcrypt.genSaltSync.mockReturnValue('salt');
            bcrypt.hashSync.mockReturnValue('newhashedpassword');
            db.runAsync.mockResolvedValue({ changes: 1 });

            await userService.updatePassword(1, 'newpassword');
            expect(bcrypt.genSaltSync).toHaveBeenCalledWith(10);
            expect(bcrypt.hashSync).toHaveBeenCalledWith('newpassword', 'salt');
            expect(db.runAsync).toHaveBeenCalledWith('UPDATE users SET password = ? WHERE id = ?', ['newhashedpassword', 1]);
        });
    });

    describe('getAllUsers', () => {
        test('deve retornar todos os usuários', async () => {
            const mockUsersFromDb = [
                { id: 1, username: 'user1', is_admin: 0 },
                { id: 2, username: 'user2', is_admin: 1 },
            ];
            db.allAsync.mockResolvedValue(mockUsersFromDb);
            const users = await userService.getAllUsers();
            const expectedUsers = [
                { id: 1, username: 'user1', is_admin: false },
                { id: 2, username: 'user2', is_admin: true },
            ];
            expect(users).toEqual(expectedUsers);
            expect(db.allAsync).toHaveBeenCalledWith('SELECT id, username, is_admin FROM users');
        });
    });
});
