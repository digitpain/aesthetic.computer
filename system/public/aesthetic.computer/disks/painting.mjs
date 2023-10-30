// Painting, 2023.8.17.18.58.39
// View any aesthetic.computer painting.

/* #region 📚 README 
#endregion */

/* #region 🏁 TODO 
  + Later
  - [] Sound
  + Done
  - [x] Forwards and backwards directionality.
  - [x] Make right-click / tap to save available just in the "painting" command.
       without show.
  - [x] Make sure that the arrows are in the center Y.
  - [x] They should pause the show?
  - [x] Make the zoom function the same as in `hell_-world`.
  - [x] Wire up arrow buttons to work.
  - [x] Arrow keys should also work.
  - [x] `done` should take you to the painting page after uploading.
  - [x] Automatically go to the `painting` page after a successful upload /
       return the proper code.
       - [x] Generally smooth out the `painting:done` and `yes` feedback.
  - [x] Add `print` button.
  - [x] Load provisional / non-user paintings.
  - [x] If there is no recording then still load and show the `.png`.
  - [x] Playback all an existing painting's steps in a loop, with
  - [x] Save and load painting recordings with steps 2 remote storage somehow.
  - [x] Ordered text file, combined with bitmaps labeled with their commands and indices.
      the image centered.
#endregion */

const { min } = Math;
import * as sfx from "./common/sfx.mjs";

const labelFadeSpeed = 100;
const advanceSpeed = 100n;
let advanceCount = 0n;
let gestureIndex = 0;
let brush;
let brushPaints = [];

let painting,
  finalPainting,
  step,
  label,
  labelFade = labelFadeSpeed,
  stepIndex = -1,
  interim = "No recording found",
  // direction = 1,
  paintingIndex = stepIndex,
  pastRecord; // In case we load a record off the network.

let printBtn, // Sticker button.
  slug; // A url to the loaded image for printing.

let noadvance = false;

let btnBar = 32;
const butBottom = 6;
const butSide = 6;

let handle;
let imageCode, recordingCode;
let timeout;
let running;
let zoomed = false;
let showMode = false;

let prevBtn, nextBtn;
let zoomLevel = 1;

let ellipsisTicker;

//let mintBtn; // A button to mint.

// 🥾 Boot
function boot({
  system,
  params,
  colon,
  get,
  net,
  ui,
  screen,
  display,
  hud,
  gizmo,
  dom: { html },
}) {
  showMode = colon[0] === "show"; // A special lightbox mode with no bottom bar.

  ellipsisTicker = new gizmo.EllipsisTicker();

  if (showMode) {
    hud.labelBack();
    btnBar = 0;
  }

  if (params[0]?.length > 0) {
    interim = "Fetching";
    genSlug({ params });
    net.waitForPreload();
    get
      .painting(imageCode)
      .by(handle)
      .then((out) => {
        finalPainting = out.img;
        net.preloaded();
        let slug = imageCode + ".png";
        if (handle && handle !== "anon")
          slug = handle + "/painting/" + imageCode + ".png";
        if (showMode) return; // Skip download in showMode.

        const cssWidth = out.img.width * display.subdivisions;
        const cssHeight = out.img.width * display.subdivisions;

        html`
          <img
            width="${out.img.width}"
            height="${out.img.height}"
            id="hidden-painting"
            crossorigin
            src=${"/api/pixel/2048:conform/" + encodeURI(slug)}
          />
          <style>
            #content {
              z-index: 0 !important;
            }
            #hidden-painting {
              position: absolute;
              top: calc(calc(50% - calc(${cssHeight}px / 2)) - 32px);
              left: calc(50% - calc(${cssWidth}px / 2));
              width: ${cssWidth}px;
              height: ${cssHeight}px;
              background: yellow;
              opacity: 0.25;
              object-fit: contain;
              image-rendering: pixelated;
              -webkit-user-select: all;
              user-select: all;
            }
          </style>
          <script>
            const hp = document.querySelector("#hidden-painting");
            hp.onmousedown = (e) => {};
          </script>
        `;
      })
      .catch((err) => {
        // console.warn("Could not load painting.", err);
      });
    if (recordingCode) {
      get
        .painting(recordingCode, { record: true })
        .by(handle)
        .then((out) => {
          timeout = setTimeout(() => {
            pastRecord = system.nopaint.record;
            system.nopaint.record = out;
            console.log("Record", system.nopaint.record);
            advance(system);
            running = true;
          }, 750);
        })
        .catch((err) => {
          // console.warn("Could not load recording.", err);
        });
    }

    if (!showMode) {
      printBtn = new ui.TextButton(`Print`, {
        bottom: butBottom,
        right: butSide,
        screen,
      });
    }
    // mintBtn = new ui.TextButton(`Mint`, {
    //   bottom: butBottom,
    //   left: butSide,
    //   screen,
    // });
    // mintBtn.disabled = true;
  } else {
    finalPainting = system.painting;
    timeout = setTimeout(() => {
      running = true;
      console.log("Record", system.nopaint.record);
      advance(system);
    }, 1500);
  }
  // if (query.notice === "success") printBtn = null; // Kill button after order.
}

