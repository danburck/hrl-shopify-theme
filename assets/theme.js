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
          el.textContent = `(${count})`; /* always show count, e.g. "(0)" */
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

      // Update cart count
      document.dispatchEvent(new Event('cart:updated'));

      // Open cart drawer
      const cartDrawer = document.getElementById('cart-drawer');
      const cartOverlay = document.getElementById('cart-drawer-overlay');
      if (cartDrawer) openDrawer(cartDrawer, cartOverlay);

      submitBtn.textContent = 'Pre-Order';
    } catch (err) {
      console.error(err);
      submitBtn.textContent = 'Pre-Order';
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

/* ------------------------------------------------------------
   Announcement bar scroll behaviour
   Announcement scrolls away with page; header sticks
   (Pure CSS handles this — sticky header + relative announcement)
   Nothing JS needed here, but left as hook for future logic
   ------------------------------------------------------------ */
