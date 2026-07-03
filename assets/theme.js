/* ============================================================
   HRL THEME JAVASCRIPT
   Hyper Real Love — Custom Shopify Theme
   ============================================================ */

'use strict';

/* ------------------------------------------------------------
   Utility: Toggle aria + class on drawer pairs
   ------------------------------------------------------------ */
function openDrawer(drawerEl, overlayEl) {
  drawerEl.classList.add('is-open');
  if (overlayEl) overlayEl.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  drawerEl.setAttribute('aria-hidden', 'false');
}

function closeDrawer(drawerEl, overlayEl) {
  drawerEl.classList.remove('is-open');
  if (overlayEl) overlayEl.classList.remove('is-open');
  document.body.style.overflow = '';
  drawerEl.setAttribute('aria-hidden', 'true');
}

/* ------------------------------------------------------------
   Cart Drawer
   ------------------------------------------------------------ */
(function initCartDrawer() {
  const toggleBtns = document.querySelectorAll('[data-cart-toggle]');
  const drawer     = document.getElementById('cart-drawer');
  const overlay    = document.getElementById('cart-drawer-overlay');
  const closeBtn   = document.getElementById('cart-drawer-close');

  if (!drawer) return;

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('is-open');
      if (isOpen) {
        closeDrawer(drawer, overlay);
      } else {
        openDrawer(drawer, overlay);
        document.dispatchEvent(new Event('cart:refresh'));
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeDrawer(drawer, overlay));
  }

  if (overlay) {
    overlay.addEventListener('click', () => closeDrawer(drawer, overlay));
  }

  // ESC key closes any open drawer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeDrawer(drawer, overlay);
      const mobileCart = document.getElementById('mobile-cart-drawer');
      if (mobileCart) closeDrawer(mobileCart, null);
      const mobileNav = document.getElementById('mobile-nav-drawer');
      const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
      if (mobileNav) closeDrawer(mobileNav, mobileNavOverlay);
    }
  });
})();

/* ------------------------------------------------------------
   Mobile Cart Drawer (full screen)
   ------------------------------------------------------------ */
(function initMobileCartDrawer() {
  const mobileCartToggle = document.getElementById('mobile-cart-toggle');
  const mobileCartDrawer = document.getElementById('mobile-cart-drawer');
  const mobileCartClose  = document.getElementById('mobile-cart-close');

  if (!mobileCartDrawer) return;

  if (mobileCartToggle) {
    mobileCartToggle.addEventListener('click', () => {
      openDrawer(mobileCartDrawer, null);
    });
  }

  if (mobileCartClose) {
    mobileCartClose.addEventListener('click', () => {
      closeDrawer(mobileCartDrawer, null);
    });
  }
})();

/* ------------------------------------------------------------
   Mobile Nav Drawer (blurb opens from left)
   ------------------------------------------------------------ */
(function initMobileNav() {
  const blurbToggle = document.getElementById('mobile-nav-toggle');
  const drawer      = document.getElementById('mobile-nav-drawer');
  const overlay     = document.getElementById('mobile-nav-overlay');
  const clickaway   = document.getElementById('mobile-nav-clickaway');

  if (!drawer) return;

  if (blurbToggle) {
    blurbToggle.addEventListener('click', () => {
      if (window.innerWidth > 768) {
        window.location.href = '/pages/manifesto';
        return;
      }
      const isOpen = drawer.classList.contains('is-open');
      if (isOpen) {
        closeDrawer(drawer, overlay);
      } else {
        openDrawer(drawer, overlay);
      }
    });
  }

  // Click outside the drawer (the right 20% / bottom 10%) closes it
  if (clickaway) {
    clickaway.addEventListener('click', (e) => {
      if (!drawer.contains(e.target)) {
        closeDrawer(drawer, overlay);
      }
    });
  }
})();

/* ------------------------------------------------------------
   Product Image Gallery — Desktop thumbnail switcher
   ------------------------------------------------------------ */
(function initProductGallery() {
  const gallery    = document.getElementById('product-page');
  if (!gallery) return;

  const slides     = gallery.querySelectorAll('[data-main-image]'); /* now slide divs */
  const thumbs     = gallery.querySelectorAll('[data-thumb]');

  if (!slides.length || !thumbs.length) return;

  function switchImage(index) {
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    thumbs.forEach((thumb, i) => thumb.classList.toggle('is-active', i === index));
  }

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => switchImage(i));
  });

  // Initialize first image
  switchImage(0);
})();

