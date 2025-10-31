# Painel Missão MBL PE

Painel de administração / interface web para a Missão MBL PE

## 🚀 Visão geral

Este projeto é um painel web construído com JavaScript/Node.js (backend) + EJS/CSS para frontend, com o propósito de gerenciar funcionalidades da Missão MBL. Ele inclui rotas, serviços, middlewares, provedor de banco, logger, etc.

## 🔧 Tecnologias utilizadas

* Node.js
* Express
* EJS (template engine)
* CSS simples para estilização
* Banco de dados (ver arquivo `database.js`)
* Estrutura de diretórios:

  * `middlewares/` — middlewares para rotas
  * `providers/` — provedores (serviço de api scraping)
  * `services/` — lógica de negócio
  * `routes/` — definição de rotas HTTP
  * `utils/` — utilitários gerais
  * `views/` — arquivos EJS para exibição
  * `public/` — arquivos estáticos (CSS, imagens, scripts)
* Arquivos de suporte:

  * `.env.example` — variáveis de ambiente de exemplo
  * `migrate_db.js`, `seed.js` — scripts para migração e seed do banco

## 📁 Estrutura de pastas

```
/
├── __mocks__/
├── __tests__/
├── middlewares/
├── providers/
├── public/
├── routes/
├── services/
├── utils/
├── views/
├── database.js
├── get_profile.js
├── logger.js
├── migrate_db.js
├── seed.js
├── server.js
├── package.json
└── .env.example
```

## 🛠 Como rodar o projeto

1. Clone o repositório:

   ```bash
   git clone https://github.com/luannsr12/panel-missao-mbl.git
   cd panel-missao-mbl
   ```
2. Instale as dependências:

   ```bash
   npm install
   ```
3. Crie o arquivo de ambiente baseado em `.env.example` e ajuste as variáveis (ex: conexão com o banco, porta, etc).
4. Execute migrações e/ou seed se necessário:

   ```bash
   node migrate_db.js
   node seed.js
   ```
5. Inicie o servidor:

   ```bash
   node server.js
   ```
6. Acesse via navegador em `http://localhost:<PORT>` (definido no `.env`).

## ✅ Funcionalidades principais

* Autenticação
* Painel administrativo com visualização de dados
* Serviços de backend para manipular dados
* Rotas segregadas conforme recurso
* Logs de execução e erros (via `logger.js`)
* Migração e seed de base de dados
* Separação clara de responsabilidades e camadas

## 🎯 Boas práticas e diretrizes

* Manter lógica de negócio isolada nos serviços
* Manter rotas finas, sem lógica pesada
* Usar middlewares para validação/autenticação
* Versionar corretamente e documentar alterações
* Escrever testes (pasta `__tests__`) para garantir estabilidade

## 🧪 Testes

Se houver testes escritos na pasta `__tests__`, execute:

```bash
npm test
```

(adapte conforme framework usado — Jest, Mocha, etc)

## 📄 Licença

Este projeto está sob a licença **MIT**.
Sinta-se livre para reutilizar ou modificar.

## 👤 Autor

Desenvolvido por **Luan** — full-stack developer.
