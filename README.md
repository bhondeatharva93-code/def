# YourBrand PC Store

A static online-store template for a computer shop, written in plain HTML, CSS and JavaScript. No build step, no framework, no server needed to try it. (The optional AI server in `server/` is the only part that needs Node.)

It is an original template. It is not the code or content of any existing store. The brand, contact details, products, prices and policy text are all placeholders for you to replace.

## Run it

Open `index.html` in a browser. That is all.

For the best result use a tiny local server instead. Some browsers (Firefox and Safari) may treat every file on disk as its own site, so the cart may not carry over between pages when you open files directly. It does carry over in Chrome and Edge.

```
python3 -m http.server 8000
```

Then visit http://localhost:8000

## What is inside

| Page | What it does |
| --- | --- |
| `index.html` | Home. Budget and use-case picker, best sellers, deals, custom-build teaser, EMI calculator, test sheet, steps, FAQ |
| `shop.html` | All products. Category, use, brand, price and stock filters, sorting, search, "show more". Filters live in the URL, so results can be shared |
| `product.html?id=...` | One product with specs, EMI estimate and related items |
| `build.html` | Custom PC builder. Five presets, a picker per slot, a live fit check (socket, RAM type, cabinet size, cooler, power supply) |
| `cart.html` | Cart, delivery form, order summary. The order is saved in the browser and can be sent to you on WhatsApp |
| `contact.html` | Sales and service request form that opens WhatsApp or email with the details filled in |
| `policies.html` | Shipping, returns, warranty, privacy and terms. Template text only |

The cart, wishlist and orders are kept in the browser (`localStorage`). There is no back end.

## Make it yours

1. **`js/config.js`**: store name, phone, WhatsApp number, address, opening hours, social links, GST, shipping rules, EMI tenures, the strip above the header, the "why buy here" block, the steps and the FAQ. Keep only claims that are true for your shop. The pages read the store name from this file, but the `<title>` tags (and the `og:title` on the home page) are plain text in each HTML file, so search and replace `YourBrand` in the HTML files too. Search engines and link previews read those.
2. **`js/data.js`**: the catalogue (93 sample products). Add a product with one line using the helper functions defined in that file: `pc(...)` for prebuilt PCs, `cpu(...)`, `mb(...)`, `ram(...)`, `gpu(...)`, `psu(...)` for parts the builder understands, and `add(...)` for everything else. Every product needs a unique `id`. Prices are treated as GST-inclusive.
3. **`css/styles.css`**: colours and sizes are variables in the `:root` block at the top. Change them there first.
4. **`policies.html`**: replace the template text with your real policies. Have it checked by someone qualified before you publish.
5. **Pictures**: products use drawn art made by `PCS.art()` in `js/icons.js` (a PC tower for PCs, an icon tile for everything else). It is used by the cards, the product page and the cart. To use photos, add an `img` field to a product and make `PCS.art` return an `<img>` tag when that field exists.

The sample brands in the catalogue other than AMD, Intel and NVIDIA are made up. Component names such as "Ryzen 5 5600" are used only to describe the part. Prices are examples, not real quotes.

## Store assistant

Every page has a "Help me choose" button that opens a chat window. Shoppers can say what the PC is for and their budget, ask for parts, compare two products, check whether a processor and motherboard fit, work out EMI, and ask about delivery, payment, warranty and returns. Product answers come with Add to cart buttons.

**What it is.** A small rule-based assistant that runs in the browser. It is not a downloaded language model. It needs no API key, works offline and sends nothing anywhere. It answers from your own catalogue (`js/data.js`), your settings and FAQ (`js/config.js`) and a list of short PC knowledge answers (`js/assistant-kb.js`). So it never invents a product or a price, but it can only answer what it was built to understand. When it does not understand, it says so and offers WhatsApp.

| File | Job |
| --- | --- |
| `js/assistant-brain.js` | Reads a message and decides the answer: budget and use detection, product search, compare, fit check, EMI, FAQ |
| `js/assistant-kb.js` | "What is..." and "which is better" answers. Add your own at the end of the list |
| `js/assistant.js`, `css/assistant.css` | The button, the window, and keeping the conversation as the shopper moves between pages |

Settings are in `js/config.js` under `assistant`: `enabled` (set to `false` to remove the button), `name`, `greeting` and `endpoint`.

Things to know:

- Answers repeat your `faq` text and your shipping and EMI settings. Replace the placeholder FAQ answers, above all the return policy, with your real rules, or the assistant will repeat the placeholders.
- It tells shoppers it is automated. Keep that.
- The conversation is kept for the browser tab only (`sessionStorage`) and is gone when the tab closes.

### Connect a real AI model (optional)

For open-ended questions you can put a hosted AI model, or a small model you run yourself, behind the assistant. Run the small server in `server/` with your own API key (never put a key in a website file), then put its address in `endpoint`. The assistant still answers everything it understands by itself and sends on only what it cannot answer. If the server is down, shoppers get the built-in answer. The steps and safety notes are in `server/README.md`. When an endpoint is set, shoppers' questions go to that server and to the AI provider, so mention it in your privacy policy.

## Adding a page

Every page loads the same scripts in the same order, then its own script:

```html
<script src="js/config.js"></script>
<script src="js/util.js"></script>
<script src="js/icons.js"></script>
<script src="js/data.js"></script>
<script src="js/store.js"></script>
<script src="js/ui.js"></script>
<script src="js/your-page.js"></script>
<script src="js/compat.js"></script>
<script src="js/assistant-kb.js"></script>
<script src="js/assistant-brain.js"></script>
<script src="js/assistant.js"></script>
```

The last four scripts add the chat assistant (its stylesheet, `css/assistant.css`, goes next to `styles.css`). Leave them out of a page that should not have it.

The scripts are classic scripts (not ES modules) so the site opens straight from disk. Everything hangs off one global, `window.PCS`. The header and footer are drawn by `js/ui.js`, so a new page only needs `<div id="site-header"></div>`, a `<main id="main">` and `<div id="site-footer"></div>`.

## Before you take real orders

The checkout is a demo. Nothing is charged and nothing leaves the browser until the buyer presses the WhatsApp button. To sell for real you need:

- A server that receives and stores orders (for example Node, PHP or a hosted back end), so orders are not lost when a buyer clears their browser.
- A payment gateway (Razorpay, Cashfree, Stripe or similar) with its own server-side verification. Never put secret keys in these files.
- Stock levels kept in a database instead of the `stock` flag in `js/data.js`.
- Real GST invoicing, and real privacy and refund policies.

If you want to manage products without editing code, a platform such as WooCommerce or Shopify is usually a better base. This template works well as a design and layout starting point, a learning project, or a catalogue-plus-WhatsApp-orders site.

## Put it online

Upload the whole folder to any static host: GitHub Pages, Netlify, Cloudflare Pages, or ordinary web hosting.

## Fonts

Big Shoulders and Work Sans are bundled in `fonts/` under the SIL Open Font License. The licence texts sit next to the font files.
