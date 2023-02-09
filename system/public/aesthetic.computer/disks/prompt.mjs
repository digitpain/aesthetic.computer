// A text based access-everything console.
// Currently the aesthetic.computer home piece!

/* #region 🏁 todo
 - [] Prevent non-printable characters from causing an empty space.
 - [] Generate or pretty print docs (made from the APIs) inside this disk.
      (This would allow people to have a reference while writing disks.)
 + Later
 - [] An iOS app would need a small ESC or arrow overlay button in Swift
      to make this work properly.
#endregion */

import { parse } from "../lib/parse.mjs";
import { nopaint_adjust } from "../systems/nopaint.mjs";
import { Desktop, MetaBrowser } from "../lib/platform.mjs";
import { TextInput } from "../lib/type.mjs";

const scheme = {
  dark: {
    fg: [255, 100],
    bg: [70, 50, 100],
    block: [200, 30, 100],
    line: [0, 0, 255, 64],
  },
  light: {
    fg: [0, 200],
    bg: [170, 150, 200],
    block: [30, 200, 200],
    line: [0, 0, 0, 128],
  },
};

const motd =
  `Try 'ff'                                        ` +
  `     to view Freaky Flowers!                    ` +
  `                                                ` +
  `                                                ` +
  `mail@aesthetic.computer                         `;

let input;

// Error / feedback flash on command entry.
let flash;
let flashShow = false;
let flashColor = [];
let flashPresent = false;

// 🥾 Boot (Runs once before first paint and sim)
function boot($) {
  const {
    pieceCount,
    glaze,
    load,
    download,
    dark,
    darkMode,
    num,
    store,
    connect,
    bgm,
    needsPaint,
    system,
    jump,
    history,
  } = $;

  glaze({ on: true }); // TODO: Every glaze triggers `frame` in `disk`, this could be optimized. 2022.04.24.04.25

  input = new TextInput(
    $,
    motd,
    scheme[dark ? "dark" : "light"],
    // 🍎 Process commands...
    async (text) => {
      if (text.startsWith("login")) {
        const email = text.split(" ")[1];

        console.log("Email:", email); // TODO: Properly check email formatting.

        // TODO: Add "login" to API flow.
        // TODO: User enters email address
        // TODO: Log the user in...
        /*
        async function login(email) {
          const response = await fetch("/auth", {
            method: "POST",
            body: JSON.stringify({ email }),
            headers: { "Content-Type": "application/json" },
          });
          if (response.ok) {
            console.log("Passwordless login link sent!");
          } else {
            console.error("Error sending passwordless login link");
          }
        }
        */
      } else if (text === "dl" || text === "download") {
        if (store["painting"]) {
          download(`painting-${num.timestamp()}.png`, store["painting"], {
            scale: 6,
            cropToScreen: true,
          });
          // Show a green flash if we succesfully download the file.
          flashColor = [0, 255, 0];
        } else {
          flashColor = [255, 0, 0]; // Show a red flash otherwise.
        }
        flashPresent = true;
        flashShow = true;
        input.text = "";
        needsPaint();
      } else if (text === "no") {
        // TODO: Undo / flip the last painting step.
        const paintings = system.nopaint.undo.paintings;

        if (paintings.length > 1) {
          // Copy over the old picture here...
          const p = paintings[paintings.length - 2];
          const op = p.pixels;
          const pixels = new Uint8ClampedArray(op.length);
          pixels.set(op);

          store["painting"] = {
            width: p.width,
            height: p.height,
            pixels,
          };

          // Swap mode.
          // 'no' should swap...
          const temp = paintings[0];
          paintings[0] = paintings[1];
          paintings[1] = temp;

          // Rewind mode
          //paintings.length -= 1;

          store.persist("painting", "local:db");

          needsPaint();
          flashColor = [0, 0, 255, 100]; // Blue for succesful undo.
        } else {
          flashColor = [255, 0, 0, 100]; // Red for failed undo.
        }

        flashPresent = true;
        flashShow = true;
      } else if (text === "painting:reset" || text === "no!") {
        const deleted = await store.delete("painting", "local:db");
        system.nopaint.undo.paintings.length = 0; // Reset undo stack.

        if (deleted) {
          flashColor = [0, 0, 255]; // Blue for succesful deletion.
        } else {
          flashColor = [255, 0, 0]; // Red if delete failed.
        }

        flashPresent = true;
        flashShow = true;
        input.text = "";
        needsPaint();
      } else if (text === "3dline:reset") {
        const deleted = await store.delete("3dline:drawing", "local:db");

        if (deleted) {
          flashColor = [0, 0, 255]; // Blue for succesful deletion.
        } else {
          flashColor = [255, 0, 0]; // Red if delete failed.
        }

        flashPresent = true;
        flashShow = true;
        input.text = "";
        needsPaint();
      } else if (text === "dark" || text === "dark:reset") {
        if (text === "dark:reset") {
          store.delete("dark-mode");
          darkMode("default");
          flashColor = [127, 127, 127]; // Gray for system setting.
        } else {
          let current = await store.retrieve("dark-mode");
          current = current === true ? false : true;
          darkMode(current);
          if (current) {
            flashColor = [0, 0, 0]; // Black for dark mode enabled.
          } else {
            flashColor = [255, 255, 255]; // White for dark mode disabled.
          }
        }
        flashPresent = true;
        flashShow = true;
        input.text = "";
      } else if (text.startsWith("2022")) {
        load(parse("wand~" + text)); // Execute the current command.
      } else if (text === "connect") {
        let identity;
        input.text = "";
        try {
          identity = await connect(); // Web3 connect.
          store["identity"] = identity; // Store the identity.
          store.persist("identity"); // ... and persist it!
          flashPresent = true;
          flashShow = true;
          flashColor = [0, 255, 0];
        } catch (e) {
          flashPresent = true;
          flashShow = true;
          flashColor = [255, 0, 0];
        }
      } else if (text === "bgm stop") {
        bgm.stop();
        flashPresent = true;
        flashShow = true;
        flashColor = [255, 0, 0];
      } else if (text === "local") {
        // Go to the localhost / assume a dev environment.
        jump("https://localhost:8888");
      } else {
        // 🟠 Local and remote pieces...
        load(parse(text)); // Execute the current command.
      }
    }
  );

  // Activate and reset input text if returning to the prompt from elsewhere.
  if (pieceCount > 0) {
    if (Desktop) input.canType = true;
    input.text = "";
  }
}

