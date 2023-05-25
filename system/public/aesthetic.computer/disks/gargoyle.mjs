// Gargoyle, 23.05.21.17.59
// Georgica's prompt programming playground.

/* #region 🏁 TODO
  + Poetic
  - [] Write several characters.
  + Techical
  - [] Multiple prompts on a page.
    - [] Make sure history works among the different prompts.
    - [] Line breaks
  - [] Add sound for `Music Box`
  -[] Decide how to get back to main navigation page *especially on mobile
  - [] Change `network failure` to `try again`
  - [] How to deal with longer responses?
  - [] Add some basic conversational support
  - [] Mobile tap to open keyboard should function better...
    - []
  - [] Movable cursor support, with arrow keys and touch to move or drag. 
    - [] Paste needs to work on movable cursor.
  - [] Add a small illustration on bottom right corner.
    - [] Painting @import.
    - [] How would this function? `paste(by("@georgica").painting())`
    - [] Make the illustration:
      - [] Implement a zoomable canvas on `rect`.
        - [] Rename `rect` to `box`.
      - [] Implement a zoomable canvas on `line`.
  - [] Add some sound.
    - [] 1/3 New synth wav types!
    - [] Custom SFX / sampling.
  + Done
  - [x] Auto-wrap the text by word in TextInput objects.
  - [x] Better text typing / replacing experience / autotype clear characters
        and skip intro space. 
  - [x] Visual failure messages if offline or given a cancelled request.
  - [x] Progress spinner / prevent interaction.
#endregion */


// // 🗨️ ??? Chain of Thought
const prompt = "";
const program = {
  before: `
 Jeffrey's Belly contents: Orange Creamsicles, Tapioca, Nuts
 
  Q: Are oranges in Jeffrey's belly?
  A: No there no oranges in Jeffrey's belly.

  Q: Are there orange creamsicles in Jeffrey's Belly?
  A: Yes there are 3 orange creamsicles in Jeffrey's Belly.

  Jeffrey's Belly contents: Orange Creamsicles, Tapioca, Nuts
  
  Q: What about 
  `,
  after: ` in his belly?`,
};





// // 🗨️ ??? SavCom
// const prompt = "what's wrong, baby?";
// const program = {
//   before:`
//   - you're playing a character who lovingly suggests a solution to the user's
//   problems 
//   - an example is, input: "I'm so stressed out," output: "I'm sorry baby, you 
//   work so hard, you should really take a break."
//   - you are replying to:`,
//   after: `
//   - you always call the user "baby"
//   - and your responses are only one sentence.
 
 
//   `,
// };



// // 🗨️ ??? Harold
// const prompt = "what are you thinking about?";
// const program = {
//   before:`
//   - you are a character that is a bird
//   - and you only write about other birds
//   - and the birds you describe are imaginary
//   - and you do not name them
//   - and you give physical descriptions
//   - and your descriptions are under 100 characters
//   - and your response does not state what it is going to do
//   - you input is:`,
//   after: `
//   - you describe an imaginary bird and mention its colors
//   - your responses always begin with "a bird flew by with..."

 
//   `,
// };



// // 🗨️ ??? Music Box
// const prompt = "write a lyric";
// const program = {
//   before:`
//   - you're playing a character who writes music
//   - you are replying to:`,
//   after: `
//   - you reply only in musical notation
 
//   `,
// };


// 🗨️ ??? Liar
// const prompt = "ask me anything but don't expect the truth";
// const program = {
//   before:`
//   - you're playing a character who is a liar
//   - you are replying to:`,
//   after: `
//   - you provide a false answer to questions
//   - you never say that you are lying, or are a liar
 
//   `,
// };

// 🗨️ Alphabetical poet 
// const prompt = "hi georgica";
// const program = {
//   before:`
//   - You respond to the input in nonsensical sentences
//   - And the words in your sentences are in alphabetical order.`,
//   after: `The words in your responses are in alphabetical order, beginning anywhere in the alphabet. You don't have to include every letter in the alphabet.`,
// };

// 🗨️ Primitive gargoyle adaptation
// const prompt = "hi georgica";
// const program = {
//   before: `
//   your name is gargoyle
//   and you are replying to:
//   `,
//   after: `
//   - and you sometimes respond in metaphor
//   - all responses are limited to 100 characters
//   - all responses provide advice
//   - some responses include questions
//   - you are apologetic if user suggests offense
//   - your tone is familiar
//   `,
// };

import { TextInput } from "../lib/type.mjs";
import { ask } from "../lib/ask.mjs";

let input,
  messageComplete = false,
  processing = false;

// 🥾 Boot (Runs once before first paint and sim)
async function boot($) {
  input = new TextInput(
    $,
    prompt,
    (text) => {
      input.blank();
      processing = input.lock = true;
      ask(
        { prompt: text, program, hint: "char" },
        function and(msg) {
          console.log(msg);
          input.text += msg;
        },
        function done() {
          // TODO: Play a sound?
          input.cursor = "stop";
          messageComplete = true;
          processing = input.lock = false;
        },
        function fail() {
          input.text = "NETWORK FAILURE";
          input.cursor = "stop";
          messageComplete = true;
          processing = input.lock = false;
        }
      );
    },
    { autolock: false, wrap: "word" }
  );
}

// 🧮 Sim(ulate) (Runs once per logic frame (120fps locked)).
function sim($) {
  input?.sim($);
}

// 🎨 Paint (Executes every display frame)
function paint($) {
  $.wipe(0);
  return input?.paint($);
}

// ✒ Act (Runs once per user interaction)
function act($) {
  const { event: e } = $;
  if (!messageComplete && !processing) input?.act($);
  if (messageComplete && (e.is("keyboard:down") || e.is("touch"))) {
    input.blank("blink"); // Clear input and switch back to blink cursor.
    input?.act($); // Capture any printable keystrokes.
    messageComplete = false;
  }
}

export { boot, sim, paint, act };

// 📚 Library (Useful functions used throughout the piece)
// ...
