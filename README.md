# Analog Revival

A cinematic, scroll-driven 3D product page for a fictional reissue of a 1970s studio headphone.
Concept project, not a real product.

**Stack:** Vite · Three.js · postprocessing · GSAP (ScrollTrigger) · Lenis · Web Audio

## Features

- One camera path for the whole page. Scroll position is mapped to blends between camera shots, and close-ups are defined in model space.
- Depth of field that follows the camera's focus point, subtle bloom and ACES tone mapping. The background colour is inverse-tone-mapped so it matches the CSS colour exactly.
- Anatomy hotspots projected from 3D to HTML labels. On mobile they dock as a card at the bottom of the screen.
- Three lighting moods (Studio, Golden Hour, Midnight). The default mood depends on the visitor's local time.
- Procedural ambient sound: a tape-wobbled pad plus vinyl crackle, shaped by the selected mood. It is off by default.
- Drag-to-rotate finale built on OrbitControls. It eases back into the scroll path when you leave the section.
- Respects `prefers-reduced-motion`, uses adaptive resolution and lighter effects on mobile.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
```

URL helpers: `?mood=studio|golden|midnight` forces a mood, `?debug` shows all anatomy points.

Brand name and author live in `src/config.js`. Anatomy points are in `src/scene/points.js`, lighting moods in `src/scene/lights.js`.

## Deploy

`dist/` is a static site and can be hosted on Netlify, Vercel, GitHub Pages or similar.
After deploying, update `og:image` in `index.html` to an absolute URL so link previews work everywhere.

## Credits

3D model: [“Headphone Retro”](https://sketchfab.com/XID3) by Tomek Suchodolski, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). It was optimised for the web: geometry simplified,
textures resized to 2048 px WebP, meshopt compression.
The unmodified source is kept in `assets-src/` and is not deployed.
