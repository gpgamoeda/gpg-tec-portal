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
admin visibilidade oraculo public
admin prioridade oraculo 1
admin url oraculo https://exemplo.com
admin tag add oraculo simulador
admin tag rm oraculo simulador
admin github owner/repo
admin export
admin reset
admin sair
```

O comando `admin github owner/repo` importa metadados de repositorios publicos do GitHub pelo navegador:
descricao, README, linguagem principal, link, data de atualizacao e possiveis itens de roadmap.
Repositorios privados exigirao backend/token em uma etapa futura.

## Backend Planejado

A pasta `worker/` contem o esqueleto de uma API em Cloudflare Workers para:

- login real
- sessao segura
- persistencia de projetos
- importacao GitHub server-side
- suporte futuro a repositorios privados
