/**
 * HRL Local Development Server
 * Serves a live HTML preview of the theme WITHOUT needing Shopify.
 * Uses mock data to simulate Shopify's Liquid context.
 *
 * Run: npm run dev
 * Open: http://localhost:3000
 */

const express   = require('express');
const { Liquid } = require('liquidjs');
const path      = require('path');
const fs        = require('fs');
const chokidar  = require('chokidar');
const { WebSocketServer } = require('ws');
const http      = require('http');

const ROOT   = path.join(__dirname, '..');
const PORT   = 3000;
const WS_PORT = 3001;

const app    = express();
const server = http.createServer(app);

/* ---- LiquidJS setup ---- */
const engine = new Liquid({
  root: [
    path.join(ROOT, 'sections'),
    path.join(ROOT, 'snippets'),
    path.join(ROOT, 'layout'),
    path.join(ROOT, 'templates'),
    path.join(__dirname, 'views'),
  ],
  extname: '.liquid',
  strictFilters: false,
  strictVariables: false,
});

/* ---- Shopify Liquid filter shims ---- */
engine.registerFilter('asset_url', (val) => `/assets/${val}`);
engine.registerFilter('image_url', (img, ...args) => {
  if (typeof img === 'string') return img;
  if (img && img.src) return img.src;
  return img;
});
engine.registerFilter('money', (val) => {
  if (val == null) return '€0.00';
  return `€${(val / 100).toFixed(2)}`;
});
engine.registerFilter('escape', (val) => String(val || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'));
engine.registerFilter('stylesheet_tag', (url) => `<link rel="stylesheet" href="${url}">`);
engine.registerFilter('script_tag', (url) => `<script src="${url}"></script>`);
engine.registerFilter('default', (val, def) => val == null || val === '' ? def : val);

/* ---- Serve static assets ---- */
app.use('/assets', express.static(path.join(ROOT, 'assets')));

/* ---- Mock Shopify data ---- */
function getMockData(route = '/') {
  const shop = {
    name: 'Hyper Real Love',
    email: 'hello@hyperreallove.com',
    currency: { iso_code: 'EUR', symbol: '€' },
    domain: 'localhost:3000',
  };

  const seekerProduct = {
    id: 1,
    title: 'SEEKER',
    handle: 'seeker-black',
    url: '/products/seeker-black',
    description: '<p>The SEEKER cap. Modern Monk edition. One size fits all. Hand-finished. Pick up at the HRL Release Event, May 2025.</p>',
    has_only_default_variant: false,
    options_with_values: [
      {
        name: 'Style',
        selected_value: 'Modern Monk',
        values: ['Modern Monk']
      }
    ],
    images: [
      { src: '/assets/cap-front.webp',  alt: 'Seeker Cap — Front',  width: 800, height: 1000 },
      { src: '/assets/cap-side.webp',   alt: 'Seeker Cap — Side',   width: 800, height: 1000 },
      { src: '/assets/cap-back.webp',   alt: 'Seeker Cap — Back',   width: 800, height: 1000 },
      { src: '/assets/cap-detail.webp', alt: 'Seeker Cap — Detail', width: 800, height: 1000 },
    ],
    featured_image: { src: '/assets/cap-front.webp', alt: 'Seeker Cap — Front' },
    selected_or_first_available_variant: {
      id: 101,
      title: 'Modern Monk',
      price: 10500,
      available: true,
    },
  };

  /* Row 1 locked slots */
  const lockedNames = ['OBSERVER', 'PREACHER', 'LOVER'];
  const lockedProduct = (i) => ({
    id: i + 10,
    title: lockedNames[i - 1] || '???',
    handle: `locked-${i}`,
    url: '#',
    featured_image: { src: '/assets/cap-hidden.webp', alt: '' },
    selected_or_first_available_variant: { available: false, price: 0 },
  });

  /* Row 2 deep-locked slots — use same hidden cap image */
  const deepProduct = (i) => ({
    id: i + 20,
    title: '???',
    handle: `deep-${i}`,
    url: '#',
    featured_image: { src: '/assets/cap-hidden.webp', alt: '' },
    selected_or_first_available_variant: { available: false, price: 0 },
  });

  const allProducts = [
    seekerProduct,
    lockedProduct(1), lockedProduct(2), lockedProduct(3),
    deepProduct(1), deepProduct(2), deepProduct(3), deepProduct(4),
  ];

  const cart = { item_count: 0, items: [], total_price: 0, currency: { iso_code: 'EUR' } };

  const settings = {
    show_announcement: true,
    announcement_text: 'OUT OF STOCK ITEMS MAY BE REFUNDED',
    main_site_url: 'http://localhost:3000', /* → hyperreallove.com on Shopify */
    logo: null,
    favicon: null,
  };

  const base = {
    shop,
    cart,
    settings,
    request: { locale: { iso_code: 'en' } },
    collections: { all: { products: allProducts } },
    'content_for_header': `<!-- dev header -->
      <script>
        // WebSocket live reload
        const ws = new WebSocket('ws://localhost:${WS_PORT}');
        ws.onmessage = () => location.reload();
      </script>`,
    'now': new Date().toISOString(),
  };

  if (route.startsWith('/products/')) {
    const handle = route.split('/products/')[1];
    const product = handle === 'seeker-black' ? seekerProduct : null;
    return {
      ...base,
      product,
      page_title: product ? product.title : 'Product',
      page_description: product ? product.description.replace(/<[^>]+>/g, '') : '',
      template: { name: 'product', suffix: '' },
      canonical_url: `http://localhost:${PORT}${route}`,
    };
  }

  return {
    ...base,
    page_title: route === '/' ? shop.name : 'Page',
    page_description: 'Hyper Real Love — a community brand.',
    template: { name: 'index', suffix: '' },
    canonical_url: `http://localhost:${PORT}${route}`,
  };
}

/* ---- Strip / shim Shopify-only tags that LiquidJS doesn't understand ---- */
function stripShopifyTags(src) {
  return src
    // Remove {% schema %}...{% endschema %} blocks
    .replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, '')
    // Remove {% stylesheet %}...{% endstylesheet %} blocks
    .replace(/\{%-?\s*stylesheet\s*-?%\}[\s\S]*?\{%-?\s*endstylesheet\s*-?%\}/g, '')
    // Remove {% javascript %}...{% endjavascript %} blocks
    .replace(/\{%-?\s*javascript\s*-?%\}[\s\S]*?\{%-?\s*endjavascript\s*-?%\}/g, '')
    // Replace {% form '...' %} with a plain <form> (Shopify-specific tag)
    .replace(/\{%-?\s*form\s+[^%]*-?%\}/g, '<form>')
    // Replace {% endform %} with </form>
    .replace(/\{%-?\s*endform\s*-?%\}/g, '</form>');
}

/* ---- Render Liquid layout with section content ---- */
async function renderPage(route) {
  const data = getMockData(route);

  // Determine which section to render as content_for_layout
  let sectionFile;
  if (route === '/') {
    sectionFile = path.join(ROOT, 'sections', 'main-collection.liquid');
  } else if (route.startsWith('/products/')) {
    sectionFile = path.join(ROOT, 'sections', 'product-template.liquid');
  } else {
    sectionFile = null;
  }

  let sectionHtml = '';
  if (sectionFile && fs.existsSync(sectionFile)) {
    // Read, strip Shopify tags, then parse+render
    const sectionSrc = stripShopifyTags(fs.readFileSync(sectionFile, 'utf8'));
    sectionHtml = await engine.parseAndRender(sectionSrc, data);
  }

  data['content_for_layout'] = sectionHtml;

  const layoutFile = path.join(ROOT, 'layout', 'theme.liquid');
  const layoutSrc  = stripShopifyTags(fs.readFileSync(layoutFile, 'utf8'))
    // Replace render tags with actual file contents for snippets
    .replace(/\{%-?\s*render\s+'([^']+)'\s*-?%\}/g, (_, name) => {
      const snippetPath = path.join(ROOT, 'snippets', `${name}.liquid`);
      return fs.existsSync(snippetPath)
        ? stripShopifyTags(fs.readFileSync(snippetPath, 'utf8'))
        : `<!-- snippet ${name} not found -->`;
    });

  return engine.parseAndRender(layoutSrc, data);
}

