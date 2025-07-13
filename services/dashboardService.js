'use strict';

const searchHistoryService = require('./searchHistoryService');

/**
 * Subtrai `offset` unidades de `unit` de uma Date
 * @param {Date} date
 * @param {'minutes'|'hours'|'days'|'weeks'|'months'|'years'} unit
 * @param {number} offset
 * @returns {Date}
 */
function subtractUnit(date, unit, offset) {
    const d = new Date(date);
    switch (unit) {
        case 'minutes':
            d.setMinutes(d.getMinutes() - offset);
            break;
        case 'hours':
            d.setHours(d.getHours() - offset);
            break;
        case 'days':
            d.setDate(d.getDate() - offset);
            break;
        case 'weeks':
            d.setDate(d.getDate() - offset * 7);
            break;
        case 'months':
            d.setMonth(d.getMonth() - offset);
            break;
        case 'years':
            d.setFullYear(d.getFullYear() - offset);
            break;
        default:
            throw new Error(`Unidade inválida: ${unit}`);
    }
    return d;
}

/**
 * Formata o label de cada ponto conforme a unidade
 * @param {Date} date
 * @param {'minutes'|'hours'|'days'|'weeks'|'months'|'years'} unit
 * @returns {string}
 */
function formatLabel(date, unit, count) {
    const optsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const optsTime = { hour: '2-digit', minute: '2-digit' };

    const hour = date.toLocaleTimeString('pt-BR', optsTime);
    const calendar = date.toLocaleDateString('pt-BR', optsDate);

    const full_time = `${calendar} ${hour}`;

    let view_label = full_time;

    switch (unit) {
        case 'minutes':
            view_label = date.toLocaleTimeString('pt-BR', optsTime)
            break;
        case 'hours':
            view_label = date.toLocaleTimeString('pt-BR', optsTime)
            break;
    }

    return view_label;

}

const dashboardService = {
    /**
     * Retorna, para cada usuário, os dados de labels e datasets
     * para plotagem da evolução de seguidores.
     *
     * @param {number|null} userId — filtra por user_id (ou null para todos, se isAdmin=true)
     * @param {boolean} isAdmin — se true, ignora o filtro por userId
     * @param {number} periodCount — número de pontos (ex: 4)
     * @param {'minutes'|'hours'|'days'|'weeks'|'months'|'years'} periodUnit — unidade de tempo
     * @returns {Promise<Object<string, { labels: string[], datasets: { label: string, data: (number|null)[] }[] }>>}
     */
    async getChartData(userId, isAdmin, periodCount = 4, periodUnit = 'weeks') {

        switch (periodCount) {
            case 1:

                switch (periodUnit) {
                    case 'hours':
                        periodCount = 60;
                        periodUnit = 'minutes';
                        break;
                    case 'days':
                        periodCount = 24;
                        periodUnit = 'hours';
                        break;
                    case 'weeks':
                        periodCount = 7;
                        periodUnit = 'days';
                        break;
                    case 'months':
                        periodCount = 31;
                        periodUnit = 'days';
                        break;
                    case 'years':
                        periodCount = 12;
                        periodUnit = 'months';
                        break;
                    default:
                        break;
                }

                break;

            default:
                break;
        }



        // 1. Buscar histórico
        const history = await searchHistoryService.getSearchHistory(userId, isAdmin);
        if (!history || history.length === 0) return {};

        // converter timestamp para Date
        history.forEach(r => (r.timestamp = new Date(r.timestamp)));

        // 2. Agrupar por user_id
        const byUser = history.reduce((acc, r) => {
            acc[r.user_id] = acc[r.user_id] || [];
            acc[r.user_id].push(r);
            return acc;
        }, {});

        // 3. Checkpoints
        const now = new Date();
        const checkpoints = Array.from({ length: periodCount }, (_, i) =>
            subtractUnit(now, periodUnit, periodCount - 1 - i)
        );
        const labels = checkpoints.map(d => formatLabel(d, periodUnit, periodCount));

        // 4. Construir datasets
        const finalChartData = {};
        for (const [uid, records] of Object.entries(byUser)) {
            // ordenar ascendente
            records.sort((a, b) => a.timestamp - b.timestamp);

            // baseline: primeiro registro de cada plataforma
            const platforms = [...new Set(records.map(r => r.platform))];
            const baseline = {};
            platforms.forEach(p => {
                const firstRec = records.find(r => r.platform === p);
                baseline[p] = firstRec ? firstRec.followers_count : null;
            });

            // preencher os dados para cada ponto
            const datasets = platforms.map(platform => {
                const data = checkpoints.map(cp => {
                    const recs = records.filter(r => r.platform === platform && r.timestamp <= cp);
                    return recs.length > 0
                        ? recs[recs.length - 1].followers_count
                        : baseline[platform];
                });
                return { label: platform, data };
            });

            finalChartData[uid] = { labels, datasets };
        }

        return finalChartData;
    },

    /**
     * Extrai o número de seguidores de raw_result (JSON string)
     * @param {string} rawResult
     * @returns {number|null}
     */
    extractFollowers(rawResult) {
        try {
            const data = JSON.parse(rawResult);
            return (
                data.followersCount ??
                data.follower_count ??
                data.statistics?.followerCount ??
                data.latest_posts?.[0]?.follower_count ??
                null
            );
        } catch {
            return null;
        }
    },

    /**
     * Gera uma cor hex aleatória — útil para front-end
     * @returns {string}
     */
    getRandomColor() {
        return (
            '#' +
            Math.floor(Math.random() * 0x1000000)
                .toString(16)
                .padStart(6, '0')
        );
    },
};

module.exports = dashboardService;
