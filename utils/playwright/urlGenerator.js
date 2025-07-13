/**
 * @file urlGenerator.js
 * @description Módulo para gerar URLs de perfis em diversas redes sociais.
 */

/**
 * Gera a URL de perfil para uma dada rede social e nome de usuário.
 * @param {string} platform - A plataforma da rede social (ex: 'instagram', 'x', 'kwai', 'youtube').
 * @param {string} username - O nome de usuário ou ID do canal.
 * @returns {string|null} A URL completa do perfil ou null se a plataforma não for suportada.
 */
function generateProfileUrl(platform, username) {
  if (!platform || !username) {
    console.warn('Plataforma ou nome de usuário não fornecidos para geração de URL.');
    return null;
  }

  const lowerCasePlatform = platform.toLowerCase();

  switch (lowerCasePlatform) {
    case 'instagram':
      return `https://www.instagram.com/${username}/`;
    case 'x': // Antigo Twitter
      return `https://x.com/${username}`;
    case 'kwai':
      // Kwai geralmente usa um ID de usuário ou um link direto para o perfil.
      // Esta é uma URL de exemplo, pode precisar ser ajustada com base em como os perfis são acessados.
      return `https://www.kwai.com/user/@${username}`;
    case 'youtube':
      // YouTube pode ter URLs de canal baseadas em nome de usuário, ID de canal ou handle.
      // Esta é uma URL de exemplo para um handle ou nome de usuário legado.
      // Para IDs de canal, seria 'https://www.youtube.com/channel/UC...'
      return `https://www.youtube.com/@${username}`;
    default:
      console.warn(`Plataforma não suportada para geração de URL: ${platform}`);
      return null;
  }
}

module.exports = {
  generateProfileUrl,
};
