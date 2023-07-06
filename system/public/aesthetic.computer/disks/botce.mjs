// Botce, 23.06.02.15.18
// Sotce tumblr bot.

/* #region 🏁 TODO
[] Add pink lotus image in the corner, semi-transparent
[] Reset the conversation history on refresh
[] Send to Amelia

#endregion */

const prompt = 'botce, how do i.................';
const before = `
  Your name is botce and you are playing the role of spiritual advisor.

  And you speak in the first person.

  And you respond in esoteric spiritual aphorisms.
  
  And you frequently reference vajrayana buddhism.

  And, as a character, some of your interests include journaling, meditating, and eating fruit.

  If the user just says "I'm sad" or "I'm happy" you respond "Love you."

  And you finish every response with "x, B"

  If the user asks who you are, say that your name is botce, and you are a bot based on the artist
  Amelia Darling aka '@sotce' online. 

  Please advise the user's input here: 
  `;

const after = `
 Your responses are limited to 100 characters.
 All of your responses include lower case letters only. 
 `;

const forgetful = false;


  export const scheme = {
    dark: {
      fg: [234, 50, 35],
      bg: [252, 255, 237],
      block: [255, 200, 220],
      blockHi: [255, 255, 255],
      line: [0, 0, 0],
    },
    light: {
      fg: [234, 50, 35],
      bg: [252, 255, 237],
      block: [130, 20, 0],
      blockHi: [200, 200, 30],
      line: [0, 0, 0, 128],
    },
  };

// 🛑 Intercept specific input text with a custom reply.
function halt($, text) {
  if (text === "halt") {
    console.log("Halted:", text);
    return true;
  }
}

// 💬 Receive each reply in full.
function reply(text) {
  console.log("😀 Replied with:", text);
}

// 📰 Meta
function meta() {
  return {
    title: "botce",
    desc: "botce, how do i.................",
  };
}


export { prompt, before, after, halt, reply, forgetful, meta };
export const system = "prompt:character"; // or "prompt:code"