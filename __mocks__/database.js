const mockDb = {
    _lastID: 0,
    runAsync: jest.fn(function(sql, params) {
        console.log('db.runAsync called:', sql, params); // Adicionado para depuração
        if (sql.includes('INSERT')) {
            this._lastID++;
            return Promise.resolve({ lastID: this._lastID, changes: 1 });
        }
        return Promise.resolve({ lastID: 0, changes: 1 });
    }),
    getAsync: jest.fn((sql, params) => Promise.resolve(null)),
    allAsync: jest.fn((sql, params) => Promise.resolve([])),
};

module.exports = mockDb;