/* ---- Routes ---- */

/* Mock Shopify AJAX cart endpoint — keeps cart JS happy in local dev */
app.get('/cart.js', (req, res) => {
  res.json({ item_count: 0, items: [], total_price: 0 });
});

app.get('/', async (req, res) => {
  try {
    const html = await renderPage('/');
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send(`<pre>${e.message}\n${e.stack}</pre>`);
  }
});

app.get('/products/:handle', async (req, res) => {
  try {
    const html = await renderPage(`/products/${req.params.handle}`);
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send(`<pre>${e.message}\n${e.stack}</pre>`);
  }
});

// /journal-club → /pages/journal-club
app.get('/journal-club', (req, res) => res.redirect(301, '/pages/journal-club'));

app.get('/pages/:slug', async (req, res) => {
  res.send(`<html><body style="font-family: serif; padding: 40px;">
    <h1>${req.params.slug}</h1>
    <p>Page content goes here — add real content when connecting to Shopify.</p>
    <p><a href="/">← Back to shop</a></p>
  </body></html>`);
});

app.get('*', (req, res) => res.redirect('/'));

/* ---- WebSocket live reload ---- */
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set();
wss.on('connection', ws => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast() {
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send('reload');
  });
}

/* ---- File watcher ---- */
chokidar.watch([
  path.join(ROOT, 'assets'),
  path.join(ROOT, 'layout'),
  path.join(ROOT, 'sections'),
  path.join(ROOT, 'snippets'),
], { ignoreInitial: true }).on('all', (event, filePath) => {
  console.log(`[HRL] ${event}: ${path.relative(ROOT, filePath)}`);
  broadcast();
});

/* ---- Start ---- */
server.listen(PORT, () => {
  console.log(`\n🟡 HRL dev server running at http://localhost:${PORT}`);
  console.log(`   Live reload on ws://localhost:${WS_PORT}\n`);
});
