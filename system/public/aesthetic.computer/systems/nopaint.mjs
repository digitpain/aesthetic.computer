// No Paint
// This module contains all of the nopaint system template functionality.

// Used when defining a custom piece functions in a nopaint system brush to
// inherit common behavior.
function nopaint_boot({ api, screen, system, painting, store }) {
  nopaint_adjust(screen, system, painting, store);
  system.nopaint.present(api);
}

function nopaint_act({
  event: e,
  download,
  screen,
  system,
  painting,
  loading,
  store,
  reload,
  api,
}) {
  if (e.is("keyboard:down:enter")) {
    download(`painting-${num.timestamp()}.png`, system.painting, {
      scale: 6,
      cropToScreen: true,
    });
  }

  if (e.is("reframed")) {
    nopaint_adjust(screen, system, painting, store);
    system.nopaint.present(api);
  }

  // No and then reload the same brush / reload without storing
  // the painting.
  if (e.is("keyboard:down:n") && !loading) {
    system.nopaint.abort();
    reload();
  }

  // Paint and then reload the same brush.
  if (e.is("keyboard:down:p") && !loading) reload();
}

// 📚 Library
// Adjust painting resolution dynamically to match the screen,
// or provide a custom one.
// (Also used in `prompt`.)
function nopaint_adjust(screen, sys, painting, store, size = null) {
  if (!size && store["painting:resolution-lock"] === true) return;

  const width = size?.w || screen.width;
  const height = size?.h || screen.height;
  sys.painting = painting(width, height, (p) => {
    p.wipe(64).paste(sys.painting);
  });
  store["painting"] = sys.painting;

  // Set a flag to prevent auto-resize.
  if (size) {
    store["painting:resolution-lock"] = true;
    store.persist("painting:resolution-lock", "local:db");
  }
}

export { nopaint_boot, nopaint_act, nopaint_adjust };
