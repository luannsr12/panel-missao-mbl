const providerService = require('../../services/providerService');
const db = require('../../database'); // Importa o módulo real, que será mockado pelo Jest
const fs = require('fs');
const path = require('path');

jest.mock('../../database'); // Mocka o módulo database

jest.mock('fs');
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: jest.fn(),
}));

describe('providerService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        db.runAsync.mockResolvedValue({ lastID: 1, changes: 1 });
        db.getAsync.mockResolvedValue(null);
        db.allAsync.mockResolvedValue([]);

        // Mock para fs.readdirSync
        fs.readdirSync.mockReturnValue([
            { name: 'apify', isDirectory: () => true },
            { name: 'default', isDirectory: () => true },
            { name: 'somefile.txt', isDirectory: () => false },
        ]);

        // Mock para fs.existsSync
        fs.existsSync.mockReturnValue(true);

        // Mock para fs.readFileSync
        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('apify/config.json')) {
                return JSON.stringify({ name: 'Apify' });
            } else if (filePath.includes('default/config.json')) {
                return JSON.stringify({ name: 'Default' });
            }
            return '{}';
        });

        // Mock para path.join
        path.join.mockImplementation((...args) => args.join('/'));
    });

    describe('getAvailableProviders', () => {
        test('deve retornar uma lista de provedores disponíveis', async () => {
            const providers = await providerService.getAvailableProviders();
            expect(providers).toEqual({
                Apify: 'Apify',
                Default: 'Default',
            });
            expect(fs.readdirSync).toHaveBeenCalled();
            expect(fs.existsSync).toHaveBeenCalledTimes(2);
            expect(fs.readFileSync).toHaveBeenCalledTimes(2);
        });
    });

    describe('getCurrentProviderSettings', () => {
        test('deve retornar as configurações atuais dos provedores', async () => {
            const mockSettings = [
                { platform: 'instagram', provider_name: 'Apify', is_default: 1 },
            ];
            db.allAsync.mockResolvedValue(mockSettings);
            const settings = await providerService.getCurrentProviderSettings();
            expect(settings).toEqual(mockSettings);
            expect(db.allAsync).toHaveBeenCalledWith("SELECT * FROM provider_settings");
        });
    });

    describe('updateProviderSetting', () => {
        test('deve atualizar a configuração do provedor', async () => {
            await providerService.updateProviderSetting('instagram', 'Apify');
            expect(db.runAsync).toHaveBeenCalledWith("UPDATE provider_settings SET is_default = 0 WHERE platform = ?", ['instagram']);
            expect(db.runAsync).toHaveBeenCalledWith("INSERT OR REPLACE INTO provider_settings (platform, provider_name, is_default) VALUES (?, ?, 1)", ['instagram', 'Apify']);
        });
    });
});
