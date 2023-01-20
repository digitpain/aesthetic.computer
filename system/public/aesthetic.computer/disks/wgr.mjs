// Whistlegraph Recorder, 22.12.27.19.30
// A simple, 2D tool for recording whistlegraphs.

/* #region 🏁 todo
  + ⏰ Now
  - [🆒] Don't render any mark segments that are completely offscreen! 
  - [] Add microphone input. 
  - [] Add audio and video recording. 
    - [] Record video
      - [] This will be done with `wgr seconds` in addition to a countdown timer.
        - [] If no seconds are entered, then no video recording occurs and
             a practice state is assumed!
    - [] With microphone.
    - [] Add background beat / music?
      - [] (via parameter #2)
    - [] Finish video saving UI.
      - [] Store to temporary online bucket and allow
           user to download / show code. 
  - [] Make the background cool and grainy / animated a bit.
  - [] (Post Wednesday) Whistlegraph Stamp
    - [] Two SVGs layered over. 
    - [] Wobbling
    - [] Global video completed counter.
    - [] Don't delete videos that get stored. 
    - [] "pre-launch / early"  
  + Later
    - [] User accounts along with full data storage and client player.
    - [] Parameterize some ink / thickness options in the CLI.
    - [] Does there need to be a secondary buffer for the current stroke...
      - Not if the strokes stay fuzzy!
      - But this would make sense to add in `line`.
    - [] Add "stroke" curve / spline to smooth the input data.
    - [] Store data in user account if someone is logged in.
    - [] Rename `wgr` -> `whistlegraph` and remap `wg` to "learn whistlegraph",
         or something like that.
  - 🛑 Launch 1
  + Done
    - [😇] Get two finger pan, zoom, and rotate working on iOS.
      - [x] Rotate
      - [x] Zoom
      - [x] Pan
    - [x] Multiple fields / values in a single line.
    - [x] Better output of text / printed values.
    - [x] Add background colors to log lines / return a bounding box from a print?
      - [x] Draw background colors under each letter.
    - [x] Add polychrome stroke support.
    - [x] Make each new gesture a different color.
    - [x] Make each new line a different stroke thickness.
    - [x] Zoom should change relative thickness.
    - [x] How to improve zooming and also add rotating to the keyboard?
    - [x] Add input events that trigger it.
      - [x] What about two keyboard shortcuts also? 
    - [x] Rotation
    - [x] Implement zoomFromPoint(n)` with positive or negative n.
    - [x] Pan (space bar or two finger drag)
    - [x] Abstract pixel shaders into 'position' and 'color' shaders. 
    - [x] pppline should get shader support as well!
    - [x] pppline needs to be able to draw back to front.
    - [x] Fill in each quad once 4 points are added.
      - [x] Use triangles?
    - [x] Support thickness.
    - [x] Add two parallel points for each coordinate at a time,
          starting from the second.
    - [x] Show a live preview.
    - [x] Add pixel-perfect single lin- [] RGB Black line tool (with thickness).
- [] RGBA Fill bucket.
- [] Frame is transparent.
- [] Safe zones.es in a display list / abstracted graph.
    - [x] Lines break / crash at the top of the screen...
  + Post-launch
    - [] Add button to switch inks.
    - [] Improve stroke rendering features. 
      - [] Rounded end-caps in pline? // Merge pline and pppline?
#endregion */

import { Typeface } from "../lib/type.mjs";

const { floor, max, sin, cos } = Math;

let wg, bg; // Whistlegraph foreground and background.

let debug = true;
let debugMids = []; // Midpoints of multi-touch.

let tf; // Typeface for text overlay.
let ALT = false, // Keyboard modifiers.
  SHIFT = false,
  Q = false,
  E = false,
  CTRL = false;

// 🥾 Boot (Runs once before first paint and sim)
function boot($) {
  const { num, help, wipe, net } = $;
  $.glaze({ on: true }); // Add post-processing by @mxsage.
  bg = num.randIntArr(128, 3); // Random background color.
  wg = new Whistlegraph($, help.choose(1, 2)); // Whistlegraph with thickness.
  tf = new Typeface(net.preload); // Load `font-1`...
  wipe(bg); // Clear backbuffer.
}

