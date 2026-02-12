// ==UserScript==
// @name         Claude SVG to PNG Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Export Claude AI SVG artifacts to high-resolution PNG with one click
// @author       Your Name
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const QUALITY_PRESETS = {
        '1x': 1,
        '2x': 2,
        '3x': 3,
        '4x': 4,
        '6x': 6,
        '8x': 8
    };

    let currentQuality = '2x';
    let exportButton = null;
    let qualitySelector = null;

    // Create the export UI
    function createExportUI() {
        const container = document.createElement('div');
        container.id = 'svg-export-ui';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: rgba(255, 255, 255, 0.95);
            border: 2px solid #2196F3;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: none;
        `;

        // Quality selector
        qualitySelector = document.createElement('select');
        qualitySelector.style.cssText = `
            padding: 6px 10px;
            margin-right: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
        `;
        
        Object.keys(QUALITY_PRESETS).forEach(preset => {
            const option = document.createElement('option');
            option.value = preset;
            option.textContent = preset;
            if (preset === currentQuality) option.selected = true;
            qualitySelector.appendChild(option);
        });

        qualitySelector.addEventListener('change', (e) => {
            currentQuality = e.target.value;
        });

        // Export button
        exportButton = document.createElement('button');
        exportButton.textContent = '📥 Export SVG to PNG';
        exportButton.style.cssText = `
            padding: 8px 16px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        `;

        exportButton.addEventListener('mouseenter', () => {
            exportButton.style.background = '#1976D2';
        });

        exportButton.addEventListener('mouseleave', () => {
            exportButton.style.background = '#2196F3';
        });

        exportButton.addEventListener('click', exportSVGtoPNG);

        container.appendChild(qualitySelector);
        container.appendChild(exportButton);
        document.body.appendChild(container);

        return container;
    }

    // Get SVG code from the artifact viewer
    function getSVGCode() {
        // Try to get from Code view
        const codeEditor = document.querySelector('pre code') || 
                          document.querySelector('pre') || 
                          document.querySelector('[class*="code"]');
        
        if (codeEditor && codeEditor.textContent.includes('<svg')) {
            return codeEditor.textContent;
        }

        // Try to get from DOM
        const artifactIframe = Array.from(document.querySelectorAll('iframe')).find(
            iframe => iframe.getBoundingClientRect().width > 500
        );

        if (artifactIframe) {
            try {
                const svgElement = artifactIframe.contentDocument?.querySelector('svg');
                if (svgElement) {
                    return new XMLSerializer().serializeToString(svgElement);
                }
            } catch (e) {
                console.log('Cannot access iframe content (CORS)');
            }
        }

        return null;
    }

    // Generate filename from SVG title or artifact name
    function generateFilename() {
        const titleElement = document.querySelector('[class*="artifact"] h1, [class*="artifact"] h2');
        const title = titleElement?.textContent?.trim() || 'svg-export';
        const timestamp = new Date().toISOString().slice(0, 10);
        const cleanTitle = title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 50);
        
        return `${cleanTitle}-${timestamp}-${currentQuality}.png`;
    }

    // Main export function
    function exportSVGtoPNG() {
        const svgCode = getSVGCode();
        
        if (!svgCode) {
            alert('No SVG found! Make sure an SVG artifact is visible or open the Code view.');
            return;
        }

        exportButton.textContent = '⏳ Exporting...';
        exportButton.disabled = true;

        const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const img = new Image();
        const scale = QUALITY_PRESETS[currentQuality];

        img.onload = function() {
            // Extract dimensions from viewBox or use image dimensions
            const viewBoxMatch = svgCode.match(/viewBox=["']([^"']+)["']/);
            let width, height;

            if (viewBoxMatch) {
                const [, , , vbWidth, vbHeight] = viewBoxMatch[1].split(/\\s+/);
                width = parseFloat(vbWidth);
                height = parseFloat(vbHeight);
            } else {
                width = img.width;
                height = img.height;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(function(pngBlob) {
                const pngUrl = URL.createObjectURL(pngBlob);
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = generateFilename();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setTimeout(() => {
                    URL.revokeObjectURL(pngUrl);
                    URL.revokeObjectURL(url);
                }, 100);

                exportButton.textContent = '✅ Exported!';
                setTimeout(() => {
                    exportButton.textContent = '📥 Export SVG to PNG';
                    exportButton.disabled = false;
                }, 2000);
            }, 'image/png', 1.0);
        };

        img.onerror = function() {
            alert('Error loading SVG. Try switching to Code view first.');
            exportButton.textContent = '📥 Export SVG to PNG';
            exportButton.disabled = false;
            URL.revokeObjectURL(url);
        };

        img.src = url;
    }

    // Watch for SVG artifacts
    function checkForSVG() {
        const artifactViewer = document.querySelector('[class*="artifact"]');
        const svgIndicator = document.querySelector('[class*="SVG"]') || 
                           document.querySelector('button:not([disabled])');
        
        const hasSVG = artifactViewer && (
            document.querySelector('svg') ||
            document.body.textContent.includes('SVG') ||
            document.querySelector('[role="region"]')
        );

        const ui = document.getElementById('svg-export-ui');
        
        if (hasSVG && ui) {
            ui.style.display = 'block';
        } else if (ui) {
            ui.style.display = 'none';
        }
    }

    // Initialize
    function init() {
        createExportUI();
        
        // Check periodically for SVG artifacts
        setInterval(checkForSVG, 1000);
        
        // Also check on DOM changes
        const observer = new MutationObserver(checkForSVG);
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
