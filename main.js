(() => {
  const TOTAL_FRAMES = 240;
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const progressBar = document.getElementById('progress-bar');

  // UI Elements
  const playPauseBtn = document.getElementById('play-pause-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const playPauseText = document.getElementById('play-pause-text');
  const frameScrubber = document.getElementById('frame-scrubber');
  const frameCounter = document.getElementById('frame-counter');
  const speedBtn = document.getElementById('speed-btn');
  const phaseBtns = document.querySelectorAll('.phase-jump-btn');

  const images = new Array(TOTAL_FRAMES);
  const isLoaded = new Array(TOTAL_FRAMES).fill(false);
  let loadedCount = 0;

  // Animation state
  let isPlaying = true;
  let playbackSpeed = 1.0;
  let currentFrame = 0;
  let targetFrame = 0;
  let lastDrawnIndex = -1;
  let isUserInteracting = false;
  let scrollTimeout = null;
  let lastTime = 0;
  const FPS = 30;
  const frameDuration = 1000 / FPS;

  function getFramePath(index) {
    const frameNum = String(index + 1).padStart(4, '0');
    return `upscaled-video_all_frames/frame_${frameNum}.png`;
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

  // Update UI controller elements
  function updateUI(frame) {
    const safeFrame = Math.min(Math.max(Math.round(frame), 0), TOTAL_FRAMES - 1);
    if (frameScrubber && !isUserInteracting) {
      frameScrubber.value = safeFrame;
    }
    if (frameCounter) {
      let phaseName = 'Droplet';
      if (safeFrame >= 40 && safeFrame < 110) phaseName = 'Impact Splash';
      else if (safeFrame >= 110 && safeFrame < 180) phaseName = 'Hydro Crown';
      else if (safeFrame >= 180) phaseName = 'Radiant Shine';

      frameCounter.textContent = `Frame ${safeFrame + 1}/240 • ${phaseName}`;
    }
  }

  // Animation render loop (auto-play + lerp scrubber)
  function renderLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;

    if (isPlaying && !isUserInteracting) {
      if (delta >= (frameDuration / playbackSpeed)) {
        lastTime = timestamp - (delta % (frameDuration / playbackSpeed));
        targetFrame = (targetFrame + 1) % TOTAL_FRAMES;
      }
    }

    // Smooth lerp towards targetFrame
    currentFrame += (targetFrame - currentFrame) * 0.22;
    if (Math.abs(targetFrame - currentFrame) < 0.01) {
      currentFrame = targetFrame;
    }

    const frameToDraw = Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_FRAMES - 1);
    drawFrame(frameToDraw);
    updateUI(frameToDraw);

    requestAnimationFrame(renderLoop);
  }

  // Calculate target frame naturally based on the entire website scroll
  function updateScroll() {
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;
    const currentScroll = window.scrollY || window.pageYOffset || 0;

    if (maxScroll > 0) {
      // Pause auto-play while actively scrolling and scrub with scroll
      isUserInteracting = true;
      const fraction = Math.min(Math.max(currentScroll / maxScroll, 0), 1);
      targetFrame = fraction * (TOTAL_FRAMES - 1);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserInteracting = false;
        lastTime = performance.now();
      }, 1200);
    }
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

    // Load remaining frames with high concurrency
    const CONCURRENCY = 12;
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

  // UI Interactive Controls
  function setupControls() {
    // Play/Pause button
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        if (playIcon) playIcon.classList.toggle('hidden', isPlaying);
        if (pauseIcon) pauseIcon.classList.toggle('hidden', !isPlaying);
        if (playPauseText) playPauseText.textContent = isPlaying ? 'Pause' : 'Play';
        if (isPlaying) {
          isUserInteracting = false;
          lastTime = performance.now();
        }
      });
    }

    // Scrubber Range Input
    if (frameScrubber) {
      frameScrubber.addEventListener('input', (e) => {
        isUserInteracting = true;
        targetFrame = parseInt(e.target.value, 10);
      });
      frameScrubber.addEventListener('change', () => {
        setTimeout(() => {
          isUserInteracting = false;
          lastTime = performance.now();
        }, 1000);
      });
    }

    // Speed button
    if (speedBtn) {
      const speeds = [1.0, 1.5, 2.0, 0.5];
      let speedIdx = 0;
      speedBtn.addEventListener('click', () => {
        speedIdx = (speedIdx + 1) % speeds.length;
        playbackSpeed = speeds[speedIdx];
        speedBtn.textContent = playbackSpeed + 'x';
      });
    }

    // Phase jump buttons
    phaseBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const frame = parseInt(btn.getAttribute('data-frame'), 10);
        if (!isNaN(frame)) {
          targetFrame = frame;
          currentFrame = frame;
          drawFrame(frame, true);
          updateUI(frame);
          phaseBtns.forEach(b => b.classList.remove('bg-[#0077C8]', 'text-white'));
          btn.classList.add('bg-[#0077C8]', 'text-white');
        }
      });
    });

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
  }

  // Event Listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', updateScroll, { passive: true });

  // Initialize
  resizeCanvas();
  setupControls();
  preloadAllFrames();
  requestAnimationFrame(renderLoop);
})();