// 🎨 Paint
function paint($) {
  if (ALT || SHIFT || CTRL || Q || E || $.pens?.().length > 1) $.wipe(bg);

  wg.paint($);
  // $.ink(255, 255, 0, 128).box(wg.anchor.x, wg.anchor.y, 8, "out*center");

  // 🐛 Debug
  if (!debug) return;
  // Graphics
  // Anchor...
  // debugMids.forEach((m) => $.ink(255, 0, 0).box(m.x, m.y, 9, "fill*center"));

  // Printed Values
  // TODO: - [] Allow multiple values on a single row...

  $.ink(140, 90, 0);
  // Measure some printable parameters.
  // Define a label to the left, and a value or set of values on the right.
  [
    ["pen", [$.pen?.x || 0, $.pen?.y || 0]],
    ["pan", [floor(wg.pan.x), floor(wg.pan.y)]],
    ["anc", [wg.anchorPoint.x, wg.anchorPoint.y]],
    ["scl", wg.scale.x], // Only need to log one scale if using uniform.
    ["rot", wg.rotation],
  ]
    .map((v) => {
      // 🖊️ Log the value or set of values as a padded & formatted string.
      v[1] = typeof v[1] === "number" ? [v[1]] : v[1];
      const values = v[1].map((v) => v.toFixed(2));
      // TODO: Add column formatted numbers here...
      v[1] = values.join(", "); // Concatenate values with ", "
      return v;
    })
    .forEach((line, i) => tf.print($, i, `${line[0]}: ${line[1]}`, bg));
}

// 🧮 Sim(ulate)
function sim({ num: { mat3, p2 }, pen, pens, screen }) {
  if (pen && (SHIFT || CTRL || ALT || Q || E)) wg.anchor(pen); // Anchor
  if (SHIFT || CTRL) wg.zoom(CTRL ? 0.999 : 1.001); // Zoom
  if (Q || E) wg.rotate(Q ? -0.01 : 0.01); // Rotate
}

let lastTwoTouch;

// ✒ Act (Runs once per user interaction)
function act($) {
  const {
    event: e,
    pen,
    pens,
    num: { p2 },
    help,
  } = $;
  // 🪐 Navigation (Zoom, Scale & Rotate)
  // Keyboard
  if (e.is("keyboard:down:alt")) ALT = true; // Panning ➡️
  if (e.is("keyboard:up:alt")) ALT = false;
  if (ALT && e.delta) {
    wg.anchor(pen);
    wg.move(e.delta);
  }

  if (e.is("keyboard:down:q")) Q = true; // Rotating left... ↩️
  if (e.is("keyboard:up:q")) Q = false;
  if (e.is("keyboard:down:e")) E = true; // and right.
  if (e.is("keyboard:up:e")) E = false;

  if (e.is("keyboard:down:shift")) SHIFT = true; // Zooming in... 🔭️
  if (e.is("keyboard:up:shift")) SHIFT = false;
  if (e.is("keyboard:down:control")) CTRL = true; // and out.
  if (e.is("keyboard:up:control")) CTRL = false;

  // Touch
  if (e.is("touch:2")) {
    if (wg.graphing) {
      // End graphing if necessary when a two finger gesture starts.
      wg.graphing = false;
      wg.lift();
    }
    lastTwoTouch = twoTouch($);
    wg.anchor(p2.floor(lastTwoTouch.mid)); // Set anchor to center of twoTouch.
  }

  if ((e.is("draw:1") || e.is("draw:2")) && pen?.multipen) {
    const newTwoTouch = twoTouch($);
    wg.anchor(p2.floor(newTwoTouch.mid)); // Set anchor to center point of twoTouch.
    if (lastTwoTouch) {
      wg.zoom(newTwoTouch.dist / lastTwoTouch.dist); // Zoom
      wg.rotate(newTwoTouch.rot - lastTwoTouch.rot); // Rotate
      wg.move(p2.sub(newTwoTouch.mid, lastTwoTouch.mid)); // Pan by delta of last tT.
    }
    lastTwoTouch = newTwoTouch;
  }

  if (e.is("lift") && pens().length < 2) lastTwoTouch = null; // Reset twoTouch history.

  // ✏️ Graphing
  if (e.is("touch:1")) {
    wg.graphing = true;
    wg.touch({ ...e, thickness: help.choose(1, 2, 4, 8, 16) }); // Drawing 🤙
    // wg.touch({ ...e, thickness: help.choose(1) }); // Drawing 🤙
  }

  if (e.is("draw:1") && wg.graphing) wg.draw(e);

  if (e.is("lift:1") && wg.graphing) {
    wg.graphing = false;
    wg.lift();
  }
}

