# GPG TEC Portal API

Backend em Cloudflare Workers para login real, modo admin e importacao GitHub server-side.

## Rotas Planejadas

```text
POST /api/setup/admin
POST /api/login
POST /api/logout
GET  /api/session
GET  /api/public/projects
GET  /api/projects
PUT  /api/projects/:id
DELETE /api/projects/:id
POST /api/projects/seed
POST /api/github/import
GET  /api/cloudflare/pages
GET  /api/cloudflare/workers
```

## Seguranca

- Senhas sao armazenadas com PBKDF2-SHA256, salt unico e 100000 iteracoes.
- A senha nunca e salva de forma reversivel.
- Sessao usa token aleatorio salvo em cookie `HttpOnly`, `Secure` e `SameSite=None`.
- O banco guarda apenas o hash do token da sessao.
- Importacao de repos privados deve acontecer no Worker usando token em secret.

## Desenvolvimento

```bash
cd worker
npm install
npm run dev
```

Em outro terminal, rode o portal:

```bash
cd ..
$env:VITE_API_BASE_URL="http://127.0.0.1:8787"
npm run dev
```

O portal usa `VITE_API_BASE_URL` para encontrar a API durante o desenvolvimento.

## D1

```bash
wrangler d1 execute gpg-tec-portal --local --file=schema.sql
```

## Criar Primeiro Admin

Crie um token temporario de setup:

```bash
wrangler secret put SETUP_TOKEN
```

Com o Worker local rodando, cadastre o admin:

```bash
curl -X POST http://127.0.0.1:8787/api/setup/admin ^
  -H "content-type: application/json" ^
  -H "authorization: Bearer SEU_SETUP_TOKEN" ^
  -d "{\"email\":\"seu-email@dominio.com\",\"password\":\"uma-senha-com-12-caracteres-ou-mais\"}"
```

Depois de publicar, repita o cadastro contra a URL real do Worker ou aplique o D1 remoto:

```bash
wrangler d1 execute gpg-tec-portal --remote --file=schema.sql
```

## Variaveis E Secrets

```text
SETUP_TOKEN          secret temporario para criar/atualizar o admin
CF_API_TOKEN         token Cloudflare com leitura de Pages e Workers
CF_ACCOUNT_ID        account id da conta Cloudflare
SESSION_TTL_SECONDS  tempo da sessao em segundos, padrao 28800
ALLOWED_ORIGINS      origens autorizadas para CORS, separadas por virgula
COOKIE_SAMESITE      use Lax no mesmo dominio; use None quando site e API ficarem em dominios diferentes
```

## Vínculo Com Cloudflare

Crie um API Token na Cloudflare com permissoes de leitura:

```text
Account / Cloudflare Pages / Read
Account / Workers Scripts / Read
```

Depois salve o token como secret:

```bash
wrangler secret put CF_API_TOKEN
```

E configure o account id no `wrangler.toml` ou nas variaveis do Worker:

```text
CF_ACCOUNT_ID=seu_account_id
```
