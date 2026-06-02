# GPG TEC Portal

Portal pessoal em formato de terminal para centralizar projetos publicados.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Desenvolvimento Com Docker

```bash
docker compose up --build
```

Depois abra:

```text
http://localhost:5173
```

## Build

```bash
npm run build
npm run preview
```

## API Local

Em um terminal:

```bash
cd worker
npm install
npm run dev
```

Em outro terminal:

```bash
$env:VITE_API_BASE_URL="http://127.0.0.1:8787"
npm run dev
```

O portal usa `VITE_API_BASE_URL` para encontrar a API local.

## Estrutura

```text
src/
  data/       catalogo de projetos
  styles/     estilos do portal
  terminal/   logica modular do terminal
public/
  projetos/   paginas estaticas dos dossies
```

## Modulos Principais

```text
src/terminal/app.js       conecta os modulos e eventos da tela
src/terminal/matrix.js    chuva Matrix inicial e modo ocioso
src/terminal/commands.js  comandos do terminal
src/terminal/ui.js        escrita, prompt e saida do terminal
src/terminal/glitch.js    falhas visuais de sinal
src/terminal/idle.js      timer de ociosidade
src/terminal/session.js   sessao em sessionStorage
src/terminal/admin.js     comandos admin experimentais
```

## Comandos Publicos

```text
projetos
dossie oraculo
ficha oraculo
repo oraculo
buscar copa
tags
online
recentes
status
abrir oraculo
```

## Comandos Admin Mockados

Estes comandos definem a interface futura. Ainda nao persistem alteracoes.

```text
admin
admin help
admin projetos
admin ver oraculo
admin status oraculo online
admin titulo oraculo Simulador Mundial
admin codinome oraculo Oraculo 32
admin resumo oraculo Novo resumo do projeto
admin visibilidade oraculo public
admin prioridade oraculo 1
admin url oraculo https://exemplo.com
admin alias add oraculo mundial
admin alias rm oraculo mundial
admin tag add oraculo simulador
admin tag rm oraculo simulador
admin stack add oraculo javascript
admin stack rm oraculo javascript
admin next add oraculo publicar painel final
admin next list oraculo
admin next rm oraculo 1
admin duplicar oraculo oraculo-clone
admin remover oraculo-clone
admin github owner/repo
admin cloudflare pages
admin cloudflare workers
admin cloudflare importar pages gpg-tec-portal
admin cloudflare importar workers gpg-tec-portal-api
admin sincronizar
admin export
admin copiar
admin download
admin colar
admin importar [{"id":"exemplo"}]
admin reset
admin sair
```

O comando `admin github owner/repo` importa metadados de repositorios publicos do GitHub pelo navegador:
descricao, README, linguagem principal, link, data de atualizacao e possiveis itens de roadmap.
Repositorios privados exigirao backend/token em uma etapa futura.

Os comandos `admin cloudflare pages` e `admin cloudflare workers` listam projetos ativos pela API do Worker.
O token da Cloudflare fica apenas no backend como secret.
O comando `admin sincronizar` salva o catalogo atual no D1.

## Backend

A pasta `worker/` contem a API em Cloudflare Workers para:

- login real
- sessao segura
- persistencia de projetos
- importacao GitHub server-side
- suporte futuro a repositorios privados

O login usa senha com PBKDF2-SHA256, salt unico e cookie de sessao `HttpOnly`.
Veja [worker/README.md](worker/README.md) para criar o D1 e cadastrar o primeiro admin.