// 🎨 Paint
function paint({
  help,
  api,
  wipe,
  ink,
  system,
  screen,
  num,
  paste,
  pen,
  ui,
  geo,
}) {
  wipe(0);
  ink(0, 127).box(0, 0, screen.width, screen.height);

  function paintUi() {
    ink(32, 127).box(
      0,
      screen.height - btnBar,
      screen.width,
      screen.height - btnBar,
    );
    printBtn?.paint({ ink });
    //mintBtn?.paint({ ink });
  }

  function paintPainting(p) {
    const margin = 34;
    const wScale = (screen.width - margin * 2) / p.width;
    const hScale = (screen.height - margin * 2) / p.height;
    let scale = min(wScale, hScale, 1);
    let w = p.width * scale;
    let h = p.height * scale;
    let x = screen.width / 2 - w / 2;
    let y = screen.height / 2 - h / 2;

    if (pen && zoomed) {
      const imgX = (pen.x - x) / scale;
      const imgY = (pen.y - y) / scale;

      // Adjust scale and position for zoom anchored at pen position
      scale = zoomLevel;

      x = pen.x - imgX;
      y = pen.y - imgY;
      w = p.width * scale;
      h = p.height * scale;
    }

    ink(64).box(x, y - btnBar / 2, w, h);
    paste(p, x, y - btnBar / 2, { scale });
    ink(running ? undefined : "white").box(x, y - btnBar / 2, w, h, "outline");
  }

  ink(96).box(0, screen.height - 1 - btnBar, screen.width, 1);

  // Executes every display frame.
  if (
    (pastRecord && system.nopaint.record?.length > 0) ||
    (system.nopaint.record?.length > 1 && running)
  ) {
    if (!showMode) ink().write(label, { size: 2 });

    if (painting) {
      brushPaints.forEach((brushPaint) => {
        brushPaint(api);
      });

      brushPaints.length = 0;

      paintPainting(painting);
    }

    if (showMode) {
      ink(num.map(labelFade, 0, labelFadeSpeed, 0, 255)).write(
        label,
        { x: 6, y: 18 },
        "black",
      );
    } else {
      ink(num.map(labelFade, 0, labelFadeSpeed, 0, 255)).write(
        label,
        { y: 32, center: "x" },
        "black",
      );
    }

    if (system.nopaint.record[stepIndex - 1]?.timestamp) {
      ink(200).write(
        system.nopaint.record[stepIndex - 1]?.timestamp,
        { x: 3, y: screen.height - 13 - btnBar },
        "black",
      );
    }

    // Progress bar.
    ink(running ? undefined : "white").box(
      0,
      screen.height - 1 - btnBar,
      screen.width * ((stepIndex + 1) / system.nopaint.record.length),
      1,
    );

    // Prev & Next Buttons
    const prevNextMarg = 32;
    const prevNextWidth = 32;

    if (!prevBtn) {
      prevBtn = new ui.Button();
      if (stepIndex <= 0) prevBtn.disabled = true;
    }

    prevBtn.box = new geo.Box(
      0,
      prevNextMarg,
      prevNextWidth,
      screen.height - prevNextMarg * 2,
    );

    if (!prevBtn.disabled) {
      prevBtn.paint((btn) => {
        ink(btn.down ? "orange" : 255).write("<", {
          x: 6,
          y: screen.height / 2 - 4,
        });
      });
      // ink(0, 255, 0, 127).line(
      //   0,
      //   screen.height / 2,
      //   screen.width,
      //   screen.height / 2,
      // );
      ink(255, 255, 0, 8).box(prevBtn.box);
    }

    if (!nextBtn) {
      nextBtn = new ui.Button();
    }

    nextBtn.box = new geo.Box(
      screen.width - prevNextWidth,
      prevNextMarg,
      screen.width,
      screen.height - prevNextMarg * 2,
    );

    if (!nextBtn.disabled) {
      nextBtn.paint((btn) => {
        ink(btn.down ? "orange" : 255).write(">", {
          x: screen.width - 10,
          y: screen.height / 2 - 4,
        });
      });
      ink(255, 255, 0, 8).box(nextBtn.box);
    }

    paintUi();
  } else if (finalPainting) {
    paintPainting(finalPainting);
    paintUi();
  } else {
    ink().write(`${interim}${ellipsisTicker.text(help.repeat)}`, {
      center: "xy",
    });
  }

  if (recordingCode && !pastRecord && finalPainting) {
    ink().write(
      `Fetching${ellipsisTicker.text(help.repeat)}`,
      {
        center: "xy",
      },
      [0, 127],
    );
  }
}

