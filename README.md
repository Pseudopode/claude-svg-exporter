# Claude SVG to PNG Exporter

A Tampermonkey userscript that adds a convenient export button to Claude.ai for converting SVG artifacts to high-resolution PNG images.

## Features

- 🎯 Auto-detects SVG artifacts on Claude.ai
- 📥 One-click export to PNG
- 🎨 Multiple quality presets (1x to 8x, default 2x)
- 📝 Smart filename generation from artifact title
- 🚀 Non-intrusive floating UI

## Installation

### Prerequisites
- A browser extension for userscripts:
  - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Safari, Edge)
  - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox)
  - [Greasemonkey](https://www.greasespot.net/) (Firefox)

### Install the Script

1. Install Tampermonkey (or another userscript manager)
2. Click this link: [Install claude-svg-exporter.user.js](https://raw.githubusercontent.com/Pseudopode/claude-svg-exporter/main/claude-svg-exporter.user.js)
3. Click "Install" in the Tampermonkey dialog

Or manually:
1. Open Tampermonkey Dashboard
2. Click the "+" icon to create a new script
3. Copy and paste the contents of `claude-svg-exporter.user.js`
4. Save (Ctrl+S or Cmd+S)

## Usage

1. Open [Claude.ai](https://claude.ai)
2. Create or view a conversation with an SVG artifact
3. A floating export button will appear in the bottom-right corner
4. Select your desired quality preset (2x is default)
5. Click "📥 Export SVG to PNG"
6. The PNG will download automatically with a smart filename

## Quality Presets

- **1x** - Original size
- **2x** - 2× resolution (default, good balance)
- **3x** - 3× resolution
- **4x** - 4× resolution
- **6x** - 6× resolution (very high quality)
- **8x** - 8× resolution (print quality)

## Filename Format

`artifact-title-YYYY-MM-DD-Nx.png`

Example: `nvidia-physical-ai-stack-2026-02-04-2x.png`

## Troubleshooting

**Export button doesn't appear:**
- Make sure you have an SVG artifact visible in Claude
- Refresh the page
- Check that Tampermonkey is enabled for claude.ai

**Export fails:**
- Try clicking the "Code" tab in the artifact viewer first
- Some complex SVGs may need to be viewed in Code mode to export

**Low quality output:**
- Increase the quality preset (try 4x or 6x)
- Note that very high presets (8x) may be slow for large SVGs

## Development
```bash
# Clone the repository
git clone https://github.com/Pseudopode/claude-svg-exporter.git
cd claude-svg-exporter

# Make changes to claude-svg-exporter.user.js

# Test by copying to Tampermonkey
```

## License

MIT License - Feel free to modify and distribute

## Contributing

Issues and pull requests welcome!

## Changelog

### 1.0.0 (2026-02-04)
- Initial release
- SVG detection and export
- Quality presets (1x-8x)
- Smart filename generation