/* ------------------------------------------------------------
   Product Image Gallery — Mobile drag carousel + arrows
   ------------------------------------------------------------ */
(function initMobileSwipe() {
  const gallery   = document.getElementById('product-page');
  if (!gallery) return;

  const container = gallery.querySelector('[data-images-container]');
  const images    = gallery.querySelectorAll('[data-main-image]');
  if (!container || images.length <= 1) return;

  const prevBtn = gallery.querySelector('[data-nav-prev]');
  const nextBtn = gallery.querySelector('[data-nav-next]');

  const isMobile = () => window.innerWidth <= 768;

  let currentIndex = 0;

  /* Slide to a given index with optional animation */
  function goTo(index, animate = true) {
    currentIndex = Math.max(0, Math.min(index, images.length - 1));

    container.style.transition = animate
      ? 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none';
    container.style.transform = `translateX(${-currentIndex * 100}%)`;

    /* Keep thumbnail strip in sync */
    gallery.querySelectorAll('[data-thumb]').forEach((t, i) =>
      t.classList.toggle('is-active', i === currentIndex)
    );

    /* Dim arrow at first / last image */
    if (prevBtn) prevBtn.style.opacity = currentIndex === 0              ? '0.25' : '1';
    if (nextBtn) nextBtn.style.opacity = currentIndex === images.length - 1 ? '0.25' : '1';
  }

  /* Arrow button clicks */
  if (prevBtn) prevBtn.addEventListener('click', () => { if (isMobile()) goTo(currentIndex - 1); });
  if (nextBtn) nextBtn.addEventListener('click', () => { if (isMobile()) goTo(currentIndex + 1); });

  /* ── Drag / swipe ── */
  let startX      = 0;
  let startY      = 0;
  let dragDelta   = 0;
  let isHoriz     = null; /* null = undecided, true = horizontal, false = vertical */

  container.addEventListener('touchstart', e => {
    if (!isMobile()) return;
    startX    = e.touches[0].clientX;
    startY    = e.touches[0].clientY;
    dragDelta = 0;
    isHoriz   = null;
    container.classList.add('is-dragging');
    container.style.transition = 'none';
  }, { passive: true });

  container.addEventListener('touchmove', e => {
    if (!isMobile()) return;

    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    /* Decide direction once we have a clear movement */
    if (isHoriz === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isHoriz = Math.abs(dx) > Math.abs(dy);
    }
    if (!isHoriz) return; /* vertical scroll — let it pass */

    /* Horizontal swipe confirmed — stop page from scrolling */
    e.preventDefault();

    dragDelta = dx;

    /* Rubber-band resistance at the first and last image */
    const atEdge = (currentIndex === 0 && dx > 0) || (currentIndex === images.length - 1 && dx < 0);
    const drag   = atEdge ? dx / 3 : dx;

    container.style.transform = `translateX(calc(${-currentIndex * 100}% + ${drag}px))`;
  }, { passive: false }); /* passive: false required to allow preventDefault */

  container.addEventListener('touchend', () => {
    if (!isMobile()) return;
    container.classList.remove('is-dragging');

    if (!isHoriz) return;

    if      (dragDelta < -50) goTo(currentIndex + 1);
    else if (dragDelta >  50) goTo(currentIndex - 1);
    else                      goTo(currentIndex);     /* snap back */
  });

  /* Reset on resize (desktop ↔ mobile) */
  window.addEventListener('resize', () => {
    if (isMobile()) {
      goTo(currentIndex, false);
    } else {
      container.style.transform  = '';
      container.style.transition = '';
    }
  });

  /* Init */
  if (isMobile()) goTo(0, false);
})();

/* ------------------------------------------------------------
   Cart Count — update from Shopify AJAX API
   ------------------------------------------------------------ */
(function initCartCount() {
  function updateCartCount() {
    // Shopify AJAX cart endpoint
    fetch('/cart.js')
      .then(r => r.json())
      .then(cart => {
        const count = cart.item_count || 0;
        const countEls = document.querySelectorAll('[data-cart-count]');
        countEls.forEach(el => {
          el.textContent = `(${count})`;
        });
        // Hide cart button when empty, show when items present
        const cartBtns = document.querySelectorAll('[data-cart-toggle], #mobile-cart-toggle');
        cartBtns.forEach(btn => {
          btn.style.display = count > 0 ? '' : 'none';
        });
      })
      .catch(() => {/* silently fail in local dev — HTML default "(0)" shows */});
  }

  // Update on page load
  updateCartCount();

  // Listen for custom cart update events
  document.addEventListener('cart:updated', updateCartCount);
})();

