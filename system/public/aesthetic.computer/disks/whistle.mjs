// Whistle, 2023.5.27.21.02.43
// Whistle into the microphone and receive back the same melody as sine waves.

/* #region 📚 README 
#endregion */

/* #region 🏁 TODO 
  - [-] Rethink some audio engine stuff for oscillators.
#endregion */

let mic,
  capturing = false,
  whistling = false;
const pitches = [];
const amps = [];
let pitchesIndex = 0;

// 📰 Meta
function meta() {
  return {
    title: "Whistle",
    desc: "Whistle into the microphone and receive back the same melody as sine waves.",
  };
}

// 🥾 Boot
// function boot() {
//   // Runs once at the start.
// }

// 🎨 Paint
function paint({ wipe, ink }) {
  const w = capturing ? [0, 255, 0] : 127;
  if (
    mic?.pitch &&
    mic.pitch > 0 &&
    mic.pitch !== Infinity &&
    mic.amplitude > 0.075
  ) {
    wipe(w)
      .ink(255, 0, 0)
      .write(mic.pitch.toFixed(2), { x: 4, y: 20 }, 255)
      .ink(0, 0, 255)
      .write(mic.amplitude.toFixed(2), { x: 4, y: 36 }, 255);
  } else {
    wipe(w);
  }

  if (capturing) {
    ink(255).write("WHISTLE NOW", { center: "xy" }, 0);
  }
}

// 🧮 Sim
function sim() {
  mic?.poll(); // Query for updated amplitude and waveform data.
  if (mic && capturing) {
    let pitch = mic.pitch;
    if (pitch === Infinity || pitch === null) pitch = 0;
    pitches.push(pitch);
    amps.push(mic.amplitude);
  }

  if (whistling && sine) {
    pitchesIndex = (pitchesIndex + 1) % pitches.length; // Cycle through all
    //                                                     recorded pitches.
    sine.update({
      tone: pitches[pitchesIndex],
      volume: amps[pitchesIndex],
    });
  }
}

// 🎪 Act
function act({ event: e }) {
  if (e.is("touch") && !capturing) {
    capturing = true;
    whistling = false;
    pitches.length = 0;
    pitchesIndex = 0;

    sine?.kill();
    sine = null;
  }

  if (e.is("lift") && capturing) {
    capturing = false;
    if (pitches.length > 0) whistling = true;
  }
}

let sine;

// 🥁 Beat
function beat({ sound: { microphone, square, bpm } }) {
  if (!mic) mic = microphone.connect();

  // TODO: Rethink how oscillators and one-shot sounds work.
  if (whistling && !sine) {
    sine = square({
      tone: pitches[pitchesIndex],
      volume: amps[pitchesIndex],
      beats: Infinity,
    });
  }
}

// 👋 Leave
// function leave() {
//  // Runs once before the piece is unloaded.
// }

export { meta, paint, sim, act, beat };

// 📚 Library
//   (Useful functions used throughout the piece)
