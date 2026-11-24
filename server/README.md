# Optional AI server for the store assistant

The store assistant works without this. Add it only if you want an AI model to answer the questions the built-in assistant cannot.

## What it does

- Receives the last few chat messages from your website (`POST /chat`).
- Adds your catalogue (from `js/data.js`) and your shipping rules, EMI options and FAQ (from `js/config.js`), so the model answers from your real products and prices.
- Calls an AI model through the OpenAI "chat completions" format and sends back `{ reply, products }`. The chat window shows the reply and a card for each product the model names.
- Keeps your API key in this server's environment. The browser never sees it.

The chat window only calls this server for questions it could not answer itself, and falls back to its built-in answer if the server is slow, down or returns something unexpected.

## Requirements

Node.js 18 or newer. There is nothing to install.

## Run it

Everything is set with environment variables.

| Variable | Meaning |
| --- | --- |
| `LLM_MODEL` | The model name. Required. |
| `LLM_BASE_URL` | Address of the model service (the part before `/chat/completions`). Default `https://api.openai.com/v1`. |
| `LLM_API_KEY` | Your key. Not needed for a model running on the same computer. |
| `ALLOW_ORIGIN` | Your shop's address, for example `https://www.yourshop.example`. Separate several with commas. Set this. |
| `PORT` | Default `8787`. |
| `RATE_LIMIT` | Questions per visitor per minute. Default `20`. |
| `TRUST_PROXY` | Set to `1` if the server sits behind a proxy that sets `X-Forwarded-For`. |

**A small model on your own computer (free and private).** Install Ollama, pull a small chat model (for example `ollama pull llama3.2`), then:

```
LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=llama3.2 ALLOW_ORIGIN=http://localhost:8000 node server/assistant-proxy.js
```

**A hosted model.** Use the service's OpenAI-compatible address, your key and a current model name from its documentation:

```
LLM_BASE_URL=https://api.example.com/v1 LLM_API_KEY=your-key LLM_MODEL=model-name ALLOW_ORIGIN=https://www.yourshop.example node server/assistant-proxy.js
```

Google's Gemini API has an OpenAI-compatible mode, so a key from Google AI Studio can be used here. Copy the base URL and a current model name from the "OpenAI compatibility" page in Google's Gemini API documentation, because model names change.

On Windows PowerShell, set each variable first, for example `$env:LLM_MODEL="model-name"`, then run `node server/assistant-proxy.js`.

Check it is running by opening `http://localhost:8787/health`. It should show `{"ok":true}`.

## Connect the website

In `js/config.js`, set the address of this server:

```js
assistant: { enabled: true, name: 'Store assistant', greeting: '...', endpoint: 'https://your-server.example/chat' }
```

Open the site, open the chat and ask something odd such as "blorp zxqv". An answer from the model, instead of "I am not sure I understood", means it works. The chat header then says "Some answers use an AI model".

## Safety notes

- **Keep the key on the server.** Never paste an API key into `config.js` or any other file the website serves.
- **Set `ALLOW_ORIGIN`.** Without it any website can use your server, and your key.
- **Set a spending limit** in your AI provider's dashboard. The built-in rate limit (per visitor, per minute) helps, but it is not a budget.
- **Use HTTPS.** A shop served over HTTPS cannot call an `http://` server. Host this on a service that gives you HTTPS.
- **Models can be wrong.** The instructions tell the model to use only your catalogue and policies, but a model can still make mistakes. The built-in assistant answers prices, stock, EMI and fit checks itself, from your data, and only passes on what it does not understand.
- **Privacy.** When this is on, shoppers' questions go to your server and then to the AI provider. This server does not store them and logs only errors. Say so in your privacy policy.

## Changing what the model is told

The instructions are the `SYSTEM` text near the top of `assistant-proxy.js`. Edit them to change the tone, the length of answers or the topics it should avoid.