/* ------------------------------------------------------------
   Add to Cart / Pre-Order form
   ------------------------------------------------------------ */
(function initProductForm() {
  const form = document.getElementById('product-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    const variantId = form.querySelector('[name="id"]')?.value;

    if (!variantId) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });

      if (!res.ok) throw new Error('Add to cart failed');

      // Open cart drawer first (shows loader), then refresh content
      const cartDrawer = document.getElementById('cart-drawer');
      const cartOverlay = document.getElementById('cart-drawer-overlay');
      if (cartDrawer) openDrawer(cartDrawer, cartOverlay);
      document.dispatchEvent(new Event('cart:updated'));

      submitBtn.textContent = 'Add to Cart';
    } catch (err) {
      console.error(err);
      submitBtn.textContent = 'Add to Cart';
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

/* ------------------------------------------------------------
   Mockup Cart — quantity steppers + remove + subtotal update
   (Offline dev only — fires on [data-mockup-item] elements)
   ------------------------------------------------------------ */
(function initMockupCart() {
  const PRICES = { 'Seeker Tee': 95, 'Canvas Hoodie': 145 };

  /* Recount total items across all mockup bodies and update the title spans */
  function updateCartTitleCount() {
    // Sum quantities across both desktop + mobile drawers, but count only once
    // (they share the same data so just read from the first body found)
    const firstBody = document.querySelector('.cart-drawer__body');
    if (!firstBody) return;
    const items = firstBody.querySelectorAll('[data-mockup-item]');
    let count = 0;
    items.forEach(item => {
      count += parseInt(item.querySelector('.cart-item__qty-val').textContent, 10);
    });
    document.querySelectorAll('[data-cart-title-count]').forEach(el => {
      el.textContent = `(${count})`;
    });
    // Also keep the nav "(x)" in sync
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = `(${count})`;
    });
  }

  /* Recalculate subtotal and update price labels within one drawer body */
  function recalcSubtotal(body) {
    const items = body.querySelectorAll('[data-mockup-item]');
    let total = 0;
    items.forEach(item => {
      const qty   = parseInt(item.querySelector('.cart-item__qty-val').textContent, 10);
      const price = parseFloat(item.querySelector('[data-item-price]').dataset.itemPrice);
      total += qty * price;
      item.querySelector('.cart-item__price').textContent = `€${qty * price}`;
    });
    // Update both desktop + mobile subtotal displays globally
    document.querySelectorAll('#cart-subtotal, #mobile-cart-subtotal').forEach(el => {
      el.textContent = `€${total}`;
    });
    updateCartTitleCount();
  }

  /* Remove an item with a fade, then show empty state if nothing remains */
  function removeItem(item, body) {
    item.style.transition = 'opacity 0.2s, max-height 0.25s 0.15s';
    item.style.opacity = '0';
    item.style.overflow = 'hidden';
    setTimeout(() => {
      item.style.maxHeight = item.offsetHeight + 'px';
      requestAnimationFrame(() => { item.style.maxHeight = '0'; });
    }, 10);
    setTimeout(() => {
      item.remove();
      recalcSubtotal(body);
      if (!body.querySelector('[data-mockup-item]')) {
        const empty = document.createElement('p');
        empty.className = 'cart-drawer__empty';
        empty.textContent = 'Your cart is empty.';
        body.appendChild(empty);
        // Zero out subtotals
        document.querySelectorAll('#cart-subtotal, #mobile-cart-subtotal').forEach(el => {
          el.textContent = '€0';
        });
        document.querySelectorAll('[data-cart-title-count]').forEach(el => {
          el.textContent = '(0)';
        });
        document.querySelectorAll('[data-cart-count]').forEach(el => {
          el.textContent = '(0)';
        });
      }
    }, 380);
  }

  function bindMockupCart(body) {
    body.querySelectorAll('.cart-item__qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item  = btn.closest('[data-mockup-item]');
        if (!item) return;
        const valEl = item.querySelector('.cart-item__qty-val');
        let qty     = parseInt(valEl.textContent, 10);

        if (btn.dataset.action === 'increase') {
          qty = Math.min(qty + 1, 99);
          valEl.textContent = qty;
          recalcSubtotal(body);
        } else {
          qty = Math.max(qty - 1, 0);
          if (qty === 0) {
            removeItem(item, body);
          } else {
            valEl.textContent = qty;
            recalcSubtotal(body);
          }
        }
      });
    });
  }

  // Bind to all cart bodies (desktop + mobile)
  document.querySelectorAll('.cart-drawer__body').forEach(body => bindMockupCart(body));

  // Mobile continue shopping
  const mobileContBtn = document.getElementById('mobile-cart-continue');
  if (mobileContBtn) {
    const mobileCart = document.getElementById('mobile-cart-drawer');
    mobileContBtn.addEventListener('click', () => {
      if (mobileCart) closeDrawer(mobileCart, null);
    });
  }
})();

