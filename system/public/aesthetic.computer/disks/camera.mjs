// Camera, 2022.6.19.11.16
// A simple piece for taking stills and pasting them to the system painting.

/* #region 🏁 todo
  - [] Add piece API for updating zoom level and switching between
        Front and Rear cameras / updating constraints.
  - [] If user doesn't accept camera, then we send the back to prompt with
     an error message of some kind.
  - [] Camera needs a "title" screen if camera isn't already enabled.
+ Later
  - [] See `bios.mjs:2431` for GPU style video effects.
+ Done
  - [x] Reset / re-frame video on window resize. 
  - [x] Make sure iOS passes video-data in per each frame.
  - [x] Test mobile Safari 
  - [x] Automatically paint the whole buffer on leave by default.
  - [x] Add software shaders.
  - [x] Add this camera to the "nopaint" system!
  - [x] Camera needs to take up the whole display by default. 
#endregion */

let vid;

// 🎨 Paint (Runs once per display refresh rate)
export function paint({
  wipe,
  paste,
  video,
  screen: { created, resized, width, height },
  num: { randIntRange, clamp, rand },
}) {
  // Initialize or update video feed.
  if (created || resized) {
    wipe(0);
    vid = video(created ? "camera" : "camera:update", { width, height });
  }

  // Draw the video on each frame and add an effect.
  const frame = vid(function shader({ x, y }, c) {
    // ✨ Sparkles
    if (rand() > 0.98) {
      c[0] = clamp(c[0] + randIntRange(50, 150), 0, 255);
      c[1] = clamp(c[1] + randIntRange(50, 150), 0, 255);
      c[2] = clamp(c[2] + randIntRange(50, 150), 0, 255);
    }

    // Fade
    if (rand() > 0.1) {
      c[3] = randIntRange(0, 5);
    }
  });

  paste(frame); // Paste the video to the main buffer.
}

export const system = "nopaint";

// 📚 Library (Useful functions used throughout the program)
// ...