export { boot, paint, act, sim };

// 📚 Library (Useful functions used throughout the piece)
function twoTouch({ pens, num: { p2 } }) {
  const a = pens(1),
    b = Object.keys(pens()).length > 1 ? pens(2) : pens(1);
  return {
    mid: p2.mid(a, b),
    dist: p2.dist(a, b),
    rot: p2.angle(a, b),
  };
}

// A composition of gestures.
class Whistlegraph {
  $; // API
  gestures = [];
  gestureIndex = -1;
  baseColor;
  currentColor;
  thickness;
  matrix;
  graphing = false; // Keeps track of whether we are making a gesture or not.

  pan = { x: 0, y: 0 };
  scale = { x: 1, y: 1 };

  anchorPoint = { x: 0, y: 0 };
  oldAnchor = { x: 0, y: 0 };
  lastScale = { x: 1, y: 1 };
  rotation = 0;

  constructor($, thickness = 2) {
    this.$ = $;
    this.baseColor = $.num.randIntArr(255, 3);
    this.thickness = thickness;
    this.matrix = $.num.mat3.create();
  }

  // Pans around the view by a screen-coordinate amount, taking rotation and
  // scale into account.
  // TODO: - [] I could shorten these transformations by using a matrix. 23.01.09.04.01
  //            (Or by converting to worldPos first?)
  move(p) {
    const p2 = this.$.num.p2;
    const rp = p2.rot(p, -this.rotation);
    const sp = p2.mul(rp, p2.div(1, this.scale));
    p2.inc(this.pan, sp);
  }

  rotate(angle) {
    this.rotation += angle;
  }

  anchor(p) {
    const newScreenAnchor = { x: p.x, y: p.y };
    // Get difference between old and new screen anchor.
    const anchorDiff = {
      x: floor(this.anchorPoint.x - newScreenAnchor.x),
      y: floor(this.anchorPoint.y - newScreenAnchor.y),
    };
    this.move(anchorDiff); // Pan it while taking account rotation and scale.
    this.anchorPoint = newScreenAnchor; // Update anchorPoint.

    if (debug) debugMids = [this.anchorPoint]; // Debug draw anchorPoint.
  }

  // Zoom in uniformly via `amt` or separately with `{x: amt, y: amt}`.
  // amt is zeroed at 1.
  zoom(amt) {
    this.lastScale = { x: this.scale.x, y: this.scale.y };
    const newScale = this.$.num.p2.mul(this.scale, {
      x: amt.x || amt,
      y: amt.y || amt,
    });

    this.scale = newScale;
  }

  // -> Projects a whistlegraph point onto the screen. (world to screen)
  // Whistlegraph points / vertices contain data like: {x, y, pressure, color}
  project(p) {
    const {
      num: { vec2, mat3 },
    } = this.$;
    const m = mat3.create(); // Identity
    mat3.translate(m, m, [this.anchorPoint.x, this.anchorPoint.y]); // Unanchor
    mat3.scale(m, m, [this.scale.x, this.scale.y]); // Scale
    mat3.rotate(m, m, this.rotation); // Rotate
    mat3.translate(m, m, [this.pan.x, this.pan.y]); // Pan
    const tp = vec2.transformMat3(vec2.create(), [p.x, p.y], m);
    p.x = tp[0];
    p.y = tp[1];
    return p;
  }

  // <- Unprojects a screen location into whistlegraph view. (screen to world)
  unproject(p) {
    const {
      num: { vec2, mat3 },
    } = this.$;
    const m = mat3.create(); // Identity
    mat3.translate(m, m, [-this.pan.x, -this.pan.y]); // Pan
    mat3.rotate(m, m, -this.rotation); // Rotate
    mat3.scale(m, m, [1 / this.scale.x, 1 / this.scale.y]); // Scale
    mat3.translate(m, m, [-this.anchorPoint.x, -this.anchorPoint.y]); // Anchor
    const tp = vec2.transformMat3(vec2.create(), [p.x, p.y], m);
    return { x: tp[0], y: tp[1] };
  }

  touch({ x, y, pressure, thickness = this.thickness }) {
    this.baseColor = this.$.num.randIntArr(255, 3);
    this.genColor();

    this.gestures.push(
      new Gesture(
        this.$,
        { ...this.unproject({ x, y }), pressure, color: this.currentColor },
        thickness
      )
    );
    this.gestureIndex = this.gestures.length - 1;
  }

