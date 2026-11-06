JAPA GLOBAL TRADING
The Craft of Print - 3D Login Panel, version 2

WHAT CHANGED
JAPA's supplied logo and red, blue, black and white identity are used throughout.
Opaque surfaces now use per-pixel depth testing in both WebGL and the CPU fallback.
Only one service occupies the stage at a time. Scenes leave before the next enters.
Rigid equipment stays assembled and grounded. Product motion is separate from transitions.
Press, garment, print-head and merchandise clearances are verified over the loop.
The fabric output follows a continuous path tangent to a supported take-up roll.
Fabric has fine weave, stitched hems and collars; ceramic and metal use distinct materials.

START
Serve this folder over HTTP with your existing web app or any static server.
Open index.html. Do not open it directly with file:// because ES modules require HTTP.

EMBED IN YOUR LOGIN PAGE
Copy this folder to public/print-animation in your own application.
Place this iframe in the visual column of your two-column login layout.

<iframe
  src="/print-animation/index.html?embed=1"
  title="JAPA Global Trading printing and apparel animation"
  style="width:100%;height:100%;min-height:620px;border:0;display:block;"
></iframe>

Panel view shows the narrower presentation. Within an iframe it fills its parent.
The full studio includes pause/play, speed, phase selection and a draggable timeline.
The six phases repeat in order over 48 seconds.
Reduced-motion preferences start playback paused with a completed design visible.
This is a browser animation, not an exported video or an authentication system.

PHASES
01 Sublimation - transfer paper aligns above polyester, the press closes, then opens
   before the paper leaves and the transferred design is revealed.
02 Commercial apparel - separated garment panels form teamwear on a grounded rack.
03 Printing technologies - screen and squeegee work beside a digital inkjet station.
04 DTG - a garment platen feeds through an open throat beneath a travelling print head,
   then returns to its loading position after the design is complete.
05 Merchandise and large-format fabric - branded coated mug, tote and fabric display.
06 Print roll services - media travels from the output roller to a supported take-up roll.

These are compact visual illustrations, with time accelerated for a login page.
They do not reproduce a particular machine or every production step. DTG pretreatment
and ink curing are outside this short print-head demonstration. Sublimation temperature,
pressure and dwell time depend on the substrate, ink, transfer paper and equipment.

PROCESS REFERENCES
Roland DG, Introduction to Dye Sublimation
https://www.rolanddg.eu/-/media/roland-emea/images/sites/guides/dye-sub/roland-dg-uk-dye-sublimation-guide.pdf
Brother, GTX600 product and process information
https://base.brother.digital/download/GTX600_english.pdf

FILES
studio.js - equipment, product geometry, JAPA artwork, materials, motion and clearances.
animation.js - playback, responsive camera fitting, keyboard and embedding behavior.
software-renderer.js - perspective-correct texture mapping and per-pixel depth buffer.
index.html and style.css - branded studio interface and responsive panel layout.
assets/japa-logo.jpg - your supplied logo, used without changing the original image.
assets/three.module.js, RoundedBoxGeometry.js and RoomEnvironment.js - Three.js r170.
assets/THREE-LICENSE.txt - Three.js MIT license.
All runtime assets are local; no remote font, image or script requests are needed.

CONTROLS
Space toggles playback when an interactive control is not focused.
Left and right arrows select phases. Escape leaves panel view.
The timeline can be dragged or operated with the arrow keys for precise inspection.
The full studio phase buttons show a finished scene when playback is paused.

OPTIONAL CODE API, inside the iframe
window.PrintMotion.play()
window.PrintMotion.pause()
window.PrintMotion.setPhase(0) // index 0 through 5
window.PrintMotion.seek(16)  // seconds, wrapping at 48
window.PrintMotion.getState()

ASSET RIGHTS
The JAPA logo is the user-supplied brand asset, not a newly generated logo.
Original scene and application code created for this project.
Three.js uses the included MIT license.
