document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.BiggerPicture !== 'function') {
    console.error('[gallery-init] BiggerPicture not found. Check script path.');
    return;
  }

  // 1) Wrap Org-exported images so they’re clickable
  const imgs = document.querySelectorAll('.figure img, img.org-svg');
  imgs.forEach((img) => {
    if (img.closest('a')) return;                 // already wrapped
    const a = document.createElement('a');
    const href = img.currentSrc || img.src;
    a.href = href;
    a.dataset.img = href;                         // lets BP pre-size/raster slides
    a.dataset.alt = img.alt || '';
    const setDims = () => {
      a.dataset.width  = img.naturalWidth  || img.width  || 1920;
      a.dataset.height = img.naturalHeight || img.height || 1080;
    };
    if (img.complete) setDims(); else img.addEventListener('load', setDims);
    img.style.cursor = 'zoom-in';
    img.parentElement.insertBefore(a, img);
    a.appendChild(img);
  });

  // 2) One global BP instance
  const bp = BiggerPicture({ target: document.body });

  // SVG pan/zoom handle
  let activePanZoom = null;
  const destroyPanZoom = () => { try { activePanZoom?.destroy(); } catch(_){} activePanZoom = null; };

  // 3) Build galleries per content container
  const containers = document.querySelectorAll('main, article, .content, body');
  containers.forEach((container) => {
    const links = Array.from(container.querySelectorAll('.figure a, a:has(img.org-svg)'));
    if (!links.length) return;

    // Start the lightbox on click
    links.forEach((link, index) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll(".theme-toggle").forEach(el => {
          el.classList.add("hidden");
        });

	
        bp.open({
          // IMPORTANT: pass the anchor ELEMENTS, not custom objects
          items: links,
          el: link,
          caption: (el) => el.querySelector('img')?.alt || el.title || '',
          maxZoom: 40, // for raster images (PNG/JPG); SVG handled separately

          // Fade-out polish + cleanup
          onClose(containerEl) {
            destroyPanZoom();
            if (containerEl) containerEl.classList.add('bp-fadeout');
            const themeToggle = document.querySelector(".theme-toggle");
            if (themeToggle) {
              themeToggle.classList.remove("hidden");
            }
          },

          // Called once after open and on every slide change
          onOpen(containerEl)  { enhanceSVG(containerEl); },
          onUpdate(containerEl){ enhanceSVG(containerEl); }
        });
      });
    });
  });

  // 4) If current slide is an SVG, swap to inline + enable svg-pan-zoom
  async function enhanceSVG(containerEl) {
    try {
      destroyPanZoom();

      const imgEl = containerEl.querySelector('.bp-img img');
      if (!imgEl) return;

      const src = imgEl.currentSrc || imgEl.src || '';
      const isSVG = src.toLowerCase().endsWith('.svg');
      const htmlLayer = containerEl.querySelector('.bp-html');
      if (!isSVG || !htmlLayer) {
        // ensure any previous holder is removed and bitmap is visible
        const old = htmlLayer?.querySelector('.bp-svg-holder');
        if (old) old.remove();
        imgEl.style.visibility = '';
        return;
      }

      // Create/clear holder
      let holder = htmlLayer.querySelector('.bp-svg-holder');
      if (!holder) {
        holder = document.createElement('div');
        holder.className = 'bp-svg-holder';
        holder.style.maxWidth = '95vw';
        holder.style.maxHeight = '95vh';
        htmlLayer.appendChild(holder);
      }
      holder.innerHTML = '';

      // Hide the bitmap so only the inline SVG shows
      imgEl.style.visibility = 'hidden';

      // Inline the SVG
      const res = await fetch(src, { cache: 'force-cache' });
      const text = await res.text();
      holder.innerHTML = text;

      const svg = holder.querySelector('svg');
      if (!svg) { imgEl.style.visibility = ''; return; }

      svg.style.maxWidth  = '95vw';
      svg.style.maxHeight = '95vh';
      svg.style.display   = 'block';

      if (typeof window.svgPanZoom === 'function') {
        activePanZoom = svgPanZoom(svg, {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
          minZoom: 0.05,
          maxZoom: 400,          // effectively "unlimited"
          zoomScaleSensitivity: 0.25,
          dblClickZoomEnabled: true
        });
        // Keep wheel inside lightbox
        holder.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
      } else {
        console.warn('[gallery-init] svg-pan-zoom not loaded');
      }
    } catch (err) {
      console.error('[gallery-init] SVG enhance failed:', err);
    }
  }
});
