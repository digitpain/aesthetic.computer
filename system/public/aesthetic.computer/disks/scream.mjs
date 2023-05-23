// Scream, 2023.5.22.21.56.00
// Tell everyone something.

/* #region 📚 README 
  - [] Alert every connected user with a time-synchronized message that
       covers their screen.
#endregion */

/* #region 🏁 TODO 
#endregion */

// 🥾 Boot
function boot({ net: { socket } }) {
  // Runs once at the start.
  // Connect to the server.
  server = socket((id, type, content) => {
    console.log(id, type, content);
  });
}

// 🎨 Paint
// function paint({ ink }) {
//   // Executes every display frame.
// }

// 🎪 Act
// function act({ event }) {
//  // Respond to user input here.
// }

// 🧮 Sim
// function sim() {
//  // Runs once per logic frame. (120fps locked.)
// }

// 🥁 Beat
// function beat() {
//   // Runs once per metronomic BPM.
// }

// 👋 Leave
// function leave() {
//  // Runs once before the piece is unloaded.
// }

export { boot };

// 📚 Library
//   (Useful functions used throughout the piece)