/* ------------------------------------------------------------
   Live Cart — quantity steppers + remove for real Shopify items
   Calls /cart/change.js AJAX API to update quantities
   ------------------------------------------------------------ */
(function initLiveCart() {

  function updateCheckoutBtn(hasItems) {
    document.querySelectorAll('.btn-checkout').forEach(btn => {
      btn.classList.toggle('btn-checkout--disabled', !hasItems);
      btn.style.pointerEvents = hasItems ? '' : 'none';
      btn.style.opacity = hasItems ? '' : '0.35';
    });
  }

  function setCartLoading(loading) {
    const loader = document.getElementById('cart-drawer-loader');
    const bodies = document.querySelectorAll('.cart-drawer__body');
    if (loader) loader.style.display = loading ? 'flex' : 'none';
    bodies.forEach(b => { b.style.display = loading ? 'none' : ''; });
  }

  function refreshCartDrawer() {
    setCartLoading(true);
    fetch('/cart.js')
      .then(r => r.json())
      .then(cart => {
        setCartLoading(false);
        // Update count badges
        document.querySelectorAll('[data-cart-count], [data-cart-title-count]').forEach(el => {
          el.textContent = `(${cart.item_count})`;
        });
        // Update subtotal
        document.querySelectorAll('#cart-subtotal, #mobile-cart-subtotal').forEach(el => {
          el.textContent = formatMoney(cart.total_price);
        });
        // Re-render items in both drawers
        const bodies = document.querySelectorAll('.cart-drawer__body');
        bodies.forEach(body => {
          if (cart.items.length === 0) {
            body.innerHTML = '<p class="cart-drawer__empty">Your cart is empty.</p>';
            return;
          }
          body.innerHTML = cart.items.map(item => `
            <div class="cart-item" data-line-item="${item.key}" data-unit-price="${item.price}">
              <div class="cart-item__image-wrap">
                <img class="cart-item__image" src="${item.image}" alt="${item.title}" loading="lazy">
              </div>
              <div class="cart-item__details">
                <div class="cart-item__name-row">
                  <span class="cart-item__name">${item.product_title}</span>
                  <span class="cart-item__price">${(item.final_line_price / 100).toFixed(2).replace('.', ',')} €</span>
                </div>
                ${item.variant_title && item.variant_title !== 'Default Title' ? `<span class="cart-item__variant">${item.variant_title}</span>` : ''}
                <div class="cart-item__qty-wrap">
                  <button class="cart-item__qty-btn" data-action="decrease" data-line-key="${item.key}" aria-label="Decrease quantity">&#x2212;</button>
                  <span class="cart-item__qty-val">${item.quantity}</span>
                  <button class="cart-item__qty-btn" data-action="increase" data-line-key="${item.key}" aria-label="Increase quantity">+</button>
                </div>
              </div>
            </div>
          `).join('');
          bindLiveCartBody(body);
        });
      })
      .then(() => updateCheckoutBtn(document.querySelectorAll('[data-line-item]').length > 0))
      .catch(err => { setCartLoading(false); console.error('Cart refresh failed', err); });
  }

  function formatMoney(cents) {
    return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  // Tracks intended quantities and debounce timers per line key
  const pendingQtys   = {};
  const pendingTimers = {};

  function recalcSubtotalFromDOM() {
    // Collect unique line keys to avoid double-counting desktop + mobile drawers
    const seen = new Map();
    document.querySelectorAll('[data-line-item]').forEach(item => {
      const key = item.dataset.lineItem;
      if (!seen.has(key)) {
        const qty = parseInt(item.querySelector('.cart-item__qty-val')?.textContent || 0, 10);
        const up  = parseInt(item.dataset.unitPrice || 0, 10);
        seen.set(key, qty * up);
      }
    });
    let total = 0;
    seen.forEach(v => { total += v; });
    document.querySelectorAll('#cart-subtotal, #mobile-cart-subtotal').forEach(el => {
      el.textContent = formatMoney(total);
    });
  }

  function changeQuantity(lineKey, delta) {
    // Find DOM elements
    const itemEl  = document.querySelector(`[data-line-item="${lineKey}"]`);
    const valEl   = itemEl && itemEl.querySelector('.cart-item__qty-val');
    const priceEl = itemEl && itemEl.querySelector('.cart-item__price');
    const unitPrice = itemEl ? parseInt(itemEl.dataset.unitPrice || 0, 10) : 0;

    // Use pending qty if we already have one (rapid clicks), else read DOM
    const base   = pendingQtys[lineKey] !== undefined
      ? pendingQtys[lineKey]
      : (valEl ? parseInt(valEl.textContent, 10) : 1);
    const newQty = Math.max(0, base + delta);
    pendingQtys[lineKey] = newQty;

    // --- Update DOM immediately ---
    if (valEl)   valEl.textContent   = newQty;
    if (priceEl && unitPrice) priceEl.textContent = formatMoney(unitPrice * newQty);
    recalcSubtotalFromDOM();

    if (newQty === 0 && itemEl) {
      itemEl.style.transition = 'opacity 0.15s';
      itemEl.style.opacity    = '0';
      setTimeout(() => itemEl.remove(), 150);
    }

    // Update cart title count immediately
    const seen = new Map();
    document.querySelectorAll('[data-line-item]').forEach(item => {
      const key = item.dataset.lineItem;
      if (!seen.has(key)) {
        const qty = key === lineKey ? newQty : parseInt(item.querySelector('.cart-item__qty-val')?.textContent || 0, 10);
        seen.set(key, qty);
      }
    });
    let totalItems = 0;
    seen.forEach(q => { totalItems += q; });
    document.querySelectorAll('[data-cart-title-count]').forEach(el => { el.textContent = `(${totalItems})`; });

    const remaining = document.querySelectorAll('[data-line-item]').length - (newQty === 0 ? 1 : 0);
    updateCheckoutBtn(remaining > 0);

    // --- Debounce: send only the final quantity after 400ms of no clicks ---
    clearTimeout(pendingTimers[lineKey]);
    pendingTimers[lineKey] = setTimeout(() => {
      const finalQty = pendingQtys[lineKey];
      delete pendingQtys[lineKey];
      delete pendingTimers[lineKey];

      fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lineKey, quantity: finalQty })
      })
      .then(r => r.json())
      .then(cart => {
        document.querySelectorAll('[data-cart-count], [data-cart-title-count]').forEach(el => {
          el.textContent = `(${cart.item_count})`;
        });
        document.querySelectorAll('[data-cart-toggle], #mobile-cart-toggle').forEach(btn => {
          btn.style.display = cart.item_count > 0 ? '' : 'none';
        });
        updateCheckoutBtn(cart.item_count > 0);
      })
      .catch(err => {
        console.error('Cart sync failed', err);
        refreshCartDrawer(); // revert on error
      });
    }, 400);
  }

  function removeItem(lineKey) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lineKey, quantity: 0 })
    })
    .then(() => {
      refreshCartDrawer();
      document.dispatchEvent(new Event('cart:updated'));
    })
    .catch(err => console.error('Cart remove failed', err));
  }

  function bindLiveCartBody(body) {
    body.querySelectorAll('.cart-item__qty-btn[data-line-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key   = btn.dataset.lineKey;
        const delta = btn.dataset.action === 'increase' ? 1 : -1;
        changeQuantity(key, delta);
      });
    });
  }

  // Bind on page load for any real items already in the DOM
  document.querySelectorAll('.cart-drawer__body, #mobile-cart-drawer').forEach(body => {
    if (body.querySelector('[data-line-item]')) bindLiveCartBody(body);
  });

  // Re-render after add to cart or manual refresh
  document.addEventListener('cart:updated', () => setTimeout(refreshCartDrawer, 300));
  document.addEventListener('cart:refresh', refreshCartDrawer);

})();

/* ------------------------------------------------------------
   Announcement bar scroll behaviour
   Announcement scrolls away with page; header sticks
   (Pure CSS handles this — sticky header + relative announcement)
   Nothing JS needed here, but left as hook for future logic
   ------------------------------------------------------------ */
