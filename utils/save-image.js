/**
 * @file save-image.js
 * @description Módulo genérico para baixar e salvar recursos (imagens, SVGs, etc.) de uma URL.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Baixa um recurso de uma URL e salva em um caminho específico.
 * @param {string} url - URL do recurso.
 * @param {string} savePath - Caminho completo para salvar o recurso.
 * @returns {Promise<void>} Uma promessa que resolve quando o recurso é salvo.
 */
async function downloadResource(url, savePath) {
  const proto = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    proto.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Status code ${res.statusCode} for ${url}`));
      const file = fs.createWriteStream(savePath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(savePath)));
    }).on('error', reject);
  });
}

module.exports = {
    downloadResource,
};
