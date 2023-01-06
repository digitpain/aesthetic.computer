// No Paint
// This module contains all of the nopaint system template functionality.

// Used when defining a custom piece functions in a nopaint system brush to
// inherit common behavior.
function nopaint_boot({ paste, screen, system, painting, store }) {
  nopaint_adjust(screen, system, painting, store);
  paste(system.painting);
}

function nopaint_act({ event: e, download, screen, system, painting, store }) {
  if (e.is("keyboard:down:enter")) {
    download(`painting-${num.timestamp()}.png`, system.painting, {
      scale: 6,
      cropToScreen: true,
    });
  }

  if (e.is("reframed")) {
    nopaint_adjust(screen, system, painting, store);
    paste(system.painting);
  }
}

// 📚 Library
// Also used in `prompt`.
function nopaint_adjust(screen, sys, painting, store) {
  if (
    screen.width > sys.painting.width ||
    screen.height > sys.painting.height
  ) {
    sys.painting = painting(screen.width, screen.height, (p) => {
      p.wipe(64).paste(sys.painting);
    });
    store["painting"] = sys.painting;
  }
}

export { nopaint_boot, nopaint_act, nopaint_adjust };