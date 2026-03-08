/* =====================================================
   MPX NJ — Deal of the Night
   GSAP Animation Engine
   ===================================================== */

// Register GSAP plugins
gsap.registerPlugin(SplitText, CustomEase, DrawSVGPlugin, MotionPathPlugin);

// =====================================================
// DESIGN DECISION: 1 product spotlight per cycle.
// Each product gets a full cinematic solo moment.
// =====================================================
const PRODUCTS_PER_CYCLE = 1;

let PRODUCTS = [];
let currentBatch = 0;

// Custom eases
CustomEase.create('goldDrop', 'M0,0 C0.2,0 0.35,0.4 0.5,0.7 0.65,1 0.8,1 1,1');
CustomEase.create('snapIn', 'M0,0 C0,0 0.3,0 0.5,0 0.7,0 0.8,0.9 0.85,1 0.9,1.05 0.95,1.02 1,1');
CustomEase.create('luxSlide', 'M0,0 C0.05,0 0.1,0.4 0.4,0.9 0.7,1.05 0.85,1 1,1');

// =====================================================
// GRAIN CANVAS
// =====================================================
function initGrain() {
  const canvas = document.getElementById('grain-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1920;
  canvas.height = 1080;

  function drawGrain() {
    const imgData = ctx.createImageData(1920, 1080);
    const buf = imgData.data;
    for (let i = 0; i < buf.length; i += 4) {
      const v = Math.random() * 255 | 0;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v;
      buf[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    requestAnimationFrame(drawGrain);
  }
  drawGrain();
}

// =====================================================
// SCENE SCALE
// =====================================================
function scaleScene() {
  const scene = document.getElementById('scene');
  const scaleX = window.innerWidth / 1920;
  const scaleY = window.innerHeight / 1080;
  const scale = Math.min(scaleX, scaleY);
  scene.style.transform = `scale(${scale})`;
  scene.style.transformOrigin = 'top left';
  const marginLeft = (window.innerWidth - 1920 * scale) / 2;
  const marginTop = (window.innerHeight - 1080 * scale) / 2;
  scene.style.left = marginLeft + 'px';
  scene.style.top = marginTop + 'px';
  scene.style.position = 'absolute';
}
scaleScene();
window.addEventListener('resize', scaleScene);

// =====================================================
// PRODUCT LOADING
// =====================================================
async function loadProducts() {
  try {
    const response = await fetch('./products.json', { cache: 'no-store' });
    const data = await response.json();
    PRODUCTS = data.products || [];
  } catch (error) {
    console.warn('products.json not found, using sample data');
    PRODUCTS = [];
  }
  startCycle();
}

function getBatch(batchIndex) {
  const batch = [];
  if (PRODUCTS.length === 0) return batch;
  const start = (batchIndex * PRODUCTS_PER_CYCLE) % PRODUCTS.length;
  for (let i = 0; i < PRODUCTS_PER_CYCLE; i++) {
    batch.push(PRODUCTS[(start + i) % PRODUCTS.length]);
  }
  return batch;
}

// =====================================================
// RENDER PRODUCT CARD
// =====================================================
function renderProduct(product) {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

  const price = parseFloat(product.price) || 0;
  const discounted = parseFloat(product.discounted_price) || 0;
  const hasDiscount = discounted > 0 && discounted < price;
  const savings = hasDiscount ? Math.round(price - discounted) : 0;
  const savingsPct = hasDiscount ? Math.round((savings / price) * 100) : 0;

  const card = document.createElement('div');
  card.className = 'product-card layout-featured';
  card.id = 'active-product';

  // Position card in the scene center-left / right split
  card.style.cssText = `
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1600px;
    justify-content: center;
  `;

  // Product image
  const imgWrap = document.createElement('div');
  imgWrap.className = 'product-img-wrap';
  imgWrap.id = 'product-img-wrap';

  const img = document.createElement('img');
  img.className = 'product-image';
  img.src = product.image_url || '';
  img.alt = product.name || '';
  img.style.cssText = 'width: 460px; height: 460px;';

  imgWrap.appendChild(img);

  // Info block
  const info = document.createElement('div');
  info.className = 'product-info';
  info.id = 'product-info';

  // Brand
  const brand = document.createElement('div');
  brand.className = 'product-brand';
  brand.id = 'product-brand';
  brand.textContent = (product.brand || '').toUpperCase();

  // Divider
  const divider = document.createElement('div');
  divider.className = 'gold-divider';
  divider.id = 'gold-divider';

  // Name
  const name = document.createElement('div');
  name.className = 'product-name';
  name.id = 'product-name';
  name.textContent = product.name || product.online_title || '';

  // Category
  const cat = document.createElement('div');
  cat.className = 'product-category';
  cat.id = 'product-category';
  cat.textContent = product.category || '';

  // Pricing
  const pricing = document.createElement('div');
  pricing.className = 'product-pricing';
  pricing.id = 'product-pricing';

  if (hasDiscount) {
    const orig = document.createElement('div');
    orig.className = 'price-original';
    orig.id = 'price-original';
    orig.textContent = `$${price.toFixed(0)}`;

    const sale = document.createElement('div');
    sale.className = 'price-sale';
    sale.id = 'price-sale';
    sale.innerHTML = `<span class="currency">$</span><span id="sale-number">${discounted.toFixed(0)}</span>`;

    pricing.appendChild(orig);
    pricing.appendChild(sale);
  } else {
    const saleOnly = document.createElement('div');
    saleOnly.className = 'price-sale';
    saleOnly.id = 'price-sale';
    saleOnly.innerHTML = `<span class="currency">$</span><span id="sale-number">${price.toFixed(0)}</span>`;
    pricing.appendChild(saleOnly);
  }

  // Savings badge
  let badgeEl = null;
  if (hasDiscount && savings > 0) {
    badgeEl = document.createElement('div');
    badgeEl.className = 'savings-badge';
    badgeEl.id = 'savings-badge';
    badgeEl.innerHTML = `SAVE $${savings} &nbsp;&#x2014;&nbsp; ${savingsPct}% OFF`;
  }

  // Meta line
  const meta = document.createElement('div');
  meta.className = 'product-meta-line';
  meta.id = 'product-meta';
  if (product.strain && product.strain !== product.name) {
    meta.textContent = product.strain_type
      ? `${product.strain_type} · ${product.strain}`
      : product.strain;
  } else if (product.category) {
    meta.textContent = product.category;
  }

  info.appendChild(brand);
  info.appendChild(divider);
  info.appendChild(name);
  info.appendChild(cat);
  info.appendChild(pricing);
  if (badgeEl) info.appendChild(badgeEl);
  info.appendChild(meta);

  card.appendChild(imgWrap);
  card.appendChild(info);

  container.appendChild(card);

  // Add flash div
  const flash = document.createElement('div');
  flash.className = 'scene-flash';
  flash.id = 'scene-flash';
  container.appendChild(flash);

  return { card, hasDiscount, savings };
}

// =====================================================
// AMBIENT ANIMATIONS (persistent)
// =====================================================
function startAmbient() {
  // Corner ornaments pulse
  const corners = ['#corner-tl', '#corner-tr', '#corner-bl', '#corner-br'];
  corners.forEach((c, i) => {
    gsap.to(c, {
      opacity: 0.7,
      duration: 2,
      delay: 0.5 + i * 0.2,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: -1,
      repeatDelay: 0.8
    });
  });

  // Spotlight halo breathe
  gsap.to('#spotlight-halo', {
    opacity: 1,
    scale: 1.08,
    duration: 3.5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 0.5
  });

  // X-lines very slow drift
  gsap.to('#x-lines', {
    opacity: 0.9,
    duration: 6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });
}

// =====================================================
// MAIN CYCLE ANIMATION
// =====================================================
function animateCycle(batchIndex) {
  const batch = getBatch(batchIndex);
  if (batch.length === 0) {
    // No products — just loop
    gsap.delayedCall(3, () => animateCycle(batchIndex + 1));
    return;
  }

  const product = batch[0];
  const { card, hasDiscount } = renderProduct(product);

  const tl = gsap.timeline({
    onComplete: () => animateCycle(batchIndex + 1)
  });

  // --------------------------------------------------
  // ACT 0: Scene entry — establish world
  // --------------------------------------------------
  tl.addLabel('scene-in', 0);

  // Corner brackets drop in
  tl.fromTo(['#corner-tl', '#corner-tr', '#corner-bl', '#corner-br'],
    { opacity: 0, scale: 0.7 },
    { opacity: 0.7, scale: 1, duration: 0.8, stagger: 0.08, ease: 'back.out(1.4)' },
    'scene-in'
  );

  // UI frame lines draw — use scaleX since DrawSVG works best on paths
  tl.fromTo(['#rule-top', '#rule-bot'],
    { opacity: 0, scaleX: 0, transformOrigin: 'left center' },
    { opacity: 0.35, scaleX: 1, duration: 1.2, stagger: 0.15, ease: 'power2.inOut' },
    'scene-in+=0.3'
  );

  // MPX Wordmark slides down from top
  tl.fromTo('#brand-header',
    { y: -40, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.9, ease: 'luxSlide' },
    'scene-in+=0.4'
  );

  // Promo tag slides in from right
  tl.fromTo('#promo-tag',
    { x: 40, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.9, ease: 'luxSlide' },
    'scene-in+=0.5'
  );

  // Spotlight halo reveals
  tl.fromTo('#spotlight-halo',
    { scale: 0.3, opacity: 0 },
    { scale: 1, opacity: 1, duration: 1.8, ease: 'power2.out' },
    'scene-in+=0.2'
  );

  // X diagonal lines reveal — animate via opacity and strokeDashoffset
  tl.fromTo(['#x-line-a', '#x-line-b'],
    { opacity: 0, strokeDashoffset: 2800 },
    { opacity: 0.18, strokeDashoffset: 0, duration: 2.2, stagger: 0.3, ease: 'power1.inOut' },
    'scene-in+=0.5'
  );

  // --------------------------------------------------
  // ACT 1: Product Entrance
  // --------------------------------------------------
  tl.addLabel('product-in', 1.4);

  // Card fades in
  tl.fromTo(card,
    { opacity: 0 },
    { opacity: 1, duration: 0.3 },
    'product-in'
  );

  // Product image rises from below with dramatic slow pull
  tl.fromTo('#product-img-wrap',
    { y: 120, opacity: 0, scale: 0.88, rotation: -3 },
    { y: 0, opacity: 1, scale: 1, rotation: 0, duration: 1.4, ease: 'snapIn' },
    'product-in'
  );

  // Gold divider line draws out
  tl.fromTo('#gold-divider',
    { scaleX: 0, opacity: 0 },
    { scaleX: 1, opacity: 1, duration: 0.7, ease: 'power2.out' },
    'product-in+=0.4'
  );

  // Brand label
  tl.fromTo('#product-brand',
    { y: 20, opacity: 0, letterSpacing: '0.5em' },
    { y: 0, opacity: 1, letterSpacing: '0.35em', duration: 0.8, ease: 'power2.out' },
    'product-in+=0.5'
  );

  // Product name — SplitText character reveal
  tl.add(() => {
    const nameEl = document.getElementById('product-name');
    if (!nameEl) return;
    const split = new SplitText(nameEl, { type: 'chars' });
    gsap.fromTo(split.chars,
      { y: 40, opacity: 0, rotationX: -45 },
      {
        y: 0, opacity: 1, rotationX: 0,
        duration: 0.07,
        stagger: { amount: 0.5, ease: 'power2.out' },
        ease: 'back.out(1.2)'
      }
    );
  }, 'product-in+=0.7');

  // Category
  tl.fromTo('#product-category',
    { x: -30, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
    'product-in+=1.1'
  );

  // Meta
  tl.fromTo('#product-meta',
    { opacity: 0 },
    { opacity: 0.5, duration: 0.8, ease: 'power1.in' },
    'product-in+=1.3'
  );

  // --------------------------------------------------
  // ACT 2: Price Drop — The Jackpot Moment
  // --------------------------------------------------
  tl.addLabel('price-drop', 3.2);

  // Original price crosses out and fades
  if (hasDiscount) {
    tl.fromTo('#price-original',
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
      'price-drop'
    );

    // Brief pause before the reveal
    tl.addLabel('sale-reveal', 'price-drop+=0.4');

    // Sale price slot-machine drop from above
    tl.fromTo('#price-sale',
      { y: -80, opacity: 0, scale: 1.3 },
      { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: 'goldDrop' },
      'sale-reveal'
    );

    // Gold glow pulse on price
    tl.to('#price-sale', {
      textShadow: '0 0 40px rgba(240, 201, 106, 0.9), 0 0 80px rgba(201, 168, 76, 0.5)',
      duration: 0.3,
      ease: 'power2.in',
      yoyo: true,
      repeat: 1
    }, 'sale-reveal+=0.55');

    // Gold scan sweep (the X transition concept)
    tl.to('#scan-sweep', {
      x: 1930,
      opacity: 1,
      duration: 0.55,
      ease: 'power2.inOut'
    }, 'sale-reveal+=0.5');

    tl.set('#scan-sweep', { opacity: 0, x: -10 }, 'sale-reveal+=1.1');

    // Savings badge shoots in
    tl.fromTo('#savings-badge',
      { x: -60, opacity: 0 },
      {
        x: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)',
        onComplete: () => {
          // Badge shimmer
          const badge = document.getElementById('savings-badge');
          if (badge) {
            gsap.to(badge.querySelector('::before') || badge, {
              duration: 0
            });
          }
        }
      },
      'sale-reveal+=0.8'
    );

    // Badge shimmer sweep
    tl.to('#savings-badge', {
      backgroundImage: 'linear-gradient(90deg, #c0392b 0%, #e74c3c 50%, #c0392b 100%)',
      duration: 0.4,
      yoyo: true,
      repeat: 1,
      ease: 'none'
    }, 'sale-reveal+=1.1');

  } else {
    // No discount — just price reveals cleanly
    tl.fromTo('#price-sale',
      { y: -50, opacity: 0, scale: 1.2 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'goldDrop' },
      'price-drop'
    );
  }

  // --------------------------------------------------
  // ACT 3: Living Moment — Scene breathes
  // --------------------------------------------------
  tl.addLabel('living', 'price-drop+=1.8');

  // Product image gentle float
  tl.to('#product-img-wrap', {
    y: -14,
    duration: 2.8,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 2
  }, 'living');

  // Image subtle rotation drift
  tl.to('#product-img-wrap', {
    rotation: 1.5,
    duration: 3.2,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 1,
    transformOrigin: 'center center'
  }, 'living+=0.3');

  // Price sale pulsing glow
  tl.to('#price-sale', {
    filter: 'drop-shadow(0 0 30px rgba(240, 201, 106, 0.7))',
    duration: 1.8,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 2
  }, 'living');

  // Spotlight halo breathe
  tl.to('#spotlight-halo', {
    scale: 1.12,
    opacity: 0.85,
    duration: 2.5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 2
  }, 'living+=0.5');

  // Savings badge subtle pulse (if exists)
  if (hasDiscount) {
    tl.to('#savings-badge', {
      scale: 1.04,
      duration: 1.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 3,
      transformOrigin: 'left center'
    }, 'living+=0.8');
  }

  // --------------------------------------------------
  // ACT 4: Exit — X sweep transition
  // --------------------------------------------------
  tl.addLabel('exit', 'living+=8.5');

  // Scan sweep crosses the frame again
  tl.to('#scan-sweep', {
    x: 1930,
    opacity: 1,
    duration: 0.7,
    ease: 'power3.inOut'
  }, 'exit');

  tl.set('#scan-sweep', { x: -10, opacity: 0 }, 'exit+=0.75');

  // Products exit — image falls away
  tl.to('#product-img-wrap', {
    y: 80,
    opacity: 0,
    scale: 0.92,
    duration: 0.7,
    ease: 'power2.in'
  }, 'exit+=0.3');

  // Info exits to the right
  tl.to('#product-info', {
    x: 80,
    opacity: 0,
    duration: 0.55,
    ease: 'power2.in'
  }, 'exit+=0.35');

  // UI elements exit
  tl.to(['#brand-header', '#promo-tag'], {
    opacity: 0,
    duration: 0.5,
    ease: 'power1.in'
  }, 'exit+=0.4');

  // Frame lines retract
  tl.to(['#rule-top', '#rule-bot'], {
    scaleX: 0,
    opacity: 0,
    transformOrigin: 'right center',
    duration: 0.6,
    ease: 'power2.in'
  }, 'exit+=0.3');

  // X lines fade
  tl.to(['#x-line-a', '#x-line-b'], {
    opacity: 0,
    duration: 0.4,
    ease: 'power1.in'
  }, 'exit+=0.4');

  // Corner ornaments fade
  tl.to(['#corner-tl', '#corner-tr', '#corner-bl', '#corner-br'], {
    opacity: 0,
    scale: 0.7,
    duration: 0.4,
    stagger: 0.05,
    ease: 'power1.in'
  }, 'exit+=0.4');

  // Spotlight fades
  tl.to('#spotlight-halo', {
    opacity: 0,
    scale: 0.5,
    duration: 0.6,
    ease: 'power2.in'
  }, 'exit+=0.3');

  // Card full opacity out
  tl.to(card, {
    opacity: 0,
    duration: 0.3,
    ease: 'power1.in'
  }, 'exit+=0.8');

  // Brief pause before next product
  tl.addLabel('between-products', 'exit+=1.1');
  // Reset x-lines for next cycle
  tl.set(['#x-line-a', '#x-line-b'], { strokeDashoffset: 2800, opacity: 0 }, 'between-products');
  tl.set(['#rule-top', '#rule-bot'], { scaleX: 0, opacity: 0 }, 'between-products');
}

function startCycle() {
  // Start ambient animations
  startAmbient();
  // Start product cycle
  animateCycle(0);
}

// =====================================================
// INIT
// =====================================================
window.addEventListener('DOMContentLoaded', () => {
  initGrain();
  loadProducts();
});
