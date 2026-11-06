PRINT IN MOTION
Six-phase 3D crafting animation for a login-page panel.

QUICK START
Serve this folder with your existing web app or any static HTTP server.
Open index.html through that server. ES modules require HTTP; double-clicking
the HTML file using file:// is not supported by browsers.

USE BESIDE YOUR LOGIN FORM
Copy this entire folder into your app's public/print-animation folder.
Place the iframe below in the visual column of your existing login layout.

<iframe
  src="/print-animation/index.html?embed=1"
  title="A six-phase journey through print and apparel crafting"
  style="width:100%;height:100%;min-height:620px;border:0;display:block;"
></iframe>

The embed query hides the surrounding phase list and playback toolbar.
The animation automatically repeats every 48 seconds.
This is a browser animation, not a rendered video or an authentication system.

PHASES, IN ORDER
01 Full Sublimation Printing - heat press transfers a full-colour design.
02 Commercial Apparel & Uniforms - garment panels assemble into teamwear.
03 Diverse Printing Technologies - CMYK ink, print head, screen and samples.
04 Direct-to-Garment (DTG) - a moving print head reveals a garment design.
05 Merchandise & Large-Format Sublimation Fabric - printed mug, tote and banner.
06 Print Roll Services - wide-format printer feeds a continuous fabric roll.

The visuals illustrate the services. They are stylized and do not represent
the exact mechanical workflow or specifications of particular equipment.

CONTROLS
Click a phase or a timeline segment to jump to it.
Space toggles playback. Left and right arrows choose a phase.
Escape leaves panel view. The menu changes playback speed.
Reduced-motion preferences start the animation paused in the full studio.
In panel mode, show the full studio using Back to studio to access playback.

CUSTOMIZATION
animation.js - phases, timing, 3D models, materials and procedural artwork.
style.css - layout, colours, text and responsive panel styling.
index.html - headings, phase labels and playback controls.
software-renderer.js - CPU fallback when WebGL is unavailable.
assets/ - bundled Three.js r170, rounded-box geometry helper and MIT license.
All dependencies are local. No remote image, font or script requests are needed.

CONTROL FROM CODE (inside the animation iframe)
window.PrintMotion.play()
window.PrintMotion.pause()
window.PrintMotion.setPhase(0) // 0 through 5
window.PrintMotion.seek(16)  // seconds, wrapping at 48
window.PrintMotion.getState()

COPYRIGHT
Original illustration, interface and animation code created for this project.
Three.js is distributed under the included MIT license in assets/THREE-LICENSE.txt.