  // TODO: Think more about how color relates to gestures in this code.
  draw({ x, y, pressure }) {
    const g = this.gestures[this.gestureIndex];

    // Randomize the segment color if this gesture is polychrome.
    if (g.polychrome) this.baseColor = this.$.num.randIntArr(255, 3);

    this.genColor();

    g.add({
      ...this.unproject({ x, y }),
      pressure,
      color: this.currentColor,
    });
  }

  lift() {
    // Remove gesture on lift if there is only one point.
    const g = this.gestures[this.gestureIndex];
    if (g.points.length === 1) this.gestures.splice(this.gestureIndex);
  }

  paint($) {
    const {
      help: { choose },
      num: { clamp, lerp, randInt, rand },
      pen,
    } = $;

    // TODO: Just use "graphing" here and move it into Whistlegraph.
    const next = this.graphing
      ? {
          ...this.unproject(pen),
          pressure: pen.pressure,
          color: wg.currentColor,
        }
      : undefined;

    for (let i = this.gestures.length - 1; i >= 0; i -= 1) {
      const g = this.gestures[i];

      // const color = i === this.gestureIndex ? [128, 0, 0] : [64, 64, 64];
      // $.ink(this.baseColor);

      // Collect and view-transform all geometry for a given gesture.
      const points = (
        next && this.gestureIndex === i ? [...g.points, next] : g.points
      ).map((p) => this.project({ ...p })); // Transform a copy of every point.

      // $.ink(g.color); // Set default color using the first point of every gesture.

      const scaledThickness = max(1, floor(g.thickness * wg.scale.x)); // Scale line thickness.

      // Render each gesture.
      if (scaledThickness === 1) {
        $.pppline(points, {
          position: (pos) => {
            // 🩰 Spread
            const r1 = randInt(1);
            const r2 = randInt(1);
            pos.x = pos.x + choose(-r1, r1) * rand();
            pos.y = pos.y + choose(-r2, r2) * rand();
          },
          color: (pos, pix, col, vcol) => {
            // ✨ Sparkles
            if (Math.random() > 0.96) {
              pix[0] = randInt(255);
              pix[1] = randInt(255);
              pix[2] = randInt(255);
            } else {
              pix[0] = vcol[0];
              pix[1] = vcol[1];
              pix[2] = vcol[2];
            }
          },
        });
      } else {
        $.pline(points, scaledThickness, {
          position: (pos) => {
            // 🩰 Spread
            const r1 = randInt(4);
            const r2 = randInt(4);
            pos.x = pos.x + choose(-r1, r1) * rand();
            pos.y = pos.y + choose(-r2, r2) * rand();
          },
          color: (pos, pix, col) => {
            // // 📊 Axis Gradient
            const axes = ["y", "y", "x"];
            for (let i = 0; i < 3; i += 1) {
              pix[i] = clamp(
                lerp(col[i], pos[axes[i]], 0.3) + choose(-1, 1),
                0,
                255 / (rand() * 2.2)
              );
            }

            // ✨ Sparkles
            if (Math.random() > 0.46) {
              pix[0] = lerp(col[0], randInt(255), rand() / 2);
              pix[1] = lerp(col[1], randInt(255), rand() / 2);
              pix[2] = lerp(col[2], randInt(255), rand() / 2);
            }
          },
        });
      }
    }
  }

  genColor() {
    this.currentColor = this.baseColor.map((c) => this.$.wiggle(c, 0.2, 3));
  }
}

// Keeps track of gesture geometry which every `Whistlegraph` has a list of.
class Gesture {
  $; // API
  points = []; // Each point contains `{x, y, pressure, color}` data.
  thickness;

  constructor($, point, thickness = 2) {
    this.$ = $;
    this.add(point);

    // Note: Each of these properties are kind of like metadata on the gesture.
    this.thickness = thickness;
    this.color = point.color; // Gesture color to the color of the first point.
    this.polychrome = $.help.flip(); // Whether to recolor segements randomly.
  }

  add(next) {
    const last = this.points[this.points.length - 1] || next;
    if (
      this.points.length === 0 ||
      this.$.num.dist(next.x, next.y, last.x, last.y) > this.thickness / 2
    ) {
      this.points.push(next);
    }
  }
}
