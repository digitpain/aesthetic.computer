import { noteOrFreq } from "./note.mjs";
import { within, lerp } from "../num.mjs";
const { abs, floor } = Math;

export default class Sound {
  // Generic for all instruments.
  playing = true;

  #duration = 0;
  #attack = 0;
  #decay = 0;
  #decayStart;

  #volume = 1; // 0 to 1
  #futureVolume = 1;
  #pan = 0; // -1 to 1

  #progress = 0;

  #wavelength; // Calculated from the frequency.
  #futureWavelength;

  #type; // `square` or `sine`

  // Specific to Square.
  #up = false;
  #step = 0;

  // Specific to Sine.
  // ...

  constructor({ type, tone, duration, attack, decay, volume, pan }) {
    this.#type = type;

    const frequency = noteOrFreq(tone) || 1; // Frequency in samples, divided by 2 yields the period length.
    this.#wavelength = sampleRate / frequency / 2;
    this.#futureWavelength = this.#wavelength;

    this.#duration = duration;
    this.#attack = attack;
    this.#decay = decay;
    this.#pan = pan;
    this.#volume = volume;
    this.#futureVolume = this.#volume;

    this.#decayStart = this.#duration - this.#decay;
  }

  // Update certain properties whilst playing.
  update({ tone, volume }) {
    if (tone) {
      // Set futureWavelength for ramping towards.
      this.#futureWavelength = sampleRate / (noteOrFreq(tone) || 1) / 2;
      if (this.#type === "square") {
        // this.#step = 0;
        // this.#up = !this.#up;
      }
    }
    if (typeof volume === "number") this.#futureVolume = volume;
  }

  // Stereo
  pan(channel, frame) {
    if (channel === 0) {
      // Left Channel
      if (this.#pan > 0) {
        frame *= 1 - this.#pan;
      }
    } else if (channel === 1) {
      // Right Channel
      if (this.#pan < 0) {
        frame *= 1 - abs(this.#pan);
      }
    }
    return frame;
  }

  next() {
    // Channel is either 0 or 1
    // Generic for all instruments.
    let value;

    // Lerp wavelength & volume towards their future goals.
    if (!within(0.1, this.#wavelength, this.#futureWavelength)) {
      this.#wavelength = lerp(this.#wavelength, this.#futureWavelength, 0.05);
    }
    if (!within(0.01, this.#volume, this.#futureVolume)) {
      this.#volume = lerp(this.#volume, this.#futureVolume, 0.15);
    }

    // Generate square wave as we step through the wavelength.
    if (this.#type === "square") {
      // Square 🌊
      if (this.#step < this.#wavelength) {
        this.#step += 1;
      } else {
        this.#up = !this.#up;
        this.#step = 0;
      }
      value = this.#up ? 1 : -1; // Unmodified Value (either 1 or -1)
    } else if (this.#type === "sine") {
      // Sine 🌊
      value = 0; // TODO: Calculate sine wave.
    }

    // Attack Envelope (0-1)
    const attack = Math.min(1, this.#progress / this.#attack);
    value *= attack;

    // Decay Envelope (0-1)
    const decay = Math.min(
      1,
      1 - (this.#progress - this.#decayStart) / this.#decay
    );
    value *= decay;

    // Track the overall progress of the sound.
    // (Some sounds will have an Infinity duration and are killable)
    this.#progress += 1;
    if (this.#progress >= this.#duration) {
      this.playing = false;
      return 0;
    }

    return value * this.#volume;
  }

  kill() {
    this.playing = false;
  }
}
