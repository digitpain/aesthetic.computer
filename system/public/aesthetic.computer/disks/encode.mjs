// Encode, 23.06.11.14.33
// Converts poems to token strings.

/* #region 🏁 TODO

#endregion */

import { GPT3BrowserTokenizer } from "../dep/gpt3-tokenizer/gpt3-tokenizer.js";

const tokenizer = new GPT3BrowserTokenizer({ type: "gpt3" });

const prompt = "write a poem";

// 🛑 Intercept specific input text with a custom reply.
function halt($, text) {
  const encoded = tokenizer.encode(text);
  console.log(encoded.bpe);
  $.system.prompt.input.text = encoded.bpe.join(" ");
  console.log($.system.prompt.input);
  $.system.prompt.input.scheme = altScheme;
  $.system.prompt.input.lock = false;
  $.system.prompt.input.runnable = false;
  $.system.prompt.input.inputStarted = false;
  $.system.prompt.input.canType = false;
  $.system.prompt.input.showButton("Enter");
  $.needsPaint();
  return true;
}

const altScheme = {
  dark: {
    fg: [50, 255, 0],
    bg: [10, 20, 20],
    block: [240, 250, 10],
    blockHi: [0, 0, 0],
    line: [0, 0, 10],
  },
  light: {
    fg: [0, 200],
    bg: [170, 150, 200],
    block: [30, 200, 200],
    blockHi: [200, 200, 30],
    line: [0, 0, 0, 128],
  },
};

export const scheme = {
  dark: {
    fg: [50, 255, 0],
    bg: [180, 20, 20],
    block: [240, 250, 10],
    blockHi: [0, 0, 0],
    line: [0, 0, 10],
  },
  light: {
    fg: [0, 200],
    bg: [170, 150, 200],
    block: [30, 200, 200],
    blockHi: [200, 200, 30],
    line: [0, 0, 0, 128],
  },
};

// 💬 Receive each reply in full.
function reply(text) {
  console.log("😀 Replied with:", text);
}

export { prompt, halt, reply };
export const system = "prompt"; // or "prompt:code"
export const wrap = "word";
