/**
 * @file url-builder.js
 * @description Módulo para gerar URLs de perfis em diversas redes sociais.
 */

/**
 * Gera a URL de perfil para uma dada rede social e nome de usuário.
 * @param {string} platform - A plataforma da rede social (ex: 'instagram', 'x', 'kwai', 'youtube').
 * @param {string} username - O nome de usuário ou ID do canal.
 * @returns {string|null} A URL completa do perfil ou null se a plataforma não for suportada.
 */
function buildProfileUrl(platform, username) {
  if (!platform || !username) {
    console.warn('Plataforma ou nome de usuário não fornecidos para geração de URL.');
    return null;
  }

  const lowerCasePlatform = platform.toLowerCase();

  switch (lowerCasePlatform) {
    case 'instagram':
      return `https://www.instagram.com/${username}/`;
    case 'twitter': // Alias para X
    case 'x': // Antigo Twitter
      return `https://x.com/${username}`;
    case 'kwai':
      return `https://www.kwai.com/user/@${username}`;
    case 'youtube':
      return `https://www.youtube.com/@${username}`;
    case 'tiktok':
      return `https://tiktok.com/@${username}`;
    case 'linkedin':
      return `https://www.linkedin.com/in/${username}`;
    case 'facebook':
      return `https://www.facebook.com/${username}`;
    default:
      console.warn(`Plataforma não suportada para geração de URL: ${platform}`);
      return null;
  }
}

module.exports = {
  buildProfileUrl,
};
