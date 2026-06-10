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

## Resetar sessao

```bash
docker compose --env-file .env.whatsapp.local -f docker-compose.whatsapp.yml down -v
```
