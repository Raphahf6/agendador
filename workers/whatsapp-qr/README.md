# Horalis WhatsApp QR Worker

Conector beta para testar atendimento pelo WhatsApp Web via QR Code. O Docker sobe a API local do agente e o backend do WhatsApp; o QR Code aparece no painel do Horalis.

Este conector nao usa a API oficial da Meta. Ele usa Baileys, sem Chromium/Puppeteer, para consumir bem menos RAM por sessao. Ainda assim depende do WhatsApp Web, pode desconectar, quebrar com mudancas do WhatsApp e deve ser tratado como experimento/beta.

Ao migrar do worker antigo `whatsapp-web.js` para Baileys, escaneie o QR Code uma vez novamente. Depois a sessao nova fica persistida no volume Docker.

## Variaveis

Configure no `.env.local` da raiz, para a API local:

```env
HORALIS_CHANNEL_API_KEY=gere-uma-chave-grande
VITE_WHATSAPP_QR_API_URL=http://localhost:8788
```

Crie tambem um `.env.whatsapp.local` na raiz, para o Docker. Use o exemplo `.env.whatsapp.example`:

```env
HORALIS_API_PORT=8787
HORALIS_PUBLIC_BASE_URL=https://horalis.app
HORALIS_CHANNEL_API_KEY=gere-uma-chave-grande
WHATSAPP_SESSION_NAME=horalis-dev
WHATSAPP_IGNORE_GROUPS=true
WHATSAPP_REPLY_DELAY_MS=350
WHATSAPP_INBOUND_DEBOUNCE_MS=1400
WHATSAPP_COMBINE_WINDOW_MS=7000
WHATSAPP_QUEUE_CONCURRENCY=2
WHATSAPP_MAX_SESSIONS=8
WHATSAPP_TYPING_MIN_DELAY_MS=1200
WHATSAPP_TYPING_MAX_DELAY_MS=8000
WHATSAPP_TYPING_CHARS_PER_SECOND=35
WHATSAPP_QR_PORT=8788
```

`HORALIS_CHANNEL_API_KEY` precisa ser igual no worker e na API local. O `docker-compose.whatsapp.yml` tambem le o `.env.local` para passar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, OpenAI, Mercado Pago e demais variaveis da API.

Para confirmar sinais automaticamente, configure o webhook de pagamentos no Mercado Pago apontando para:

```text
https://horalis.app/api/v1/webhooks/mercadopago
```

Se usar outro dominio, ajuste `HORALIS_PUBLIC_BASE_URL` e/ou `MERCADO_PAGO_WEBHOOK_URL`.

## Rodando local

Suba a API local e o backend do WhatsApp juntos:

```bash
docker compose --env-file .env.whatsapp.local -f docker-compose.whatsapp.yml up --build
```

Continue rodando o frontend com `npm run dev`. Abra o painel em `Agente de Atendimento`, clique em conectar e escaneie o QR Code exibido na tela. O slug do salao vem automaticamente do painel.

Depois do primeiro QR lido, a sessao fica salva no volume `whatsapp_qr_auth`. Ao reiniciar o Docker, o worker restaura automaticamente as sessoes salvas, sem precisar clicar em conectar novamente no painel.

## Fila, prioridade e digitacao

O worker nao responde direto no evento recebido. Cada estabelecimento tem sua propria fila:

- mensagens rapidas do mesmo cliente sao combinadas antes de chamar o agente;
- mensagens do mesmo cliente nunca rodam em paralelo;
- mensagens de Pix, confirmacao, remarcacao e agendamento ganham prioridade;
- a resposta simula digitacao com `sendPresenceUpdate('composing')` e atraso proporcional ao tamanho do texto;
- `WHATSAPP_QUEUE_CONCURRENCY` controla quantos clientes diferentes podem ser atendidos ao mesmo tempo em uma mesma sessao;
- `WHATSAPP_MAX_SESSIONS` limita quantos estabelecimentos um worker aceita restaurar/iniciar.

Os valores padrao atendem bem 4 ou 5 estabelecimentos pequenos no mesmo worker. Para volume maior, prefira dividir estabelecimentos entre mais workers.

## Rodando em producao com Vercel e Render

Em producao, a Vercel roda o site e a API principal. O Render roda apenas o worker do WhatsApp em uma URL HTTPS propria, por exemplo:

```text
https://horalis-whatsapp-qr.onrender.com
```

Fluxo:

```text
Painel Horalis -> /api/v1/admin/whatsapp-qr/:slug/:acao na Vercel
Vercel -> WHATSAPP_QR_WORKER_URL com X-Horalis-Channel-Key
Worker Docker -> https://horalis.app/api/v1/channels/whatsapp_qr/:slug/message
```

O dominio `whatsapp.horalis.app` e opcional. So configure quando o DNS apontar para o Render ou para outro servidor do worker. Enquanto isso, use a URL `.onrender.com` em `WHATSAPP_QR_WORKER_URL`.

No servidor, copie os arquivos do projeto e crie o env:

```bash
cp .env.whatsapp.prod.example .env.whatsapp.prod
```

Edite `.env.whatsapp.prod`:

```env
WHATSAPP_QR_DOMAIN=whatsapp.horalis.app
HORALIS_API_BASE_URL=https://horalis.app/api/v1
HORALIS_CHANNEL_API_KEY=mesma_chave_configurada_na_vercel
WHATSAPP_SESSION_NAME=horalis-prod
WHATSAPP_IGNORE_GROUPS=true
WHATSAPP_REPLY_DELAY_MS=350
WHATSAPP_INBOUND_DEBOUNCE_MS=1400
WHATSAPP_COMBINE_WINDOW_MS=7000
WHATSAPP_QUEUE_CONCURRENCY=2
WHATSAPP_MAX_SESSIONS=8
WHATSAPP_TYPING_MIN_DELAY_MS=1200
WHATSAPP_TYPING_MAX_DELAY_MS=8000
WHATSAPP_TYPING_CHARS_PER_SECOND=35
```

Suba o worker com HTTPS automatico pelo Caddy:

```bash
docker compose -f docker-compose.whatsapp.prod.yml up -d --build
```

Na Vercel, configure:

```env
WHATSAPP_QR_WORKER_URL=https://whatsapp.horalis.app
HORALIS_CHANNEL_API_KEY=mesma_chave_do_worker
```

Em Render, use:

```env
WHATSAPP_QR_WORKER_URL=https://horalis-whatsapp-qr.onrender.com
HORALIS_CHANNEL_API_KEY=mesma_chave_do_worker
```

Depois faca um redeploy da Vercel para a API carregar a nova variavel. Nao exponha a porta `8788` diretamente para a internet sem o proxy HTTPS. As rotas de sessao tambem exigem `HORALIS_CHANNEL_API_KEY`.

## Resetar sessao

```bash
docker compose --env-file .env.whatsapp.local -f docker-compose.whatsapp.yml down -v
```
