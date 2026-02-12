// ==UserScript==
// @name         Claude SVG to PNG Exporter
// @namespace    http://tampermonkey.net/
// @version      1.1.0
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
    let wasInPreviewMode = false;

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

    // Switch to Code view to access SVG
    function switchToCodeView() {
        const codeButton = Array.from(document.querySelectorAll('button, [role="radio"]')).find(
            btn => btn.textContent === 'Code' || btn.getAttribute('aria-label')?.includes('Code')
        );
        
        if (codeButton) {
            const previewButton = Array.from(document.querySelectorAll('button, [role="radio"]')).find(
                btn => btn.textContent === 'Aperçu' || btn.textContent === 'Preview'
            );
            wasInPreviewMode = previewButton?.getAttribute('aria-checked') === 'true';
            
            codeButton.click();
            return true;
        }
        return false;
    }

    // Switch back to Preview view
    function switchToPreviewView() {
        if (wasInPreviewMode) {
            const previewButton = Array.from(document.querySelectorAll('button, [role="radio"]')).find(
                btn => btn.textContent === 'Aperçu' || btn.textContent === 'Preview'
            );
            if (previewButton) {
                previewButton.click();
            }
        }
        wasInPreviewMode = false;
    }

    // Get SVG code from the artifact viewer
    function getSVGCode() {
        // Try to get from Code view first
        const codeEditor = document.querySelector('pre code') || 
                          document.querySelector('pre') || 
                          Array.from(document.querySelectorAll('div')).find(
                              div => div.textContent.includes('<svg') && div.textContent.includes('</svg>')
                          );
        
        if (codeEditor && codeEditor.textContent.includes('<svg')) {
            const text = codeEditor.textContent;
            // Extract just the SVG portion
            const svgMatch = text.match(/<svg[\\s\\S]*<\\/svg>/);
            if (svgMatch) {
                return svgMatch[0];
            }
            return text;
        }

        return null;
    }

    // Generate filename from SVG title or artifact name
    function generateFilename() {
        // Try to get the artifact title
        const titleElement = document.querySelector('[class*="artifact"] [class*="title"]') ||
                           document.querySelector('h1') ||
                           document.querySelector('h2');
        
        let title = 'svg-export';
        
        if (titleElement) {
            const text = titleElement.textContent.trim();
            // Look for the artifact name (usually before "SVG" or other labels)
            const match = text.match(/^([^·•\\n]+)/);
            if (match) {
                title = match[1].trim();
            }
        }
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const cleanTitle = title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 50);
        
        return `${cleanTitle}-${timestamp}-${currentQuality}.png`;
    }

    // Main export function
    async function exportSVGtoPNG() {
        exportButton.textContent = '⏳ Switching to Code view...';
        exportButton.disabled = true;

        // Switch to Code view to access SVG
        switchToCodeView();
        
        // Wait for Code view to load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const svgCode = getSVGCode();
        
        if (!svgCode) {
            alert('No SVG found! Make sure an SVG artifact is visible.');
            exportButton.textContent = '📥 Export SVG to PNG';
            exportButton.disabled = false;
            switchToPreviewView();
            return;
        }

        exportButton.textContent = '⏳ Converting...';

        const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const img = new Image();
        const scale = QUALITY_PRESETS[currentQuality];

        img.onload = function() {
            // Extract dimensions from viewBox or use image dimensions
            const viewBoxMatch = svgCode.match(/viewBox=["']([^"']+)["']/);
            let width, height;

            if (viewBoxMatch) {
                const parts = viewBoxMatch[1].split(/\\s+/);
                width = parseFloat(parts[2]);
                height = parseFloat(parts[3]);
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
                    switchToPreviewView();
                }, 2000);
            }, 'image/png', 1.0);
        };

        img.onerror = function() {
            alert('Error loading SVG. Please try again.');
            exportButton.textContent = '📥 Export SVG to PNG';
            exportButton.disabled = false;
            switchToPreviewView();
            URL.revokeObjectURL(url);
        };

        img.src = url;
    }

    // Watch for SVG artifacts
    function checkForSVG() {
        // Look for SVG indicator in the page
        const hasSVGArtifact = document.body.textContent.includes('SVG') && 
                              (document.querySelector('[role="region"]') || 
                               document.querySelector('iframe[title*="artifact"]') ||
                               Array.from(document.querySelectorAll('*')).some(el => 
                                   el.textContent.includes('Image') && el.textContent.includes('SVG')
                               ));

        const ui = document.getElementById('svg-export-ui');
        
        if (hasSVGArtifact && ui) {
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