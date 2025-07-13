/**
 * @file download.js
 * @description Módulo para baixar
 */

const fs = require('fs');
const axios = require('axios');


/**
 * Downloads a file from a URI and saves it to a specified path with progress tracking
 * @param {string} uri - The source URI to download from
 * @param {string} path - The destination path to save the file
 * @param {function} onProgress - Callback for progress updates
 * @param {function} onResponse - Callback when response is received
 * @param {function} onError - Callback for error handling
 * @param {function} onEnd - Callback when download completes
 */
async function download (uri, path, onProgress, onResponse, onError, onEnd){
    axios({
        method: 'get',
        url: uri,
        responseType: 'stream'
    })
        .then(response => {
            if (typeof onResponse === 'function') {
                onResponse(response);
            }

            const writer = fs.createWriteStream(path);

            response.data.on('data', (chunk) => {
                if (typeof onProgress === 'function') {
                    const progress = {
                        percent: (writer.bytesWritten / parseInt(response.headers['content-length'] || '1')) * 100,
                        transferred: writer.bytesWritten,
                        total: parseInt(response.headers['content-length'] || '0')
                    };
                    onProgress(progress);
                }
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    if (typeof onEnd === 'function') {
                        onEnd();
                    }
                    resolve();
                });
                writer.on('error', error => {
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                });
            });
        })
        .catch(error => {
            if (typeof onError === 'function') {
                onError(error);
            }
        });
}

module.exports = {
    download
}