// 🎪 Act
function act({ event: e, screen, print, mint, delay, system, sound }) {
  function next() {
    sfx.push(sound);
    running = false;
    advance(system, 1, "manual");
  }

  function prev() {
    sfx.push(sound);
    running = false;
    advance(system, -1, "manual");
  }

  nextBtn?.act(e, next);
  prevBtn?.act(e, prev);
  if (e.is("keyboard:down:arrowright")) next();
  if (e.is("keyboard:down:arrowleft")) prev();

  printBtn?.act(e, {
    push: async () => {
      printBtn.disabled = true;
      printBtn.reposition(
        { right: butSide, bottom: butBottom, screen },
        "Printing...",
      );
      await print(slug);
      delay(() => {
        printBtn.disabled = false;
      }, 0.1);
      printBtn.reposition(
        { right: butSide, bottom: butBottom, screen },
        "Print",
      );
    },
  });

  if (showMode) {
    if (e.is("touch:1") && !prevBtn?.down && !nextBtn?.down) zoomed = true;
    if (e.is("lift:1")) zoomed = false;
  }

  if (e.is("keyboard:down:space")) {
    zoomLevel += 1;
    if (zoomLevel > 3) zoomLevel = 1;
  }

  // mintBtn?.act(e, {
  //   push: async () => {
  //     mintBtn.disabled = true;
  //     mintBtn.reposition(
  //       { right: butSide, bottom: butBottom, screen },
  //       "Minting...",
  //     );
  //     await mint(slug);
  //     mintBtn.disabled = false;
  //     mintBtn.reposition({ right: butSide, bottom: butBottom, screen }, "Mint");
  //   },
  // });

  if (e.is("reframed")) {
    printBtn?.reposition({ right: butSide, bottom: butBottom, screen });
    // mintBtn?.reposition({ left: butSide, bottom: butBottom, screen });
  }
}

// 🧮 Sim
async function sim({ simCount, system, net, api }) {
  //if (running && !step.gesture) {
  if (running) {
    advanceCount += 1n;
    if (advanceCount % advanceSpeed === 0n) advance(system);
  }

  ellipsisTicker?.sim();

  /*
  if (running && step.gesture) {
    if (gestureIndex === step.gesture.length) {
      console.log("DONE simulating gesture... ready for next step?");
      advance(system);
    } else {
      if (gestureIndex === 0 && !brush) {
        console.log(step.label);

        const name = step.label.split(" ")[0].split(":")[0];
        // Load the brush name after stripping.
        import(`${net.pieces}/${name}.mjs`)
          .then((module) => {
            console.log("Brush loaded:", brush);
            brush = module;
            // TODO: Add params here...
            const colon = step.label.split(" ")[0].split(":").slice(1);
            const params = step.label.split(" ").slice(1);
            console.log("Params:", params, "Colon:", colon);
            brush.boot({ ...api, colon, params });
          })
          .catch((err) => {
            console.log("Failed to load brush code:", err);
          });

        // // Set the params for the brush.
        // const bootApi = { ...api };
        // bootApi.params = [];
        // brush?.boot?.(bootApi); // Initialize the brush.
      }

      if (brush) {
        const frame = step.gesture[gestureIndex];
        brushPaints.push((api) => {
          // Paint here...
          const bapi = { ...api };

          // Translate the pen to the current painting position.
          bapi.system = {
            nopaint: {
              is: (state) => state === "painting",
              translation: { ...api.system.nopaint.translation },
            },
          };
          // TODO: Add the `mode` in here
          //       for the gesture.
          // api.system.nopaint.updateBrush(api); // Set the current transform of brush.

          bapi.pen = { x: frame[2], y: frame[3] };
          bapi.page(painting);
          // bapi.ink("red").line();
          brush.paint(bapi);
          bapi.page(bapi.screen);
        });

        gestureIndex += 1;
      }
    }
  }
  */

  if (labelFade > 0) labelFade--;
}

