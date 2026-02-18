# HRL Shopify Theme

Custom Shopify theme for **Hyper Real Love** — the SEEKER cap pre-order shop.

---

## Local Development (no Shopify account needed)

### 1. Install dependencies

```bash
npm install
```

### 2. Start local dev server

```bash
npm run dev
```

Open **http://localhost:3000** — hot-reload is enabled.

Routes available locally:
| URL | Page |
|-----|------|
| `/` | Homepage (product grid) |
| `/products/seeker-black` | Product detail page |
| `/pages/*` | Generic page stub |
| `/journal-club` | Redirects → `/pages/journal-club` |

---

## Connecting to Shopify (when ready)

### Prerequisites
1. Sign up for a **Shopify Partners account** (free): https://partners.shopify.com
2. Create a **development store** (free, no subscription needed)
3. Install **Shopify CLI**: `npm install -g @shopify/cli @shopify/theme`

### Authenticate
```bash
shopify auth login --store=your-store.myshopify.com
```

### Preview on your Shopify dev store
```bash
npm run shopify:dev
# → shopify theme dev --store=your-store.myshopify.com
```

### Push theme to Shopify
```bash
npm run shopify:push
```

---

## GitHub → Shopify Auto-deploy

On every push to `main`, the theme is automatically deployed to Shopify via GitHub Actions.

**Required GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `SHOPIFY_STORE_URL` | `your-store.myshopify.com` |
| `SHOPIFY_THEME_ID` | Theme ID from Shopify Admin → Online Store → Themes |
| `SHOPIFY_CLI_THEME_TOKEN` | Run `shopify auth token` to generate |

---

## Project Structure

```
hrl-shopify-theme/
├── assets/              CSS, JS, fonts, images
│   ├── theme.css        Design system + all styles
│   └── theme.js         Drawers, gallery, cart logic
├── config/              Theme settings schema + data
├── layout/
│   └── theme.liquid     Main HTML layout (wraps all pages)
├── locales/             Translation strings
├── sections/            Page-specific sections
│   ├── main-collection.liquid   Homepage product grid
│   └── product-template.liquid  Product detail page
├── snippets/            Reusable components
│   ├── header.liquid
│   ├── footer.liquid
│   ├── cart-drawer.liquid
│   ├── mobile-nav-drawer.liquid
│   └── mobile-cart-drawer.liquid
├── templates/           Page route → section mapping
├── local-dev/
│   └── server.js        Local preview server (liquidjs + express)
└── .github/workflows/   Auto-deploy to Shopify on push to main
```

---

## Design System

| Token | Value |
|-------|-------|
| `--color-yellow` | `#fffb29` |
| `--color-beige` | `#faf9f6` |
| `--color-black` | `#101010` |
| `--color-red` | `#ff0004` |
| Title font | Istok Web, Bold, UPPERCASE, -2.2% letter-spacing |
| Body/nav font | IM Fell DW Pica, Regular / Italic |

---

## Sitemap

| Page | Route |
|------|-------|
| Shop (Home) | `/` |
| Product | `/products/seeker-black` |
| Journal Club | `/pages/journal-club` |
| Manifesto | `/pages/manifesto` |
| FAQ | `/pages/faq` |
| Impressum | `/pages/impressum` |
| Datenschutz | `/pages/datenschutz` |
| Widerrufsbelehrung | `/pages/widerrufsbelehrung` |
| Shipping Policy | `/policies/shipping-policy` |
| Terms of Service | `/policies/terms-of-service` |
