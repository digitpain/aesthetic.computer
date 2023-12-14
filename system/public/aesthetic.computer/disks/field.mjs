// Field, 2023.11.30.16.05.21.050
// An open place to walk around.

/* #region 📚 README 
#endregion */

/* #region 🏁 TODO 
  - [💙] Store persistent position on the server / in the database. 
  - [] Finish "world:fields:list".
  - [] Move common functionality to a `world.mjs` library file.
  + Done
  - [x] Store local position in store.
  - [x] Make the world scrollable with some background grass.
  - [x] Always lerp towards next character positions from the network.
  - [x] Test join `field` simultaneously (with forceProd on) and ensure
        there are no race conditions or conflicts. (Implement jamsocket's locks?)
  - [x] Fix instagram not connecting error.
  - [x] Keyboard stops working after tabbing out and returning. 
    - [x] Android debugger session with @ida's phone.
  - [x] Remove gutter. 
  - [x] Add world bounds.
  - [?] Add enter key hint.
  - [x] Tapping the word in the top left corner should not flash the keyboard. 
  - [x] Get keyboard opening on Mobile Safari.
  - [x] `Escape` key should still go back to the `prompt`.
  - [x] (`) key should still go back to the `prompt`.
  - [x] Add a "special", `smile`, `frown` and `meh` command 😉. 
    - [x] Add color words to change face.
    - [x] Make sure these can be written like: `smile: chat` / using a 
         simple character on the keyboard.
  - [x] Get multi-user networking online. 
  - [x] Add an overhead chat display.
  - [x] Wire up tappable character button to activate the text input.
  - [x] Enter button should close empty prompt.
  - [x] Escape key should close prompt no matter what.
  - [x] Don't snap the cursor all the way back after hitting return
        / keep it at its position.
  - [x] Paste button does not appear when going back to the prompt
        from another piece after entering a single key.
  - [x] `Enter` button appears and disappears at weird times.
#endregion */

// 🧒
class Kid {
  net;
  pos = { x: 0, y: 0 };
  netPos;
  size = 16;
  leash = { x: 0, y: 0, len: 0, max: 12, deadzone: 8 };
  face = "meh";
  color = "white";
  #keys = { U: false, D: false, L: false, R: false };
  message;
  #messageDuration;
  #messageProgress = 0;

  constructor(handle, pos = this.pos, face, net = false) {
    console.log("🧒 From:", handle || "nub");

    this.pos = pos;
    if (net) this.netPos = { ...pos };

    this.face = face || this.face;
    this.net = net; // Is it from the network?
  }

  // Show a message above the kid's head for `time` frames.
  write(text, time = 240) {
    this.message = text;
    this.#messageDuration = time;
  }

  // Change the mood (face) of the kid.
  mood(face) {
    this.face = face;
  }

  // Change the color of the kid.
  tint(c) {
    this.color = c;
  }

  // Render the kid.
  paint({ ink, pan, text, typeface }) {
    const leash = this.leash;
    pan(this.pos.x, this.pos.y);
    ink(this.color).circle(0, 0, this.size); // Head

    // Face
    // Eyes
    ink(this.color).point(-6, -6);
    ink(this.color).point(6, -6);
    // Mouth
    if (this.face === "smile") {
      ink(this.color).line(0, 6, -6, 3);
      ink(this.color).line(0, 6, 6, 3);
    } else if (this.face === "frown") {
      ink(this.color).line(0, 3, -6, 8);
      ink(this.color).line(0, 3, 6, 8);
    } else if (this.face === "meh") {
      ink(this.color).line(-6, 6, 6, 6);
    }

    ink(leash.len > leash.deadzone ? this.color : [this.color, 128]).line(
      0,
      0,
      leash.x,
      leash.y,
    );
    if (this.message) {
      const blockWidth = typeface.glyphs["0"].resolution[0];
      const tb = text.box(
        this.message,
        undefined,
        this.message.length * blockWidth,
      );
      ink(this.color).write(this.message, {
        x: -tb.box.width / 2,
        y: -this.size - 12,
      });
    }
  }