// 🥁 Beat
// function beat() {
//   // Runs once per metronomic BPM.
// }

// 👋 Leave
function leave({ system }) {
  noadvance = true;
  if (pastRecord) system.nopaint.record = pastRecord;
  clearTimeout(timeout);
}

// 📰 Meta
function meta({ params }) {
  if (params[0]) {
    genSlug({ params });
    return {
      title: `painting · ${slug.replace(".png", "")}`,
      desc: handle
        ? `A pixel painting by ${handle}.`
        : `An anonymous pixel painting.`,
    };
  } else {
    return {
      title: "painting",
      desc: "View any aesthetic.computer painting.",
    };
  }
}

// 🖼️ Preview
function preview({ ink, screen, paste, wipe, resolution }) {
  // Render a custom thumbnail image.
  if (finalPainting) {
    resolution(finalPainting.width, finalPainting.height, 0);
    const x = screen.width / 2 - finalPainting.width / 2;
    const y = screen.height / 2 - finalPainting.height / 2;
    paste(finalPainting, x, y);
    ink().box(x, y, finalPainting.width, finalPainting.height, "outline");
  } else {
    wipe();
  }
}

// 🪷 Icon
function icon($) {
  preview($);
}

export { boot, paint, sim, act, leave, meta, preview, icon };

// 📚 Library
//   (Useful functions used throughout the piece)

function advance(system, direction = 1, mode = "auto") {
  const record = system.nopaint.record;
  if (noadvance) return;
  if (record.length === 0) return;
  stepIndex = stepIndex + direction;

  if (stepIndex === record.length)
    stepIndex = mode === "auto" ? 0 : record.length - 1;

  if (stepIndex === -1) stepIndex = 0;

  if (prevBtn) {
    if (stepIndex > 0) {
      prevBtn.disabled = false;
    } else {
      prevBtn.disabled = true;
    }
  }

  if (nextBtn) {
    if (stepIndex === record.length - 1) {
      nextBtn.disabled = true;
    } else {
      nextBtn.disabled = false;
    }
  }

  step = record[stepIndex];

  label = step.label.replaceAll("~", " ");
  labelFade = labelFadeSpeed;

  if (step.painting) {
    painting = step.painting;
    paintingIndex = stepIndex;
  } else {
    if (label === "no") {
      paintingIndex = paintingIndex - direction;
      while (
        paintingIndex >= 0 &&
        paintingIndex < record.length &&
        !record[paintingIndex].painting
      ) {
        paintingIndex -= direction;
      }
    } else if (label === "yes") {
      paintingIndex = paintingIndex + direction;
      while (
        paintingIndex >= 0 &&
        paintingIndex < record.length &&
        !record[paintingIndex].painting
      ) {
        paintingIndex += direction;
      }
    }

    if (record[paintingIndex]) painting = record[paintingIndex].painting;
  }
}

// if (direction > 0) {
//if (stepIndex === system.nopaint.record.length - 1) {
// stepIndex = system.nopaint.record.length - 1;
// direction = -1;
//}
//} else {
// stepIndex -= 1;
// if (stepIndex === 0) direction = 1;
//}

function genSlug({ params }) {
  // User string (@user/timestamp)
  if (params[0].startsWith("@") || params[0].indexOf("@") !== -1) {
    const [user, timestamp] = params[0].split("/");
    handle = user;
    imageCode = recordingCode = timestamp;
    slug = handle + "/painting/" + imageCode + ".png";
  } else {
    // Assume a guest painting code.
    // Example: Lw2OYs0H:qVlzDcp6;
    //          ^ png    ^ recording (if it exists)
    [imageCode, recordingCode] = params[0].split(":");
    handle = "anon";
    slug = imageCode + ".png";
  }
}
