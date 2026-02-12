// ==UserScript==
// @name         Claude SVG to PNG Exporter
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Export Claude AI SVG artifacts to high-resolution PNG with one click
// @author       Your Name
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ── Config ──────────────────────────────────────────────
    const PRESETS = { '1x': 1, '2x': 2, '3x': 3, '4x': 4, '6x': 6, '8x': 8 };
    const DEFAULT_PRESET = '2x';

    let currentPreset = DEFAULT_PRESET;
    let btnExport = null;

    // ── UI ──────────────────────────────────────────────────
    function createUI() {
        if (document.getElementById('svg-export-ui')) return;

        const wrap = document.createElement('div');
        wrap.id = 'svg-export-ui';
        wrap.style.cssText = `
            position:fixed; bottom:20px; right:20px; z-index:10000;
            background:rgba(255,255,255,.96); border:2px solid #2563eb;
            border-radius:10px; padding:10px 14px; display:none;
            box-shadow:0 4px 16px rgba(0,0,0,.13);
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
            display:none; align-items:center; gap:8px;
        `;

        const sel = document.createElement('select');
        sel.style.cssText = `
            padding:6px 8px; border:1px solid #d1d5db; border-radius:6px;
            font-size:14px; cursor:pointer; background:#fff;
        `;
        Object.keys(PRESETS).forEach(k => {
            const o = document.createElement('option');
            o.value = k; o.textContent = k;
            if (k === DEFAULT_PRESET) o.selected = true;
            sel.appendChild(o);
        });
        sel.addEventListener('change', e => { currentPreset = e.target.value; });

        btnExport = document.createElement('button');
        btnExport.textContent = '📥 Export SVG to PNG';
        btnExport.style.cssText = `
            padding:8px 16px; background:#2563eb; color:#fff; border:none;
            border-radius:6px; font-size:14px; font-weight:600; cursor:pointer;
            transition:background .15s;
        `;
        btnExport.onmouseenter = () => { btnExport.style.background = '#1d4ed8'; };
        btnExport.onmouseleave = () => { btnExport.style.background = '#2563eb'; };
        btnExport.addEventListener('click', doExport);

        wrap.appendChild(sel);
        wrap.appendChild(btnExport);
        document.body.appendChild(wrap);
    }

    // ── Helpers ─────────────────────────────────────────────

    /** Find the Code / Preview radio buttons by aria-label */
    function getToggleButtons() {
        const all = document.querySelectorAll('button[role="radio"]');
        let code = null, preview = null;
        all.forEach(b => {
            const label = (b.getAttribute('aria-label') || '').toLowerCase();
            if (label === 'code') code = b;
            if (label === 'aperçu' || label === 'preview') preview = b;
        });
        return { code, preview };
    }

    /** Is the artifact panel currently showing an SVG? */
    function hasSVGArtifact() {
        const h2s = document.querySelectorAll('h2');
        for (const h of h2s) {
            const r = h.getBoundingClientRect();
            if (r.left > 300 && r.top > -10 && r.top < 60 && h.textContent.includes('SVG')) return true;
        }
        return false;
    }

    /** Build a clean filename from the artifact title */
    function makeFilename() {
        let title = 'svg-export';
        const h2s = document.querySelectorAll('h2');
        for (const h of h2s) {
            const r = h.getBoundingClientRect();
            if (r.left > 300 && r.top > -10 && r.top < 60) {
                title = h.textContent.replace(/·.*$/, '').trim();
                break;
            }
        }
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
        const date = new Date().toISOString().slice(0, 10);
        return `${slug}-${date}-${currentPreset}.png`;
    }

    /** Wait ms milliseconds */
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // ── Core export logic ───────────────────────────────────
    async function doExport() {
        btnExport.textContent = '⏳ Reading SVG…';
        btnExport.disabled = true;

        const { code: codeBtn, preview: previewBtn } = getToggleButtons();

        // Remember if we were in Preview so we can switch back
        const wasPreview = previewBtn?.getAttribute('aria-checked') === 'true';

        // Switch to Code view
        if (codeBtn) {
            codeBtn.click();
            await wait(600);                       // let the DOM render
        }

        // Grab SVG source from code.language-svg (or language-xml / language-html)
        let svgCode = null;
        const codeEl = document.querySelector('code.language-svg')
                    || document.querySelector('code.language-xml')
                    || document.querySelector('code.language-html');

        if (codeEl) {
            const raw = codeEl.textContent;
            const m = raw.match(/<svg[\\s\\S]*<\\/svg>/);
            svgCode = m ? m[0] : (raw.includes('<svg') ? raw : null);
        }

        // If still nothing, try a broader sweep
        if (!svgCode) {
            const allCode = document.querySelectorAll('code');
            for (const c of allCode) {
                if (c.textContent.includes('<svg') && c.textContent.includes('</svg>')) {
                    const m = c.textContent.match(/<svg[\\s\\S]*<\\/svg>/);
                    if (m) { svgCode = m[0]; break; }
                }
            }
        }

        // Switch back to Preview
        if (wasPreview && previewBtn) {
            previewBtn.click();
        }

        if (!svgCode) {
            alert('No SVG code found. Make sure an SVG artifact is open in the viewer.');
            resetButton();
            return;
        }

        // ── Convert to PNG ──────────────────────────────────
        btnExport.textContent = '⏳ Converting…';

        const scale = PRESETS[currentPreset];
        const vbMatch = svgCode.match(/viewBox=["']([^"']+)["']/);
        let w = 800, h = 600;
        if (vbMatch) {
            const p = vbMatch[1].split(/[\\s,]+/);
            w = parseFloat(p[2]) || w;
            h = parseFloat(p[3]) || h;
        }

        const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = w * scale;
            canvas.height = h * scale;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob(pngBlob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(pngBlob);
                a.download = makeFilename();
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(a.href);
                URL.revokeObjectURL(url);

                btnExport.textContent = '✅ Done!';
                setTimeout(resetButton, 2000);
            }, 'image/png', 1.0);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            alert('Failed to render SVG to image. The SVG may use unsupported features.');
            resetButton();
        };

        img.src = url;
    }

    function resetButton() {
        btnExport.textContent = '📥 Export SVG to PNG';
        btnExport.disabled = false;
    }

    // ── Visibility watcher ──────────────────────────────────
    function tick() {
        const ui = document.getElementById('svg-export-ui');
        if (!ui) return;
        ui.style.display = hasSVGArtifact() ? 'flex' : 'none';
    }

    // ── Init ────────────────────────────────────────────────
    function init() {
        createUI();
        setInterval(tick, 800);
        new MutationObserver(tick).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
