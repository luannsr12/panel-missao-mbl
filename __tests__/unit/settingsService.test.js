const settingsService = require('../../services/settingsService');
const db = require('../../database'); // Importa o módulo real, que será mockado pelo Jest

jest.mock('../../database'); // Mocka o módulo database

describe('settingsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getHeadlessSetting', () => {
        test('deve retornar true se o headless estiver ativado', async () => {
            db.getAsync.mockResolvedValue({ value: 'true' });
            const headless = await settingsService.getHeadlessSetting();
            expect(headless).toBe(true);
            expect(db.getAsync).toHaveBeenCalledWith("SELECT value FROM settings WHERE setting_key = 'headless'");
        });

        test('deve retornar false se o headless estiver desativado', async () => {
            db.getAsync.mockResolvedValue({ value: 'false' });
            const headless = await settingsService.getHeadlessSetting();
            expect(headless).toBe(false);
            expect(db.getAsync).toHaveBeenCalledWith("SELECT value FROM settings WHERE setting_key = 'headless'");
        });

        test('deve retornar false se a configuração não existir', async () => {
            db.getAsync.mockResolvedValue(null);
            const headless = await settingsService.getHeadlessSetting();
            expect(headless).toBe(false);
            expect(db.getAsync).toHaveBeenCalledWith("SELECT value FROM settings WHERE setting_key = 'headless'");
        });
    });

    describe('updateHeadlessSetting', () => {
        test('deve atualizar o headless para true', async () => {
            await settingsService.updateHeadlessSetting(true);
            expect(db.runAsync).toHaveBeenCalledWith("UPDATE settings SET value = ? WHERE setting_key = 'headless'", ['true']);
        });

        test('deve atualizar o headless para false', async () => {
            await settingsService.updateHeadlessSetting(false);
            expect(db.runAsync).toHaveBeenCalledWith("UPDATE settings SET value = ? WHERE setting_key = 'headless'", ['false']);
        });
    });
});
