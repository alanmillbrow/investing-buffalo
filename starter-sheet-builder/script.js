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
          <label for="s${index}-post-blurb">Post-section blurb</label>
          <span class="field-hint">A short closing line shown after body text 4, before the link</span>
          <textarea id="s${index}-post-blurb" data-section="${index}" data-role="postBlurb" rows="3"></textarea>
        </div>
        ${index === SECTION_COUNT - 1 ? `
        <div class="field">
          <label for="s${index}-link2-label">Second link label</label>
          <span class="field-hint">Appears above the main link below, as a blue button instead of red — e.g. an external account sign-up</span>
          <input type="text" id="s${index}-link2-label" data-section="${index}" data-role="linkLabel2">
        </div>
        <div class="field">
          <label for="s${index}-link2-url">Second link URL</label>
          <input type="text" id="s${index}-link2-url" data-section="${index}" data-role="linkUrl2" placeholder="https://...">
        </div>` : ''}
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
  const downloadPdfBtn = $('downloadPdfBtn');
  const exportDraftBtn = $('exportDraftBtn');
  const importDraftBtn = $('importDraftBtn');
  const importDraftFile = $('importDraftFile');
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
        postBlurb: get('postBlurb'),
        linkLabel2: get('linkLabel2'),
        linkUrl2: get('linkUrl2'),
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
      setVal('postBlurb', undefined, section.postBlurb);
      setVal('linkLabel2', undefined, section.linkLabel2);
      setVal('linkUrl2', undefined, section.linkUrl2);
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
    if (!window.confirm('Clear all fields and the saved text? This can’t be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    sheetTitleInput.value = 'UK Investing Starter Sheet';
    introInput.value = '';
    disclaimerInput.value = '';
    applyData({ sections: DEFAULT_SECTIONS.map((s) => ({ heading: s.heading, items: [], linkLabel: '', linkUrl: '' })) });
    document.querySelectorAll('[data-role="blurb"], [data-role="subheading"], [data-role="body"], [data-role="postBlurb"], [data-role="linkLabel2"], [data-role="linkUrl2"], [data-role="linkLabel"], [data-role="linkUrl"]')
      .forEach((el) => { el.value = ''; });
    setStatus('Text cleared');
  });

  // Draft only lives in this browser's localStorage — export/import
  // moves it to another browser or computer without needing a backend.
  exportDraftBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(collectData(), null, 2)], { type: 'application/json' });
    triggerDownload(blob, 'starter-sheet-text.json');
    setStatus('Text exported');
  });

  importDraftBtn.addEventListener('click', () => {
    importDraftFile.value = '';
    importDraftFile.click();
  });

  importDraftFile.addEventListener('change', () => {
    const file = importDraftFile.files[0];
    if (!file) return;
    file.text()
      .then((text) => {
        const data = JSON.parse(text);
        applyData(data);
        scheduleSave();
        setStatus('Text imported');
      })
      .catch(() => {
        setStatus('Could not import that file — is it a starter sheet text export?');
      });
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
    accentText: '#f2e9d8',
  };

  // Fixed QR code linking to investingbuffalo.com, drawn on every sheet.
  // Pre-generated module matrix (version 3, error correction M) rather
  // than built at runtime — there's no QR-encoding library on this
  // static site, and the target URL never changes. Verified to decode
  // correctly (with a standard 4-module quiet zone added) before being
  // hard-coded here; drawn as vector rects in renderSheet() rather than
  // a bitmap so it stays crisp at the sheet's full resolution.
  const QR_MATRIX = [
    '11111110001000100111001111111',
    '10000010011000001110101000001',
    '10111010011110110110001011101',
    '10111010001001001011001011101',
    '10111010000110000110001011101',
    '10000010110000011111101000001',
    '11111110101010101010101111111',
    '00000000011001011111100000000',
    '10010110101000101010010100000',
    '10001000100101011000101001001',
    '11010010111011110101100111110',
    '01111001100011001000001100110',
    '01000111100100110100111001011',
    '11001101001011111101100000000',
    '10111110111111100010111101111',
    '00110101101110010111110001010',
    '10011011010011000101010100010',
    '01110101111011111100011101001',
    '10100110110100111100100000011',
    '00001100010100100111001010011',
    '10011110101110010000111110100',
    '00000000110010110001100010111',
    '11111110001100001000101010010',
    '10000010111000110010100011100',
    '10111010000100001110111110010',
    '10111010111000010001101111101',
    '10111010000111011001000011101',
    '10000010001011001111101000010',
    '11111110110010110010101001010',
  ];

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

  // URLs have no spaces for wrapText's word-splitting to break on, so a
  // long one was previously drawn as a single unbroken line that could
  // run past the column edge and overlap the next section — this was
  // the actual "links don't work properly" bug. Break at the natural
  // URL wrap points (after /, ., -, _) instead, same greedy packing.
  function wrapUrlText(ctx, text, maxWidth) {
    if (!text) return [];
    const chunks = text.match(/[^/.\-_]*[/.\-_]|[^/.\-_]+$/g) || [text];
    const lines = [];
    let line = '';
    chunks.forEach((chunk) => {
      const test = line + chunk;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = chunk;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
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

      // Solid, full-column-width button — the same fixed box shape
      // (position, width, corner radius) every time it's used, with the
      // label always centred inside it, since the sheet is a static
      // image, not a clickable page, and the button shape itself has to
      // carry the "this is a link" meaning. Shared by the main link
      // button (every section) and the second, blue link button
      // (section 4 only) so both stay pixel-identical in format.
      function measureLinkButtonHeight(label, width) {
        if (!label) return 110;
        ctx.font = `600 44px ${bodyFont}`;
        const labelText = `${label}  →`;
        const lines = wrapText(ctx, labelText, width - 90).slice(0, 2);
        return lines.length * 54 + 56;
      }

      // Full space a button+URL block actually occupies, from the
      // button's top to just past its last URL line — used to stack a
      // second block above it without the URL text landing on/under
      // whatever comes next.
      function measureLinkBlockHeight(label, url, width) {
        const btnHeight = measureLinkButtonHeight(label, width);
        if (!url) return btnHeight;
        ctx.font = `400 28px ${bodyFont}`;
        const urlLines = wrapUrlText(ctx, url, width).slice(0, 2);
        return btnHeight + 46 + (urlLines.length - 1) * 34 + 20;
      }

      function drawLinkButton(x, width, centerX, top, label, url, fillColor) {
        ctx.textAlign = 'center';
        let labelLines = [];
        if (label) {
          ctx.font = `600 44px ${bodyFont}`;
          const labelText = `${label}  →`;
          labelLines = wrapText(ctx, labelText, width - 90).slice(0, 2);
        }
        const height = measureLinkButtonHeight(label, width);

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.roundRect(x, top, width, height, 16);
        ctx.fill();

        if (url) {
          linkRegions.push({ x, y: top, width, height, url });
        }

        if (labelLines.length) {
          const textBlockHeight = labelLines.length * 54;
          const firstBaselineY = top + (height - textBlockHeight) / 2 + 38;
          ctx.fillStyle = CARD_COLORS.accentText;
          labelLines.forEach((line, li) => {
            ctx.fillText(line, centerX, firstBaselineY + li * 54);
          });
        }

        let linkY = top + height + 46;
        if (url) {
          ctx.font = `400 28px ${bodyFont}`;
          ctx.fillStyle = CARD_COLORS.inkSecondary;
          const urlLines = wrapUrlText(ctx, url, width).slice(0, 2);
          urlLines.forEach((line, li) => {
            ctx.fillText(line, centerX, linkY + li * 34);
          });
        }

        return height;
      }

      // Rebuilt fresh on every renderSheet() call below — records each
      // section's button as a pixel-space rect (canvas coordinates,
      // top-left origin) so the PDF export can turn it into a real
      // clickable link annotation over the same area.
      let linkRegions = [];

      function renderSheet() {
        linkRegions = [];
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
        const contentTop = Math.max(660, introBottom + 110);
        const contentBottom = H - 400;
        const linkBlockHeight = 210;
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
          y += 102;

          // Section blurb — a short intro line before the subheadings start
          if (section.blurb) {
            ctx.textAlign = 'left';
            ctx.font = `400 44px ${bodyFont}`;
            const blurbLines = wrapText(ctx, section.blurb, colWidth);
            blurbLines.forEach((line, li) => {
              ctx.fillStyle = CARD_COLORS.inkSecondary;
              ctx.fillText(line, colX, y + li * 52);
            });
            y += blurbLines.length * 52 + 30;
          }

          // Sub-items — only the ones with something in them
          const items = section.items.filter((it) => it.subheading || it.body);
          items.forEach((item) => {
            if (item.subheading) {
              ctx.textAlign = 'left';
              ctx.font = `600 44px ${bodyFont}`;
              const subLines = wrapText(ctx, item.subheading, colWidth);
              subLines.forEach((line, li) => {
                ctx.fillStyle = CARD_COLORS.ink;
                ctx.fillText(line, colX, y + li * 52);
              });
              y += subLines.length * 52 + 10;
            }
            if (item.body) {
              ctx.textAlign = 'left';
              ctx.font = `400 44px ${bodyFont}`;
              const bodyLines = wrapText(ctx, item.body, colWidth);
              bodyLines.forEach((line, li) => {
                ctx.fillStyle = CARD_COLORS.inkSecondary;
                ctx.fillText(line, colX, y + li * 52);
              });
              y += bodyLines.length * 52;
            }
            y += 40;
          });

          // Post-section blurb — same treatment as the section blurb,
          // but after the last body text instead of before the first
          // subheading.
          if (section.postBlurb) {
            ctx.textAlign = 'left';
            ctx.font = `400 44px ${bodyFont}`;
            const postBlurbLines = wrapText(ctx, section.postBlurb, colWidth);
            postBlurbLines.forEach((line, li) => {
              ctx.fillStyle = CARD_COLORS.inkSecondary;
              ctx.fillText(line, colX, y + li * 52);
            });
            y += postBlurbLines.length * 52 + 30;
          }

          // Second link — section 4 only, a blue button sitting directly
          // above the main red one. Positioned by its own height so the
          // main button's Y stays exactly where every other section's
          // main button is (still pinned/aligned across all four
          // columns); the second button just grows upward from there.
          if (i === SECTION_COUNT - 1 && (section.linkLabel2 || section.linkUrl2)) {
            const secondaryGap = 40;
            const secondaryBlockHeight = measureLinkBlockHeight(section.linkLabel2, section.linkUrl2, colWidth);
            const secondaryTop = linkTop - secondaryGap - secondaryBlockHeight;
            drawLinkButton(colX, colWidth, centerX, secondaryTop, section.linkLabel2, section.linkUrl2, '#5C7A8A');
          }

          // Main link — pinned to the same Y in every column regardless
          // of how much (or little) sits above it, so all four line up.
          if (section.linkLabel || section.linkUrl) {
            drawLinkButton(colX, colWidth, centerX, linkTop, section.linkLabel, section.linkUrl, CARD_COLORS.accent);
          }
        });

        // ---- Footer: brand line + disclaimer strip + closing ornament ----
        // Divider/brand/disclaimer back at their original fixed offsets
        // from H. The tailpiece below (mirroring .page-ornament-close
        // from the rest of the site) fills what used to be dead space
        // under a short disclaimer, so a fixed layout looks intentional
        // again instead of leaving a gap.
        ctx.textAlign = 'center';
        const dividerY = H - 330;
        ctx.strokeStyle = 'rgba(51, 41, 31, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin, dividerY);
        ctx.lineTo(W - margin, dividerY);
        ctx.stroke();

        const brandPrefix = 'For more, visit ';
        const brandLabel = 'investingbuffalo.com';
        const brandY = H - 260;
        const brandSize = 44;

        ctx.textAlign = 'left';
        ctx.font = `400 ${brandSize}px ${serif}`;
        const prefixWidth = ctx.measureText(brandPrefix).width;
        const brandWidth = ctx.measureText(brandLabel).width;
        const brandStartX = W / 2 - (prefixWidth + brandWidth) / 2;

        ctx.fillStyle = CARD_COLORS.ink;
        ctx.fillText(brandPrefix, brandStartX, brandY);
        boldText(brandLabel, brandStartX + prefixWidth, brandY, brandSize, CARD_COLORS.accent, 1.2);
        ctx.textAlign = 'center';

        linkRegions.push({
          x: brandStartX + prefixWidth - 16,
          y: brandY - brandSize * 0.85,
          width: brandWidth + 32,
          height: brandSize * 1.15,
          url: 'https://investingbuffalo.com/',
        });

        ctx.font = `italic 400 38px ${bodyFont}`;
        const discLineHeight = 46;
        const discStartY = H - 205;
        // Capped at 2 (not 3) lines now that the tailpiece sits right
        // below — a 3rd line would leave it no room before the border.
        // Narrower than the plain margin*2-160 width so a long centred
        // line can't reach into the QR code's corner on the right.
        const discLines = data.disclaimer
          ? wrapText(ctx, data.disclaimer, W - margin * 2 - 420).slice(0, 2)
          : [];
        if (discLines.length) {
          ctx.fillStyle = CARD_COLORS.ink;
          discLines.forEach((line, li) => {
            ctx.fillText(line, W / 2, discStartY + li * discLineHeight);
          });
        }

        // ---- Closing ornament (tailpiece) ----
        // Mirrors .page-ornament-close elsewhere on the site: a small
        // buffalo mark flanked by two short rules, centred beneath the
        // disclaimer. Positioned relative to the disclaimer's actual
        // last line so it still sits right below the text whether the
        // disclaimer is one line or two.
        const discLastBaseline = discLines.length ? discStartY + (discLines.length - 1) * discLineHeight : discStartY - 20;
        const ornamentY = discLastBaseline + 62;
        const ornamentIconSize = 40;
        const ornamentHalfIcon = ornamentIconSize / 2;
        const ornamentRuleWidth = 110;
        const ornamentRuleGap = 36;

        ctx.strokeStyle = 'rgba(51, 41, 31, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W / 2 - ornamentHalfIcon - ornamentRuleGap - ornamentRuleWidth, ornamentY);
        ctx.lineTo(W / 2 - ornamentHalfIcon - ornamentRuleGap, ornamentY);
        ctx.moveTo(W / 2 + ornamentHalfIcon + ornamentRuleGap, ornamentY);
        ctx.lineTo(W / 2 + ornamentHalfIcon + ornamentRuleGap + ornamentRuleWidth, ornamentY);
        ctx.stroke();
        ctx.drawImage(buffalo, W / 2 - ornamentHalfIcon, ornamentY - ornamentHalfIcon, ornamentIconSize, ornamentIconSize);

        // ---- QR code, bottom-right corner ----
        // A self-contained square: its own 4-module quiet zone is
        // baked into qrSize, and qrGap (the same value on all three
        // open sides) is extra breathing room beyond that on top of
        // the border/divider — never less than what the code needs to
        // scan reliably.
        const qrModuleSize = 5;
        const qrQuietZoneModules = 4;
        const qrTotalModules = QR_MATRIX.length + qrQuietZoneModules * 2;
        const qrSize = qrTotalModules * qrModuleSize;
        const footerBandHeight = (H - 80) - dividerY;
        const qrGap = (footerBandHeight - qrSize) / 2;
        const qrLeft = (W - 80) - qrGap - qrSize;
        const qrTop = dividerY + qrGap;

        ctx.fillStyle = CARD_COLORS.ink;
        QR_MATRIX.forEach((row, r) => {
          for (let c = 0; c < row.length; c++) {
            if (row[c] === '1') {
              ctx.fillRect(
                qrLeft + (c + qrQuietZoneModules) * qrModuleSize,
                qrTop + (r + qrQuietZoneModules) * qrModuleSize,
                qrModuleSize,
                qrModuleSize
              );
            }
          }
        });

        linkRegions.push({
          x: qrLeft,
          y: qrTop,
          width: qrSize,
          height: qrSize,
          url: 'https://investingbuffalo.com/',
        });
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
          canvas.linkRegions = linkRegions;
          resolve(canvas);
        }
        requestAnimationFrame(() => requestAnimationFrame(finish));
        setTimeout(finish, 400);
      });
    });
  }

  // ---------- Generate / download ----------
  let lastUrl = null;
  let lastCanvas = null;

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  generateBtn.addEventListener('click', () => {
    const data = collectData();
    if (!data.title) {
      setStatus('Add a sheet title first');
      return;
    }
    generateBtn.disabled = true;
    setStatus('Generating…', 0);
    buildStarterSheetCanvas(data)
      .then((canvas) => {
        lastCanvas = canvas;
        return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      })
      .then((blob) => {
        if (!blob) throw new Error('Could not create image');
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(blob);
        preview.src = lastUrl;
        previewWrap.classList.remove('hidden');
        downloadBtn.disabled = false;
        downloadPdfBtn.disabled = false;
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

  // ---------- PDF export ----------
  // No PDF library — the sheet is always a single full-bleed image, so
  // it's a single-page PDF with one JPEG XObject, hand-built to the
  // spec (a handful of indirect objects + an xref table). JPEG (not
  // PNG) so the stream can be embedded as-is via /DCTDecode with no
  // need to implement zlib/deflate in the browser.
  function pdfEscapeString(str) {
    return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function normalizeLinkUrl(url) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  function buildSingleImagePdf(jpegBytes, pixelWidth, pixelHeight, linkRegions) {
    const PRINT_DPI = 150; // physical page size only — the embedded image keeps its full pixel detail
    const ptPerPx = 72 / PRINT_DPI;
    const pageWidth = pixelWidth * ptPerPx;
    const pageHeight = pixelHeight * ptPerPx;
    const enc = new TextEncoder();
    const chunks = [];
    let offset = 0;
    const offsets = [];
    function write(part) {
      const bytes = typeof part === 'string' ? enc.encode(part) : part;
      chunks.push(bytes);
      offset += bytes.length;
    }
    function startObj(n) {
      offsets[n] = offset;
      write(`${n} 0 obj\n`);
    }

    // Each button drawn on the sheet becomes a real clickable /Link
    // annotation over the same area — object numbers 6+, one per link,
    // referenced from the page's /Annots array. Rects convert from
    // canvas pixels (top-left origin, y down) to PDF points (bottom-
    // left origin, y up).
    const links = (linkRegions || []).filter((r) => r.url);
    const annotNums = links.map((_, i) => 6 + i);
    const totalObjects = 5 + links.length;

    write('%PDF-1.4\n');

    startObj(1);
    write('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    startObj(2);
    write('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    startObj(3);
    const annotsEntry = annotNums.length ? ` /Annots [${annotNums.map((n) => `${n} 0 R`).join(' ')}]` : '';
    write(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R${annotsEntry} >>\nendobj\n`
    );

    startObj(4);
    write(
      `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    );
    write(jpegBytes);
    write('\nendstream\nendobj\n');

    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
    startObj(5);
    write(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

    links.forEach((region, i) => {
      const x1 = region.x * ptPerPx;
      const x2 = (region.x + region.width) * ptPerPx;
      const y2 = pageHeight - region.y * ptPerPx;
      const y1 = pageHeight - (region.y + region.height) * ptPerPx;
      const uri = pdfEscapeString(normalizeLinkUrl(region.url));
      startObj(annotNums[i]);
      write(
        `<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] ` +
        `/A << /Type /Action /S /URI /URI (${uri}) >> >>\nendobj\n`
      );
    });

    const xrefStart = offset;
    write(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
    for (let n = 1; n <= totalObjects; n++) {
      write(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
    }
    write(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

    return new Blob(chunks, { type: 'application/pdf' });
  }

  downloadPdfBtn.addEventListener('click', () => {
    if (!lastCanvas) return;
    downloadPdfBtn.disabled = true;
    setStatus('Building PDF…', 0);
    lastCanvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus('Could not build the PDF — try again');
          downloadPdfBtn.disabled = false;
          return;
        }
        blob.arrayBuffer().then((buf) => {
          const pdfBlob = buildSingleImagePdf(new Uint8Array(buf), lastCanvas.width, lastCanvas.height, lastCanvas.linkRegions);
          triggerDownload(pdfBlob, 'uk-investing-starter-sheet.pdf');
          setStatus('Downloaded PDF');
          downloadPdfBtn.disabled = false;
        });
      },
      'image/jpeg',
      0.92
    );
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
