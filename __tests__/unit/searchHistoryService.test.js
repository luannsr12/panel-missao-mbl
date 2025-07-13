const searchHistoryService = require('../../services/searchHistoryService');
const db = require('../../database'); // Importa o módulo real, que será mockado pelo Jest

jest.mock('../../database'); // Mocka o módulo database

describe('searchHistoryService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getSearchHistory', () => {
        test('deve retornar o histórico de pesquisa para um usuário não-admin', async () => {
            const mockHistory = [{ id: 1, profile_id: 1, username: 'user1' }];
            db.allAsync.mockResolvedValue(mockHistory);
            const history = await searchHistoryService.getSearchHistory(1, false);
            expect(history).toEqual(mockHistory);
            expect(db.allAsync).toHaveBeenCalledWith("SELECT * FROM search_history WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = ?) ORDER BY timestamp DESC", [1]);
        });

        test('deve retornar todo o histórico de pesquisa para um admin', async () => {
            const mockHistory = [{ id: 1, profile_id: 1, username: 'user1' }, { id: 2, profile_id: 2, username: 'user2' }];
            db.allAsync.mockResolvedValue(mockHistory);
            const history = await searchHistoryService.getSearchHistory(1, true);
            expect(history).toEqual(mockHistory);
            expect(db.allAsync).toHaveBeenCalledWith("SELECT * FROM search_history ORDER BY timestamp DESC", []);
        });
    });

    describe('addSearchHistory', () => {
        test('deve adicionar um registro ao histórico de pesquisa', async () => {
            const mockDate = new Date().toISOString();
            await searchHistoryService.addSearchHistory(1, 'instagram', 'testuser', 'default', '{}', mockDate);
            expect(db.runAsync).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO search_history'),
                [1, 'instagram', 'testuser', 'default', '{}', mockDate]
            );
        });
    });
});
