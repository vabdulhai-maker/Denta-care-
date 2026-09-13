(() => {
  const TOTAL_FRAMES = 240;
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const progressBar = document.getElementById('progress-bar');

  const images = new Array(TOTAL_FRAMES);
  const isLoaded = new Array(TOTAL_FRAMES).fill(false);
  let loadedCount = 0;

  let currentFrame = 0;
  let targetFrame = 0;
  let lastDrawnIndex = -1;

  // Resolve frame path reliably across local file, localhost server, and GitHub Pages
  function getFramePath(index) {
    const frameNum = String(index + 1).padStart(4, '0');
    let base = window.location.href.split('#')[0].split('?')[0];
    if (!base.endsWith('/')) {
      if (base.endsWith('.html')) {
        base = base.substring(0, base.lastIndexOf('/') + 1);
      } else {
        base += '/';
      }
    }
    return new URL(`upscaled-video_all_frames/frame_${frameNum}.png`, base).href;
  }

  // Adjust canvas buffer to full viewport with Retina High-DPI support
  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    if (lastDrawnIndex >= 0) {
      drawFrame(lastDrawnIndex, true);
    }
  }

  // Draw frame with centered cover scaling across the full screen
  function drawFrame(index, force = false) {
    if (!canvas || !ctx) return;

    if (!images[index] || !isLoaded[index]) {
      // Find nearest loaded frame if current one is still loading
      let nearest = -1;
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        if (index - offset >= 0 && isLoaded[index - offset]) {
          nearest = index - offset;
          break;
        }
        if (index + offset < TOTAL_FRAMES && isLoaded[index + offset]) {
          nearest = index + offset;
          break;
        }
      }
      if (nearest === -1) return;
      index = nearest;
    }

    if (index === lastDrawnIndex && !force) return;

    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;

    // Cover calculation: scale to fill viewport completely, centered
    const hRatio = cw / img.width;
    const vRatio = ch / img.height;
    const ratio = Math.max(hRatio, vRatio);

    const drawW = img.width * ratio;
    const drawH = img.height * ratio;
    const drawX = (cw - drawW) / 2;
    const drawY = (ch - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    lastDrawnIndex = index;
  }

  // Calculate target frame naturally based on the entire website scroll
  function updateScroll() {
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;
    const currentScroll = window.scrollY || window.pageYOffset || 0;

    if (maxScroll > 0) {
      const fraction = Math.min(Math.max(currentScroll / maxScroll, 0), 1);
      targetFrame = fraction * (TOTAL_FRAMES - 1);
    }
  }

  // Animation render loop with smooth Lerp physics
  function renderLoop() {
    currentFrame += (targetFrame - currentFrame) * 0.16;
    
    if (Math.abs(targetFrame - currentFrame) < 0.005) {
      currentFrame = targetFrame;
    }

    const frameToDraw = Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_FRAMES - 1);
    drawFrame(frameToDraw);

    requestAnimationFrame(renderLoop);
  }

  // Preload frame helper
  function loadSingleFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        images[i] = img;
        isLoaded[i] = true;
        loadedCount++;

        if (progressBar) {
          const pct = (loadedCount / TOTAL_FRAMES) * 100;
          progressBar.style.width = pct + '%';
        }

        // Instant paint of frame 0
        if (i === 0 && lastDrawnIndex === -1) {
          drawFrame(0, true);
        }

        if (loadedCount === TOTAL_FRAMES && progressBar) {
          setTimeout(() => {
            progressBar.classList.add('loaded');
          }, 300);
        }

        resolve();
      };
      img.onerror = () => {
        resolve();
      };
    });
  }

  // Concurrent batch preloader
  async function preloadAllFrames() {
    // Top priority first 10 frames
    for (let i = 0; i < 10; i++) {
      await loadSingleFrame(i);
    }
    drawFrame(0, true);

    const CONCURRENCY = 14;
    const indices = [];
    for (let i = 10; i < TOTAL_FRAMES; i++) {
      indices.push(i);
    }

    let currentIndex = 0;
    async function worker() {
      while (currentIndex < indices.length) {
        const idx = indices[currentIndex++];
        await loadSingleFrame(idx);
      }
    }

    const workers = [];
    for (let w = 0; w < CONCURRENCY; w++) {
      workers.push(worker());
    }
    await Promise.all(workers);
  }

  // Mobile navigation menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      mobileMenu.classList.toggle('flex');
    });

    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
      });
    });
  }

  // Event Listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', updateScroll, { passive: true });

  // Initialize
  resizeCanvas();
  updateScroll();
  preloadAllFrames();
  requestAnimationFrame(renderLoop);
})();
