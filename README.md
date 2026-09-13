# Denta Care — Modern Dentistry & Advanced Technology Website

An interactive, high-performance dental clinic landing page featuring smooth 3D scroll/scrub animation, modern aesthetics, responsive Tailwind layouts, and zero-dependency local hosting.

---

## 🚀 Quick Start (Run the Website)

### Option 1: Using Node.js (Recommended)

1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. In the project root directory, run:
   ```bash
   npm start
   ```
   *(or `node server.js`)*
3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Option 2: Using Any Static File Server

Because HTML5 canvas requires local image fetching without CORS/taint restrictions, serve the folder through a local HTTP server:
- **VS Code**: Use the *Live Server* extension.
- **Python**: Run `python -m http.server 3000`
- **npx serve**: Run `npx serve .`

---

## ✨ Features

- **Interactive 3D Scrubbing Animation**: 240 high-definition frames synced with page scroll and user interactions.
- **Modern Responsive Design**: Clean aesthetics, glassmorphism cards, micro-interactions, and mobile navigation drawer.
- **Zero External Server Dependencies**: Built using native Node.js `http`, `fs`, and `path` modules with automatic port fallback and image caching headers.
- **SEO & Accessibility**: Semantic HTML5 markup, structured headings, descriptive metadata, and smooth scrolling.

---

## 📁 Project Structure

- `index.html` — Main website markup and section layout.
- `style.css` — Custom styling, glassmorphism effects, keyframes, and scrollbar rules.
- `main.js` — Interactive canvas engine, frame preloader, scroll scrubber, and UI handlers.
- `server.js` — Lightweight local HTTP server with asset caching and auto-port selection.
- `upscaled-video_all_frames/` — High-definition animation frames (240 PNG frames) for the interactive 3D effect.
- `package.json` — Project metadata and start scripts.
- `.gitignore` — Standard ignore patterns for clean version control.
