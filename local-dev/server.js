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
const os        = require('os');
const chokidar  = require('chokidar');
const { WebSocketServer } = require('ws');

/* ---- Local network IP (for phone preview) ---- */
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'unknown';
}
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
  if (val == null) return '0€';
  const amount = val / 100;
  // Show as integer if round (e.g. 55€), otherwise 2 decimals (e.g. 55.50€)
  return `${Number.isInteger(amount) ? amount : amount.toFixed(2)}€`;
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
    description: '<p>100% organic cotton</p><p>White embroidery on crown</p><p>Made in Portugal</p><p>Realized in Berlin</p>',
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
      price: 6500,
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
        // WebSocket live reload — use current hostname so it works on phone too
        const ws = new WebSocket('ws://' + window.location.hostname + ':${WS_PORT}');
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

  if (route.startsWith('/pages/')) {
    const slug = route.split('/pages/')[1];
    // Page titles keyed by slug
    const pageTitles = {
      'manifesto':    'Manifesto',
      'journal-club': 'Journal Club',
      'faq':          'FAQ',
    };
    const title = pageTitles[slug] || slug;
    return {
      ...base,
      page: { title, content: '', handle: slug, url: route },
      page_title: `${title} — Hyper Real Love`,
      page_description: 'Hyper Real Love — a community brand.',
      template: { name: 'page', suffix: slug },
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

/* ---- Resolve section file from a page.SLUG.json template ---- */
function sectionFileForPage(slug) {
  const tplPath = path.join(ROOT, 'templates', `page.${slug}.json`);
  if (!fs.existsSync(tplPath)) return null;
  try {
    const tpl = JSON.parse(fs.readFileSync(tplPath, 'utf8'));
    // Pick the first section listed in "order"
    const firstKey = (tpl.order || Object.keys(tpl.sections || {}))[0];
    const sectionType = tpl.sections?.[firstKey]?.type;
    if (!sectionType) return null;
    return path.join(ROOT, 'sections', `${sectionType}.liquid`);
  } catch {
    return null;
  }
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
  } else if (route.startsWith('/pages/')) {
    const slug = route.split('/pages/')[1];
    sectionFile = sectionFileForPage(slug);
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

// convenience redirects
app.get('/manifesto',    (req, res) => res.redirect(301, '/pages/manifesto'));
app.get('/journal-club', (req, res) => res.redirect(301, '/pages/journal-club'));
app.get('/faq',          (req, res) => res.redirect(301, '/pages/faq'));

app.get('/pages/:slug', async (req, res) => {
  try {
    const html = await renderPage(`/pages/${req.params.slug}`);
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send(`<pre>${e.message}\n${e.stack}</pre>`);
  }
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
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n🟡 HRL dev server running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${ip}:${PORT}  ← open this on your phone\n`);
});