// 🧮 Sim(ulate) (Runs once per logic frame (120fps locked)).
function sim($) {
  const {
    seconds,
    needsPaint,
    gizmo: { Hourglass },
  } = $;
  input?.sim($);

  flash =
    flash ||
    new Hourglass(seconds(0.1), {
      flipped: () => {
        flashShow = false;
        flashPresent = false;
        needsPaint();
      },
      autoFlip: true,
    });

  if (flashPresent) flash.step();
}

// 🎨 Paint (Runs once per display refresh rate)
function paint($) {
  const { screen, wipe, ink, history, paste, store, dark } = $;

  const pal = scheme[dark ? "dark" : "light"];
  if (input) input.pal = pal; // Update text input palette.

  if (store["painting"]) {
    paste(store["painting"]);
    ink(...pal.bg, 127).box(screen); // Backdrop
  } else {
    wipe(...pal.bg);
  }

  const glyphsLoaded = input?.paint($); // Paint the text input.

  // Paint last command if needed.
  // TODO: This could be a much shorter call...

  let historyTexts;

  if (history.length === 0) {
    historyTexts = ["aesthetic.computer"];
  } else {
    historyTexts = history.map((h) => h.replaceAll("~", " "));
  }

  historyTexts.reverse().forEach((t, i) => {
    const ii = i + 1;
    const yMargin = i === 0 ? 0 : 2;
    ink(140, 90, 235, 80 / ii).printLine(
      t,
      input?.typeface.glyphs,
      6,
      screen.height - 6 * 3 * ii - 6 - yMargin,
      6,
      2,
      0
    );
  });

  // Trigger a red or green screen flash with a timer.
  if (flashShow) ink(flashColor).box(0, 0, screen.width, screen.height);

  return glyphsLoaded;
}

// ✒ Act (Runs once per user interaction, after boot.)
async function act($) {
  const { event: e, needsPaint, store, screen, system, painting } = $;

  if (e.is("reframed")) {
    nopaint_adjust(screen, system, painting, store);
    needsPaint();
  }

  input?.act($);

  if (e.is("load-error")) {
    flashPresent = true;
    flashShow = true;
    flashColor = [255, 0, 0];
    if (MetaBrowser) input.canType = false;
    needsPaint();
  }
}

function meta() {
  return {
    title: "prompt · aesthetic.computer",
    desc: "Type a command to get started.",
  };
}

export { boot, sim, paint, act, meta };

// 📚 Library (Useful classes & functions used throughout the piece)
