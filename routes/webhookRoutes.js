const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { download } = require('../utils/download'); 
const profileService = require('../services/profileService');

router.post('/webhook/scraping-completed', async (req, res) => {
    try {
        const payload = req.body;
        console.log("Webhook recebido:", payload);

        // Validação básica do payload
        if (!payload || !payload.profileId || !payload.status) {
            return res.status(400).json({ error: 'Payload inválido. profileId e status são obrigatórios.' });
        }

        let path_image_profile = null;

        // baixa imagem se existir
        if (payload?.profile_pic_url) {

            const image_profile = payload?.profile_pic_url;

            try {
                const urlObj = new URL(image_profile);
                let ext = path.extname(urlObj.pathname) || '.jpg';
                if (!/\.(jpe?g|png|gif|webp)$/i.test(ext)) ext = '.jpg';
                const imgPath = path.join(payload?.path_profile, `${payload?.username}${ext}`);
               
                payload.path_image_profile = imgPath;

                await download(
                    image_profile,
                    imgPath,
                    (progress) => console.log(`Download progress: ${progress.percent.toFixed(1)}%`),
                    (response) => console.log(`HTTP status: ${response.status}`),
                    (error) => console.error(`Download error: ${error.message}`),
                    () => {

                        if (payload) {
                            payload.local_profile_pic = path.join(imgPath);
                            if (payload.rawResult) {
                                payload.rawResult.local_profile_pic = path.join(imgPath);
                            }
                        }

                        try {

                            if (payload?.json_raw) {
                                fs.writeFileSync(
                                    payload.json_raw,
                                    JSON.stringify(payload, null, 2),
                                    'utf-8'
                                );
                                console.log(`Updated main JSON at ${payload.json_raw}`);
                            }

                            if (payload?.path_profile) {
                                const profileDataPath = path.join(payload.path_profile, 'profile-data.json');
                                fs.writeFileSync(
                                    profileDataPath,
                                    JSON.stringify(payload.rawResult || {}, null, 2),
                                    'utf-8'
                                );
                                console.log(`Updated profile data at ${profileDataPath}`);
                            }
                        } catch (error) {
                            console.error('Error updating JSON files:', error);
                        }
                        
                    }
                );

            } catch (err) {
                console.error(`[saveJson] falha ao baixar imagem: ${err.message}`);
            }
        }

        console.log('PROCESS', payload)

        await profileService.processScrapingResult(payload);
        res.status(200).json({ message: 'Webhook processado com sucesso.' });

    } catch (error) {
        console.error("Erro ao processar webhook:", error);
        res.status(500).json({ error: 'Erro interno do servidor ao processar webhook.' });
    }
});

module.exports = router;
