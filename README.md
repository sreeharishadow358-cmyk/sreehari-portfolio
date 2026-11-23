# Sree Hari G — Portfolio

> **Software engineer for AI, web & automation.** I write the software that makes machines think: AI and web apps, automated workflows, and the PLCs and robot arms they control.

A fully custom, 3D, scroll-driven portfolio built with **Three.js** and plain HTML/CSS/JS. No frameworks and no build step: it opens anywhere a static file server runs.

**Contact:** sreeharishadow358@gmail.com · [LinkedIn](https://www.linkedin.com/in/sreehari-ganeshan/) · [PLC AI Studio (live)](https://plc-ai-studio-rho.vercel.app)

---

## ✨ What's inside

| Section | What happens |
|---|---|
| **Hero: pick-and-place showreel** | A procedurally modelled 5-axis robot arm (real inverse kinematics) picks my illustrated portrait card from a rack and presents it. Scrolling runs five more picks (AI & web, automation, PLC & machines, IoT & robotics, impact). Each card is carried, spun, placed on a lit stand and zoomed into, then flies onto a wall. |
| **Wiring** | A bundle of glossy cables with glowing tips (instanced meshes) unravels as you scroll and re-wires itself into an iris ring labelled AI · Web · Automation · Hardware. |
| **Selected work** | **Smart Ladder / PLC AI Studio** (SIH 2026) with a live, playable START / STOP / E-STOP seal-in rung driving a 3D ladder model · **FoldX** PLC fabric-folding machine (6th Mitsubishi Electric Cup national finalist) · Smart Traffic Signal · GitHub repos. |
| **Software automation** | Animated n8n-style flow: machine → webhook → AI agent → sheet / alert / back to the PLC. |
| **Freelance & brands** | Smart Parking System (client build), Skill Hive Innovations and The InCredible Scroll. |
| **Journey** | A side-scrolling 3D world: the camera glides past each milestone while my illustrated portrait hovers as a hologram and "watches" with a light beam. Includes animated illustrations for e-Yantra, NXP Cup and SIH. |
| **Skills** | A looping robot cell: a conveyor feeds skill blocks, and the arm shows each one to the camera, then shelves it. |
| **Latest news & contact** | Auto-sliding news carousel and a "Give me one opportunity. I'll prove it." pitch. |

## 🧱 Tech

- **Three.js** (bundled ES module, `assets/js/three.min.js`): PBR materials, PMREM studio environment, shadows, instanced meshes, custom GLSL hologram and beam shaders
- **Vanilla JS modules**: no framework, no bundler
- **CSS custom properties**: one token set drives a colour-grade system (Ultraviolet by default; Violet Noir, Royal Amethyst and Plum Lilac are kept in `theme.js` / `style.css`)
- Fonts are self-hosted: Sora, Instrument Serif, Inter, JetBrains Mono
- Media is pre-processed with **ffmpeg** (short, muted web loops) and **rembg + OpenCV** (portrait cut-out and illustration grade)
- Respects `prefers-reduced-motion`, pauses 3D scenes when off-screen, and falls back gracefully without WebGL

## 📁 Structure

```
index.html                 page markup and all copy
assets/
  css/style.css            design tokens, colour grades, layout, responsive rules
  js/robot.js              shared robot arm, studio lighting, floor and IK solver
  js/show.js               hero pick-and-place showreel
  js/wires.js              cable bundle → iris ring section
  js/ladder.js             3D ladder-logic model (Smart Ladder)
  js/journey.js            side-scrolling 3D journey world + illustrations
  js/skills.js             looping skills robot cell
  js/theme.js              colour-grade palette shared with every 3D scene
  js/main.js               nav, live PLC rung logic, reveals, tabs, slideshow, news carousel
  img/  vid/  fonts/       optimised media and self-hosted fonts
```

## 🚀 Run locally

Browsers block JS modules from `file://`, so serve the folder:

```bash
npx serve .          # or: python -m http.server 8000
```

Then open the printed URL (for example http://localhost:3000).

## 🌐 Deploy

It's a static site, so any static host works:

- **Vercel:** Add New → Project → import this repo → Framework: *Other* → Deploy
- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root

## ✏️ Editing

- **Text:** `index.html`
- **Colours:** the `[data-grade=ultra]` block at the top of `assets/css/style.css` (and the matching entry in `assets/js/theme.js` for the 3D scenes)
- **Portrait:** replace `assets/img/me-drawn.png` (transparent PNG, portrait orientation)
- **Journey milestones:** the hidden `<ol class="tl world__list">` in `index.html`. Every `<li>` becomes a 3D station automatically.

---

© 2026 Sree Hari G · Mechatronics, SNS College of Technology, Coimbatore