  // Control the kid.
  act({ event: e, num }) {
    const k = this.#keys;
    const leash = this.leash;
    if (e.is("keyboard:down:w") || e.is("keyboard:down:arrowup")) k.U = true;
    if (e.is("keyboard:down:s") || e.is("keyboard:down:arrowdown")) k.D = true;
    if (e.is("keyboard:down:a") || e.is("keyboard:down:arrowleft")) k.L = true;
    if (e.is("keyboard:down:d") || e.is("keyboard:down:arrowright")) k.R = true;
    if (e.is("keyboard:up:w") || e.is("keyboard:up:arrowup")) k.U = false;
    if (e.is("keyboard:up:s") || e.is("keyboard:up:arrowdown")) k.D = false;
    if (e.is("keyboard:up:a") || e.is("keyboard:up:arrowleft")) k.L = false;
    if (e.is("keyboard:up:d") || e.is("keyboard:up:arrowright")) k.R = false;

    if (e.is("touch:1")) leash.start = { x: e.x, y: e.y };

    if (e.is("draw:1") && leash.start) {
      leash.x = e.x - leash.start.x;
      leash.y = e.y - leash.start.y;
      this.#snapLeash(num);
    }

    if (e.is("lift:1")) leash.start = null;
  }

  // Simulate the kid's movement and time messages.
  sim({ num }, net) {
    // 🗼 Network Prediction
    if (this.net && this.netPos) {
      this.pos.x = num.lerp(this.pos.x, this.netPos.x, 0.25);
      this.pos.y = num.lerp(this.pos.y, this.netPos.y, 0.25);
      return; // No need to compute movements, locally.
    }

    // Local simulation.

    // 🗨️ Message
    if (this.message) {
      if (this.#messageProgress < this.#messageDuration) {
        this.#messageProgress += 1;
      } else {
        this.message = null;
        this.#messageProgress = 0;
        net?.({ clear: true });
      }
    }

    // 🏃 Movement
    const k = this.#keys,
      leash = this.leash,
      pos = this.pos;

    if (k.U) leash.y -= 1;
    if (k.D) leash.y += 1;
    if (k.L) leash.x -= 1;
    if (k.R) leash.x += 1;

    this.#snapLeash(num);

    if (!leash.start) {
      leash.y *= 0.97;
      leash.x *= 0.97;
    }

    const newPos = { ...pos };
    if (leash.len > leash.deadzone) {
      newPos.x = num.lerp(pos.x, pos.x + leash.x, 0.075);
      newPos.y = num.lerp(pos.y, pos.y + leash.y, 0.075);
    } else if (leash.len > 1) {
      newPos.x = num.lerp(pos.x, pos.x + leash.x, 0.025);
      newPos.y = num.lerp(pos.y, pos.y + leash.y, 0.025);
    }

    // Run the net callback whenever the position changes.
    if (newPos.x !== pos.x || newPos.y !== pos.y) net?.({ pos });

    pos.x = newPos.x;
    pos.y = newPos.y;

    if (pos.x < 0) pos.x = 0;
    if (pos.x > world.size.width) pos.x = world.size.width;
    if (pos.y < 0) pos.y = 0;
    if (pos.y > world.size.height) pos.y = world.size.height;
  }

  // Limit the kid's movement leash.
  #snapLeash(num) {
    const leash = this.leash;
    leash.len = num.p2.len(leash);
    if (leash.len > leash.max) {
      const scale = leash.max / leash.len;
      leash.x *= scale;
      leash.y *= scale;
    }
  }

  // Kill all controls.
  off() {
    const k = this.#keys;
    k.U = k.D = k.L = k.R = false;
    this.leash.start = null;
  }

  // Return the screen position of this kid, given a camera and world,
  screenPos(cam, world) {
    return { x: cam.x + this.pos.x, y: cam.y + this.pos.y };
  }
}

// 🌎
class World {
  size = {};
  constructor(width = 192, height = 192) {
    this.size.width = width;
    this.size.height = height;
  }

  paint({ ink }) {
    ink("green").box(0, 0, this.size.width, this.size.height);
  }
}

