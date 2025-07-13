const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'server.log');

const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    fs.appendFileSync(logFile, `[LOG] ${new Date().toISOString()} ${message}\n`);
    originalLog.apply(console, args);
};

console.error = function(...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    fs.appendFileSync(logFile, `[ERROR] ${new Date().toISOString()} ${message}\n`);
    originalError.apply(console, args);
};

console.log('Logger inicializado. Logs serão salvos em:', logFile);

process.on('exit', () => {
    fs.fsyncSync(fs.openSync(logFile, 'a'));
});