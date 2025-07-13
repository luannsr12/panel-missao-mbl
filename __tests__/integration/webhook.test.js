const request = require('supertest');
const app = require('../../server'); // Importa a instância do seu aplicativo Express
const db = require('../../database');
const profileService = require('../../services/profileService');

// Mock do profileService para isolar o teste do banco de dados real
jest.mock('../../services/profileService', () => ({
    updateProfileStatus: jest.fn(),
    processScrapingResult: jest.fn(),
}));

describe('Webhook /scraping-completed', () => {
    beforeAll(async () => {
        // Limpa os mocks antes de todos os testes
        profileService.updateProfileStatus.mockClear();
        profileService.processScrapingResult.mockClear();
    });

    afterEach(() => {
        // Limpa os mocks após cada teste
        profileService.updateProfileStatus.mockClear();
        profileService.processScrapingResult.mockClear();
    });

    it('deve retornar 200 e processar o webhook com sucesso para status completed', async () => {
        const mockPayload = {
            profileId: 1,
            userId: 1,
            platform: 'instagram',
            username: 'testuser',
            provider: 'default',
            status: 'completed',
            rawResult: { followers: 1000, posts: 10 },
            errorMessage: null,
        };

        profileService.processScrapingResult.mockResolvedValue(true);

        const res = await request(app)
            .post('/webhook/scraping-completed')
            .send(mockPayload);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Webhook processado com sucesso.');
        expect(profileService.processScrapingResult).toHaveBeenCalledTimes(1);
        expect(profileService.processScrapingResult).toHaveBeenCalledWith(mockPayload);
    });

    it('deve retornar 200 e processar o webhook com sucesso para status error', async () => {
        const mockPayload = {
            profileId: 2,
            userId: 1,
            platform: 'instagram',
            username: 'anotheruser',
            provider: 'default',
            status: 'error',
            rawResult: null,
            errorMessage: 'Erro de scraping simulado',
        };

        profileService.processScrapingResult.mockResolvedValue(true);

        const res = await request(app)
            .post('/webhook/scraping-completed')
            .send(mockPayload);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Webhook processado com sucesso.');
        expect(profileService.processScrapingResult).toHaveBeenCalledTimes(1);
        expect(profileService.processScrapingResult).toHaveBeenCalledWith(mockPayload);
    });

    it('deve retornar 400 se o payload for inválido (faltando profileId)', async () => {
        const mockPayload = {
            userId: 1,
            platform: 'instagram',
            username: 'testuser',
            provider: 'default',
            status: 'completed',
            rawResult: { followers: 1000, posts: 10 },
            errorMessage: null,
        };

        const res = await request(app)
            .post('/webhook/scraping-completed')
            .send(mockPayload);

        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toEqual('Payload inválido. profileId e status são obrigatórios.');
        expect(profileService.processScrapingResult).not.toHaveBeenCalled();
    });

    it('deve retornar 400 se o payload for inválido (faltando status)', async () => {
        const mockPayload = {
            profileId: 1,
            userId: 1,
            platform: 'instagram',
            username: 'testuser',
            provider: 'default',
            rawResult: { followers: 1000, posts: 10 },
            errorMessage: null,
        };

        const res = await request(app)
            .post('/webhook/scraping-completed')
            .send(mockPayload);

        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toEqual('Payload inválido. profileId e status são obrigatórios.');
        expect(profileService.processScrapingResult).not.toHaveBeenCalled();
    });

    it('deve retornar 500 se ocorrer um erro interno no processamento', async () => {
        const mockPayload = {
            profileId: 1,
            userId: 1,
            platform: 'instagram',
            username: 'testuser',
            provider: 'default',
            status: 'completed',
            rawResult: { followers: 1000, posts: 10 },
            errorMessage: null,
        };

        profileService.processScrapingResult.mockRejectedValue(new Error('Erro simulado no serviço'));

        const res = await request(app)
            .post('/webhook/scraping-completed')
            .send(mockPayload);

        expect(res.statusCode).toEqual(500);
        expect(res.body.error).toEqual('Erro interno do servidor ao processar webhook.');
        expect(profileService.processScrapingResult).toHaveBeenCalledTimes(1);
        expect(profileService.processScrapingResult).toHaveBeenCalledWith(mockPayload);
    });
});