// 🎥
class Cam {
  x = 0;
  y = 0;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

let me, world, cam, input, inputBtn, server;
const scenery = {
  grasses: [
    { x: 190, y: 170 },
    { x: 276, y: 286 },
    { x: 128, y: 128 },
    { x: 400, y: 400 },
    { x: 500, y: 512 },
  ],
};
const kids = {};

const { keys } = Object;

// 🥾 Boot
async function boot({
  api,
  help,
  wipe,
  handle,
  screen,
  ui,
  send,
  net: { socket },
  sound,
  store,
}) {
  // ✨ Initialization & Interface
  wipe(0);
  world = new World(512, 512);
  const pos = (await store.retrieve("field:pos")) || {
    x: undefined,
    y: undefined,
  };

  me = new Kid(
    handle(),
    { x: pos.x || world.size.width / 2, y: pos.y || world.size.height / 2 },
    help.choose("meh", "smile", "frown"),
  );
  cam = new Cam(
    screen.width / 2 - me.pos.x,
    screen.height / 2 - me.pos.y,
  );

  const scheme = {
    dark: {
      fg: 255,
      bg: [0, 100],
      block: 255,
      blockHi: 0,
      line: 255,
    },
  };

  input = new ui.TextInput(
    api,
    "...",
    async (text) => {
      if (
        input.text === "smile" ||
        input.text === "frown" ||
        input.text === "sad" ||
        input.text === "meh"
      ) {
        if (input.text === "sad") input.text = "frown";
        me.mood(input.text);
        server.send("world:field:mood", me.face); // Send to server.
      } else if (
        input.text === "red" ||
        input.text === "yellow" ||
        input.text === "orange" ||
        input.text === "black" ||
        input.text === "brown" ||
        input.text === "purple" ||
        input.text === "pink" ||
        input.text === "blue" ||
        input.text === "lime" ||
        input.text === "white"
      ) {
        me.tint(input.text);
        server.send("world:field:tint", me.color); // Send to server.
      } else {
        me.write(input.text); // Display message on 🧒.
        server.send("world:field:write", me.message); // Send to server.
      }

      // Clear text, hide cursor block, and close keyboard.
      input.text = "";
      input.showBlink = false;
      input.mute = true;
      send({ type: "keyboard:close" });
    },
    {
      // autolock: false,
      // wrap,
      scheme,
      // copied,
      // activated,
      // didReset: () => {
      // messageComplete = true;
      // },
      // gutterMax,
      // lineSpacing,
      hideGutter: true,
      closeOnEmptyEnter: true,
    },
  );

  inputBtn = new ui.Button();

  send({ type: "keyboard:soft-lock" });

  // Socket Networking
  server = socket((id, type, content) => {
    if (type === "left") {
      console.log("️✌️ Goodbye:", id);
      delete kids[id];
      return;
    }

    if (type === "joined") {
      console.log("️👋 Hello:", id);
      return;
    }

    if (type.startsWith("connected")) {
      server.send("world:field:join", { handle: me.handle, pos: me.pos });
      console.log("🪴 Welcome:", me.handle || "nub", `(${id})`);
      return;
    }

    // TODO: How can this be oriented around storing a server list.
    if (type === "world:field:list") {
      console.log("🗞️ Listing all field clients...");
      keys(content).forEach((key) => {
        console.log(key, content[key]);
      });
      return;
    }

    if (server.id !== id) {
      if (type === "world:field:tint") {
        const kid = kids[id];
        if (kid) kid.tint(content);
      }

      if (type === "world:field:mood") {
        const kid = kids[id];
        if (kid) kid.mood(content);
      }

      if (type === "world:field:write") {
        const kid = kids[id];
        if (kid) {
          kid.write(content);
          sound.synth({
            type: "sine",
            tone: 950,
            attack: 0.1,
            decay: 0.96,
            volume: 0.65,
            duration: 0.015,
          });
        }
      }

      if (type === "world:field:write:clear") {
        const kid = kids[id];
        if (kid) kid.write(null);
      }

      if (type === "world:field:join") {
        if (!kids[id]) {
          kids[id] = new Kid(content.handle || id, content.pos, me.face, true);
          server.send("world:field:join", {
            handle: me.handle,
            pos: me.pos,
            face: me.face,
          });
        }
      }

      if (type === "world:field:move") {
        const kid = kids[id];
        if (kid) kid.netPos = content.pos;
      }
    }
  });
}

// 🎨 Paint
function paint({ api, wipe, layer, ink, pan, unpan, pen, screen, leaving }) {
  wipe(0); // 🖼️ Backdrop

  layer(0);
  // 🌎 + 🧒 World & Players
  pan(cam.x, cam.y);
  world.paint(api);

  scenery.grasses.forEach((grass) => {
    ink("lime")
      .line(grass.x, grass.y, grass.x, grass.y - 10)
      .line(grass.x, grass.y, grass.x - 5, grass.y - 6)
      .line(grass.x, grass.y, grass.x + 5, grass.y - 6);
  });

  // layer(1);

  inputBtn.paint((btn) => {
    ink("white", btn.down && btn.over ? 128 : 64).circle(
      me.pos.x,
      me.pos.y,
      btn.box.w / 2,
      true,
    );
  });

  me.paint(api);

  unpan();

  keys(kids).forEach((key) => {
    pan(cam.x, cam.y);
    const kid = kids[key];
    kid.paint(api);
    unpan();
  });

  // 💻 Screen UI
  const l = me.leash;
  if (l.start) {
    if (pen) ink(0, 255, 0, 90).line(l.start.x, l.start.y, pen.x, pen.y);
    ink(l.len > l.deadzone ? "yellow" : "red").line(
      l.start.x,
      l.start.y,
      l.start.x + me.leash.x,
      l.start.y + me.leash.y,
    );
  }

  if (input.canType && !leaving()) {
    input.paint(api, false, {
      x: 0,
      y: 18,
      width: screen.width,
      height: screen.height - 18,
    });
  }

  // layer(0);
  // pan(cam.x, cam.y);
  // unpan();
}

// 🎪 Act
function act({ event: e, api, send, jump, hud, piece, screen }) {
  if (e.is("reframed")) {
    cam.x = screen.width / 2 - world.size.width / 2;
    cam.y = screen.height / 2 - world.size.width / 2;
  }

  if (!input.canType) {
    me.act(api);

    function open() {
      me.off();
      // send({ type: "keyboard:open" }); // Keyboard will open automatically
      //                                     because of the unlocking logic.
    }

    inputBtn.act(e, {
      down: () => {
        send({ type: "keyboard:soft-unlock" });
      },
      push: () => {
        open();
        send({ type: "keyboard:soft-lock" });
      },
      cancel: () => {
        send({ type: "keyboard:soft-lock" });
      },
      rollout: () => {
        send({ type: "keyboard:soft-lock" });
      },
      rollover: () => {
        if (inputBtn.down) send({ type: "keyboard:soft-unlock" });
      },
    });

    if (e.is("keyboard:down:enter")) {
      send({ type: "keyboard:open" });
      open();
    }

    if (e.is("keyboard:down:escape") || e.is("keyboard:down:`")) jump("prompt");
    if (e.is("keyboard:down:backspace")) {
      jump(`prompt~${hud.currentLabel.text || piece}`)(() => {
        send({ type: "keyboard:open" });
      });
    }
  }

  if (
    input.canType &&
    (e.is("keyboard:down:escape") ||
      (input.text.trim().length === 0 &&
        e.is("keyboard:down:enter") &&
        !e.shift))
  ) {
    send({ type: "keyboard:close" });
  }

  if (input.canType && e.is("lift") && !input.shifting) {
    send({ type: "keyboard:close" });
  }

  if (
    e.is("keyboard:open") ||
    e.is("keyboard:close") ||
    (input.canType && !e.is("keyboard:down:escape"))
  ) {
    if (e.is("keyboard:close")) input.text = "";
    input.act(api);
  }
}

// 🧮 Sim
function sim({ api, geo, simCount, screen }) {
  me.sim(api, function net(kid) {
    if (simCount % 4n === 0n) {
      // Send position updates at a rate of 30hz  (120 / 4).
      if (kid.pos) server.send("world:field:move", kid);
    }
    if (kid.clear) server.send("world:field:write:clear", kid);
  }); // 🧒 Movement
  me.screenPos(cam, world);

  cam.x = screen.width / 2 - me.pos.x; //world.size.width / 2;// - me.pos.x;
  cam.y = screen.height / 2 - me.pos.y; //world.size.height / 2;// - me.pos.y;

  keys(kids).forEach((key) => kids[key].sim(api)); // Networked kids.
  input.sim(api); // 💬 Chat

  const btnPos = me.screenPos(cam, world); // Button to activate prompt.
  inputBtn.box = new geo.Box(
    btnPos.x - me.size,
    btnPos.y - me.size,
    me.size * 2,
  );
}

// 🥁 Beat
// function beat() {
//   // Runs once per metronomic BPM.
// }

// 👋 Leave
function leave({ store }) {
  // Persist current position.
  store["field:pos"] = me.pos;
  store.persist("field:pos");
}

// 📰 Meta
function meta() {
  return {
    title: "Field",
    desc: "An open place to walk around.",
  };
}

// 🖼️ Preview
// function preview({ ink, wipe }) {
// Render a custom thumbnail image.
// }

// 🪷 Icon
// function icon() {
// Render an application icon, aka favicon.
// }

export const system = "world";
export { boot, paint, act, sim, leave, meta };

// 📚 Library
//   (Useful functions used throughout the piece)
