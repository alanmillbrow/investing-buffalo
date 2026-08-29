(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const STORAGE_KEY = 'starter-sheet-builder-draft-v1';
  const SECTION_COUNT = 4;
  const ITEMS_PER_SECTION = 4;

  const DEFAULT_SECTIONS = [
    { heading: 'Four Stages of Financial Health' },
    { heading: 'The Path Forward' },
    { heading: 'Choose The Right Account' },
    { heading: 'Start Investing' },
  ];

  // ---------- Build the repeated section-editor cards ----------
  // Written once here rather than 4x nearly-identical blocks in the
  // HTML — each section is (heading + up to 4 subheading/body pairs +
  // a link), which is 11 fields x 4 sections = 44 fields, too much
  // repetition to hand-write and keep in sync.
  const sectionsContainer = $('sectionsContainer');
  const sectionHTML = (index, defaultHeading) => {
    const n = index + 1;
    const items = Array.from({ length: ITEMS_PER_SECTION }, (_, i) => `
      <div class="field">
        <label for="s${index}-sub${i}-heading">Subheading ${i + 1}</label>
        <input type="text" id="s${index}-sub${i}-heading" data-section="${index}" data-item="${i}" data-role="subheading">
      </div>
      <div class="field">
        <label for="s${index}-sub${i}-body">Body text ${i + 1}</label>
        <textarea id="s${index}-sub${i}-body" data-section="${index}" data-item="${i}" data-role="body" rows="5"></textarea>
      </div>`).join('');
    return `
      <section class="card">
        <h2>Section ${n}</h2>
        <div class="field">
          <label for="s${index}-heading">Section heading</label>
          <input type="text" id="s${index}-heading" data-section="${index}" data-role="heading" value="${defaultHeading}">
        </div>
        <div class="field">
          <label for="s${index}-blurb">Section blurb</label>
          <span class="field-hint">A short intro line shown under the heading, before the subheadings start</span>
          <textarea id="s${index}-blurb" data-section="${index}" data-role="blurb" rows="3"></textarea>
        </div>
        <p class="section-note">Leave any subheading/body pair blank to skip it — up to ${ITEMS_PER_SECTION} per section.</p>
        ${items}
        <div class="field">
          <label for="s${index}-link-label">Link label</label>
          <input type="text" id="s${index}-link-label" data-section="${index}" data-role="linkLabel">
        </div>
        <div class="field">
          <label for="s${index}-link-url">Link URL</label>
          <input type="text" id="s${index}-link-url" data-section="${index}" data-role="linkUrl" placeholder="investingbuffalo.com/...">
        </div>
      </section>`;
  };

  sectionsContainer.innerHTML = Array.from({ length: SECTION_COUNT }, (_, i) =>
    sectionHTML(i, DEFAULT_SECTIONS[i].heading)
  ).join('');

  // ---------- Elements (queried after the sections above exist) ----------
  const sheetTitleInput = $('sheetTitle');
  const introInput = $('introText');
  const disclaimerInput = $('disclaimer');
  const generateBtn = $('generateBtn');
  const downloadBtn = $('downloadBtn');
  const clearDraftBtn = $('clearDraftBtn');
  const shareStatus = $('shareStatus');
  const previewWrap = $('previewWrap');
  const preview = $('preview');
  const themeToggle = $('themeToggle');

  const allFields = () => Array.from(document.querySelectorAll('[data-role], #sheetTitle, #introText, #disclaimer'));

  // ---------- Data model in/out of the form ----------
  function collectData() {
    const sections = Array.from({ length: SECTION_COUNT }, (_, s) => {
      const get = (role, item) => {
        const sel = item === undefined
          ? `[data-section="${s}"][data-role="${role}"]:not([data-item])`
          : `[data-section="${s}"][data-item="${item}"][data-role="${role}"]`;
        const el = document.querySelector(sel);
        return el ? el.value.trim() : '';
      };
      return {
        heading: get('heading'),
        blurb: get('blurb'),
        items: Array.from({ length: ITEMS_PER_SECTION }, (_, i) => ({
          subheading: get('subheading', i),
          body: get('body', i),
        })),
        linkLabel: get('linkLabel'),
        linkUrl: get('linkUrl'),
      };
    });
    return {
      title: sheetTitleInput.value.trim(),
      intro: introInput.value.trim(),
      sections,
      disclaimer: disclaimerInput.value.trim(),
    };
  }

  function applyData(data) {
    if (!data) return;
    if (data.title !== undefined) sheetTitleInput.value = data.title;
    if (data.intro !== undefined) introInput.value = data.intro;
    if (data.disclaimer !== undefined) disclaimerInput.value = data.disclaimer;
    (data.sections || []).forEach((section, s) => {
      const setVal = (role, item, val) => {
        const sel = item === undefined
          ? `[data-section="${s}"][data-role="${role}"]:not([data-item])`
          : `[data-section="${s}"][data-item="${item}"][data-role="${role}"]`;
        const el = document.querySelector(sel);
        if (el && val !== undefined) el.value = val;
      };
      setVal('heading', undefined, section.heading);
      setVal('blurb', undefined, section.blurb);
      (section.items || []).forEach((item, i) => {
        setVal('subheading', i, item.subheading);
        setVal('body', i, item.body);
      });
      setVal('linkLabel', undefined, section.linkLabel);
      setVal('linkUrl', undefined, section.linkUrl);
    });
  }

  // ---------- Draft persistence (this browser only) ----------
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
      } catch (e) {
        // Storage full/unavailable — the draft just won't persist, not
        // worth surfacing to the user for an internal tool.
      }
    }, 400);
  }

  function loadDraft() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      saved = null;
    }
    if (saved) applyData(saved);
  }

  allFields().forEach((el) => el.addEventListener('input', scheduleSave));

  clearDraftBtn.addEventListener('click', () => {
    if (!window.confirm('Clear all fields and the saved draft? This can’t be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    sheetTitleInput.value = 'UK Investing Starter Sheet';
    introInput.value = '';
    disclaimerInput.value = '';
    applyData({ sections: DEFAULT_SECTIONS.map((s) => ({ heading: s.heading, items: [], linkLabel: '', linkUrl: '' })) });
    document.querySelectorAll('[data-role="blurb"], [data-role="subheading"], [data-role="body"], [data-role="linkLabel"], [data-role="linkUrl"]')
      .forEach((el) => { el.value = ''; });
    setStatus('Draft cleared');
  });

  loadDraft();

  // ---------- Status helper ----------
  let statusTimer = null;
  function setStatus(msg, duration = 3000) {
    shareStatus.textContent = msg;
    clearTimeout(statusTimer);
    if (duration) statusTimer = setTimeout(() => { shareStatus.textContent = ''; }, duration);
  }

  // ---------- Canvas generation ----------
  // Same palette/technique as Map Your Path's downloadable wallpaper —
  // always the light/kraft palette regardless of the builder's own
  // theme, since this is a shared asset that should look the same
  // wherever it's used.
  const CARD_COLORS = {
    bg: '#cabb95',
    ink: '#33291f',
    inkSecondary: 'rgba(51, 41, 31, 0.64)',
    inkTertiary: 'rgba(51, 41, 31, 0.44)',
    accent: '#8c3f34',
  };

  let recoloredBuffaloPromise = null;
  function loadRecoloredBuffalo(color) {
    if (recoloredBuffaloPromise) return recoloredBuffaloPromise;
    recoloredBuffaloPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const cx = c.getContext('2d');
        cx.drawImage(img, 0, 0);
        cx.globalCompositeOperation = 'source-in';
        cx.fillStyle = color;
        cx.fillRect(0, 0, c.width, c.height);
        resolve(c);
      };
      img.onerror = reject;
      img.src = '/BuffaloImage.png';
    });
    return recoloredBuffaloPromise;
  }

  // Plain greedy word-wrap — good enough for editable, user-checked
  // copy (unlike the calculators' dynamic figures, there's a live
  // preview here to catch anything that runs long before download).
  // Manual line breaks (Enter in a textarea) are treated as intentional
  // and kept as their own line — including a blank line for spacing —
  // rather than being collapsed into one flowing paragraph; each of
  // those lines is then word-wrapped by width as normal.
  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const lines = [];
    text.split('\n').forEach((paragraph) => {
      if (paragraph.trim() === '') {
        lines.push('');
        return;
      }
      const words = paragraph.split(/\s+/).filter(Boolean);
      let line = '';
      words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(test).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      if (line) lines.push(line);
    });
    return lines;
  }

  function buildStarterSheetCanvas(data) {
    const fontLoads = document.fonts
      ? Promise.all([
          document.fonts.load("400 60px 'shackleton'"),
          document.fonts.load("400 40px 'chaparral-pro'"),
          document.fonts.load("600 40px 'chaparral-pro'"),
        ]).catch(() => {})
      : Promise.resolve();

    return Promise.all([
      loadRecoloredBuffalo(CARD_COLORS.ink),
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
      fontLoads,
    ]).then(([buffalo]) => {
      const W = 5120, H = 3200;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      const serif = "'shackleton', Georgia, serif";
      const bodyFont = "'chaparral-pro', Georgia, serif";

      function boldText(text, x, y, size, color, strokeWidth) {
        ctx.font = `400 ${size}px ${serif}`;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }

      function fitFontSize(text, maxWidth, startSize, minSize, font) {
        let size = startSize;
        ctx.font = `400 ${size}px ${font}`;
        while (size > minSize && ctx.measureText(text).width > maxWidth) {
          size -= 4;
          ctx.font = `400 ${size}px ${font}`;
        }
        return size;
      }

      function renderSheet() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = CARD_COLORS.bg;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = CARD_COLORS.ink;
        ctx.lineWidth = 8;
        ctx.strokeRect(80, 80, W - 160, H - 160);
        ctx.textBaseline = 'alphabetic';

        // ---- Header: brand lockup, top-left ----
        const markSize = 140;
        ctx.drawImage(buffalo, 160, 140, markSize, markSize);
        ctx.textAlign = 'left';
        boldText('Investing Buffalo', 336, 245, 72, CARD_COLORS.ink, 1.6);

        // ---- Main title, centred beneath the header ----
        ctx.textAlign = 'center';
        const titleSize = fitFontSize(data.title.toUpperCase(), W - 320, 130, 70, serif);
        boldText(data.title.toUpperCase(), W / 2, 420, titleSize, CARD_COLORS.accent, Math.max(3, titleSize * 0.03));

        // ---- Intro message, centred beneath the title ----
        // A short thanks-for-downloading/summary sentence — optional, so
        // the columns below only make room for it when it's actually
        // there rather than always reserving fixed dead space.
        const introStartY = 520;
        const introLineHeight = 58;
        let introBottom = introStartY - 90;
        if (data.intro) {
          ctx.font = `400 44px ${bodyFont}`;
          const introLines = wrapText(ctx, data.intro, W * 0.66).slice(0, 4);
          ctx.fillStyle = CARD_COLORS.inkSecondary;
          introLines.forEach((line, li) => {
            ctx.fillText(line, W / 2, introStartY + li * introLineHeight);
          });
          introBottom = introStartY + (introLines.length - 1) * introLineHeight;
        }

        // ---- Four columns ----
        const margin = 160;
        const colGap = 80;
        const numCols = 4;
        const colWidth = (W - margin * 2 - colGap * (numCols - 1)) / numCols;
        const contentTop = Math.max(620, introBottom + 90);
        const contentBottom = H - 400;
        const linkBlockHeight = 130;
        const linkTop = contentBottom - linkBlockHeight;

        data.sections.forEach((section, i) => {
          const colX = margin + i * (colWidth + colGap);
          const centerX = colX + colWidth / 2;

          if (i > 0) {
            ctx.strokeStyle = 'rgba(51, 41, 31, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(colX - colGap / 2, contentTop);
            ctx.lineTo(colX - colGap / 2, contentBottom);
            ctx.stroke();
          }

          let y = contentTop;

          // Number badge
          ctx.textAlign = 'center';
          boldText(String(i + 1).padStart(2, '0'), centerX, y, 40, CARD_COLORS.accent, 1);
          y += 60;

          // Section heading, wrapped, centred
          const headingSize = fitFontSize(section.heading.toUpperCase(), colWidth, 56, 36, serif);
          ctx.font = `400 ${headingSize}px ${serif}`;
          const headingLines = wrapText(ctx, section.heading.toUpperCase(), colWidth);
          headingLines.forEach((line, li) => {
            boldText(line, centerX, y + li * (headingSize + 10), headingSize, CARD_COLORS.ink, 1.2);
          });
          y += headingLines.length * (headingSize + 10) + 6;

          // Short accent rule under the heading
          ctx.strokeStyle = CARD_COLORS.accent;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(centerX - 40, y);
          ctx.lineTo(centerX + 40, y);
          ctx.stroke();
          y += 50;

          // Section blurb — a short intro line before the subheadings start
          if (section.blurb) {
            ctx.textAlign = 'left';
            ctx.font = `400 32px ${bodyFont}`;
            const blurbLines = wrapText(ctx, section.blurb, colWidth);
            blurbLines.forEach((line, li) => {
              ctx.fillStyle = CARD_COLORS.inkSecondary;
              ctx.fillText(line, colX, y + li * 40);
            });
            y += blurbLines.length * 40 + 30;
          }

          // Sub-items — only the ones with something in them
          const items = section.items.filter((it) => it.subheading || it.body);
          items.forEach((item) => {
            if (item.subheading) {
              ctx.textAlign = 'left';
              ctx.font = `600 42px ${bodyFont}`;
              const subLines = wrapText(ctx, item.subheading, colWidth);
              subLines.forEach((line, li) => {
                ctx.fillStyle = CARD_COLORS.ink;
                ctx.fillText(line, colX, y + li * 50);
              });
              y += subLines.length * 50 + 10;
            }
            if (item.body) {
              ctx.textAlign = 'left';
              ctx.font = `400 34px ${bodyFont}`;
              const bodyLines = wrapText(ctx, item.body, colWidth);
              bodyLines.forEach((line, li) => {
                ctx.fillStyle = CARD_COLORS.inkSecondary;
                ctx.fillText(line, colX, y + li * 42);
              });
              y += bodyLines.length * 42;
            }
            y += 40;
          });

          // Link — pinned to the same Y in every column regardless of
          // how much (or little) sits above it, so all four line up.
          if (section.linkLabel || section.linkUrl) {
            ctx.strokeStyle = 'rgba(51, 41, 31, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(colX, linkTop);
            ctx.lineTo(colX + colWidth, linkTop);
            ctx.stroke();

            ctx.textAlign = 'center';
            let linkY = linkTop + 52;
            if (section.linkLabel) {
              ctx.font = `600 32px ${bodyFont}`;
              const labelText = `→ ${section.linkLabel}`;
              const labelLines = wrapText(ctx, labelText, colWidth);
              labelLines.forEach((line, li) => {
                ctx.fillStyle = CARD_COLORS.accent;
                ctx.fillText(line, centerX, linkY + li * 40);
              });
              linkY += labelLines.length * 40 + 6;
            }
            if (section.linkUrl) {
              ctx.font = `400 24px ${bodyFont}`;
              ctx.fillStyle = CARD_COLORS.inkTertiary;
              ctx.fillText(section.linkUrl, centerX, linkY);
            }
          }
        });

        // ---- Footer: brand line + disclaimer strip ----
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(51, 41, 31, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin, H - 330);
        ctx.lineTo(W - margin, H - 330);
        ctx.stroke();

        boldText('investingbuffalo.com', W / 2, H - 260, 44, CARD_COLORS.accent, 1.2);

        if (data.disclaimer) {
          ctx.font = `italic 400 38px ${bodyFont}`;
          ctx.fillStyle = CARD_COLORS.inkTertiary;
          const discLines = wrapText(ctx, data.disclaimer, W - margin * 2 - 160);
          const startY = H - 205;
          discLines.slice(0, 3).forEach((line, li) => {
            ctx.fillText(line, W / 2, startY + li * 46);
          });
        }
      }

      renderSheet();
      return new Promise((resolve) => {
        // Same warm-up-then-render-again trick as the other canvas
        // builders — document.fonts.ready resolving isn't a hard
        // guarantee the rasteriser has the glyphs ready yet.
        let done = false;
        function finish() {
          if (done) return;
          done = true;
          renderSheet();
          resolve(canvas);
        }
        requestAnimationFrame(() => requestAnimationFrame(finish));
        setTimeout(finish, 400);
      });
    });
  }

  // ---------- Generate / download ----------
  let lastUrl = null;

  generateBtn.addEventListener('click', () => {
    const data = collectData();
    if (!data.title) {
      setStatus('Add a sheet title first');
      return;
    }
    generateBtn.disabled = true;
    setStatus('Generating…', 0);
    buildStarterSheetCanvas(data)
      .then((canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png')))
      .then((blob) => {
        if (!blob) throw new Error('Could not create image');
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(blob);
        preview.src = lastUrl;
        previewWrap.classList.remove('hidden');
        downloadBtn.disabled = false;
        setStatus('Preview updated');
      })
      .catch(() => {
        setStatus('Could not generate the image — try again');
      })
      .finally(() => {
        generateBtn.disabled = false;
      });
  });

  downloadBtn.addEventListener('click', () => {
    if (!lastUrl) return;
    const link = document.createElement('a');
    link.href = lastUrl;
    link.download = 'uk-investing-starter-sheet.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus('Downloaded');
  });

  // ---------- Theme ----------
  function initTheme() {
    const saved = localStorage.getItem('cic-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
  }
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cic-theme', next);
  });
  initTheme();
})();
