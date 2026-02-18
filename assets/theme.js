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
  const gallery    = document.getElementById('product-gallery');
  if (!gallery) return;

  const mainImages = gallery.querySelectorAll('[data-main-image]');
  const thumbs     = gallery.querySelectorAll('[data-thumb]');

  if (!mainImages.length || !thumbs.length) return;

  function switchImage(index) {
    // Fade out current
    mainImages.forEach((img, i) => {
      img.classList.toggle('is-active', i === index);
    });
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === index);
    });
  }

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => switchImage(i));
  });

  // Initialize first image
  switchImage(0);
})();

/* ------------------------------------------------------------
   Product Image Gallery — Mobile swipe
   ------------------------------------------------------------ */
(function initMobileSwipe() {
  const gallery = document.getElementById('product-gallery');
  if (!gallery) return;

  const mainImagesContainer = gallery.querySelector('[data-images-container]');
  if (!mainImagesContainer) return;

  const images = gallery.querySelectorAll('[data-main-image]');
  if (images.length <= 1) return;

  let currentIndex = 0;
  let startX = 0;
  let isDragging = false;

  mainImagesContainer.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  mainImagesContainer.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;

    const deltaX = e.changedTouches[0].clientX - startX;
    const threshold = 50;

    if (deltaX < -threshold && currentIndex < images.length - 1) {
      currentIndex++;
    } else if (deltaX > threshold && currentIndex > 0) {
      currentIndex--;
    }

    // Trigger the same image switch
    const thumbsAll = gallery.querySelectorAll('[data-thumb]');
    images.forEach((img, i) => img.classList.toggle('is-active', i === currentIndex));
    thumbsAll.forEach((t, i) => t.classList.toggle('is-active', i === currentIndex));
  }, { passive: true });
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
          el.textContent = count > 0 ? `(${count})` : '';
        });
      })
      .catch(() => {/* silently fail in local dev */});
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
