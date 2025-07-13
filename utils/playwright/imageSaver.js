import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { promisify } from 'util';
import { exec as execOrig } from 'child_process';

// Convert exec to promise-based version
const exec = promisify(execOrig);


/**
 * Download via HTTP/HTTPS fallback (no Playwright), with User-Agent header.
 * @param {string} urlStr
 * @returns {Promise<{buffer: Buffer}>}
 */
async function downloadResourceWithoutPlaywright(urlStr) {
    console.log(`[imageSaver] HTTP download start: ${urlStr}`);
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    const options = {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        },
    };

    return new Promise((resolve, reject) => {
        const req = client.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`[imageSaver] Redirect to: ${res.headers.location}`);
                return resolve(downloadResourceWithoutPlaywright(res.headers.location));
            }
            if (res.statusCode !== 200) {
                const err = new Error(`HTTP status ${res.statusCode}`);
                console.error(`[imageSaver] ${err.message} for ${urlStr}`);
                return reject(err);
            }

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                console.log(`[imageSaver] HTTP download complete: ${buffer.length} bytes`);
                resolve({ buffer });
            });
        });

        req.on('error', (err) => {
            console.error(`[imageSaver] HTTP error for ${urlStr}: ${err.message}`);
            reject(err);
        });
        req.setTimeout(15000, () => {
            console.error(`[imageSaver] HTTP timeout for ${urlStr}`);
            req.destroy(new Error('Timeout ao baixar recurso'));
        });
    });
}

/**
 * Download resource using Playwright if available, otherwise HTTP fallback.
 * @param {string} urlStr
 * @param {object|null} page Playwright Page instance
 * @returns {Promise<{buffer: Buffer}>}
 */
async function downloadResource(urlStr, page = null) {
    console.log(`[imageSaver] downloadResource called for ${urlStr}`);
    if (page && typeof page.goto === 'function') {
        try {
            console.log(`[imageSaver] Playwright download start: ${urlStr}`);
            const response = await page.goto(urlStr, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            if (!response.ok()) throw new Error(`Playwright status ${response.status()}`);
            const buffer = await response.body();
            console.log(`[imageSaver] Playwright download complete: ${buffer.length} bytes`);
            return { buffer };
        } catch (err) {
            console.warn(
                `[imageSaver] Playwright failed for ${urlStr}: ${err.message}. Falling back to HTTP.`
            );
        }
    }
    console.log(`[imageSaver] Falling back to HTTP for ${urlStr}`);
    return downloadResourceWithoutPlaywright(urlStr);
}

/**
 * Baixa uma imagem usando wget via shell com headers e salva em savePath
 * @param {string} urlStr - URL da imagem
 * @param {string} savePath - Caminho onde salvar a imagem
 * @param {string} rede - rede de referência para referer (padrão: 'google')
 * @returns {Promise<string>} - Resolve com o savePath em caso de sucesso
 */
export async function downloadAndSaveImage(urlStr, savePath, rede = null) {
    if (typeof savePath !== 'string') {
        throw new TypeError('downloadAndSaveImage: savePath must be a string');
    }

    console.log(`[imageSaver] downloadAndSaveImage called for ${urlStr}`);

    // Garante que o diretório existe
    const dir = path.dirname(savePath);
    fs.mkdirSync(dir, { recursive: true });

    // Extrai host para referer
    const hostname = rede ? `https://${rede}.com` : new URL(urlStr).hostname;

    const args = [
        'wget',
        '-O', savePath,
        '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)"',
        `--referer="https://${hostname}/"`,
        `"${urlStr}"`,
    ];

    const { stdout, stderr } = await exec(args.join(' '));
    console.log('IMG-stdout:', stdout);
    console.log('IMG-stderr:', stderr);
}

export { downloadResource, downloadResourceWithoutPlaywright };

/**
 * Extrai o hostname de uma URL
 * @param {string} urlStr - URL completa
 * @returns {string} hostname (ex: 'example.com')
 */
export function getHostnameFromUrl(urlStr) {
    try {
        return new URL(urlStr).hostname;
    } catch (err) {
        console.error(`[imageSaver] Invalid URL: ${urlStr}`);
        throw err;
    }
}
