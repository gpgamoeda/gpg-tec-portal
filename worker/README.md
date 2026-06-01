# GPG TEC Portal API

Esqueleto de backend para login real, modo admin e importacao GitHub server-side.

## Rotas Planejadas

```text
POST /api/login
POST /api/logout
GET  /api/session
GET  /api/projects
PUT  /api/projects/:id
POST /api/github/import
```

## Seguranca

- Senhas devem ser armazenadas como hash + salt, nunca reversiveis.
- Sessao futura deve usar cookie `HttpOnly`, `Secure` e `SameSite=Lax` ou `Strict`.
- Importacao de repos privados deve acontecer no Worker usando token em secret.

## Desenvolvimento

```bash
cd worker
npm install
npm run dev
```

## D1

```bash
wrangler d1 execute gpg-tec-portal --local --file=schema.sql
```
