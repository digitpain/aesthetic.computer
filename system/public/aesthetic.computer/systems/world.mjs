// World (System), 23.12.18.22.48
// This module contains all of the world system functionality.
// Worlds are multi-user, interconnected rooms.

/* #region 🏁 TODO 
  - [] Camera snap after move. 
#endregion */

let me, world, cam, input, inputBtn, server;

const kids = {};

const { keys, values } = Object;

async function world_boot({
  api,
  help,
  handle,
  screen,
  ui,
  send,
  net: { socket },
  sound,
  store,
  piece,
}) {
  // ✨ Initialization & Interface
  world = new World(512, 512);
  const pos = (await store.retrieve(`${piece}:pos`)) || {
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
    me.pos,
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
        server.send(`world:${piece}:mood`, me.face); // Send to server.
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
        server.send(`world:${piece}:tint`, me.color); // Send to server.
      } else {
        me.write(input.text); // Display message on 🧒.
        server.send(`world:${piece}:write`, me.message); // Send to server.
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

  // 🧦 Socket Networking
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
      if (me.handle === "?") me.handle = `nub${id}`;
      server.send(`world:${piece}:join`, {
        handle: me.handle,
        pos: me.pos,
        face: me.face,
      });
      console.log("🪴 Welcome:", me.handle, `(${id})`);
      return;
    }

    // TODO: How can this be oriented around storing a server list.
    if (type === `world:${piece}:list`) {
      // console.log("🗞️ Listing all field clients...");
      keys(content).forEach((key) => {
        if (!kids[key]) {
          const data = content[key];
          console.log("🧒 Joined:", data.handle || id, data);
          kids[key] = new Kid(
            data.handle || `nub${id}`,
            data.pos,
            data.face,
            true,
          );
        }
      });
      return;
    }

    if (type === `world:${piece}:join`) {
      if (!kids[id]) {
        kids[id] = new Kid(
          content.handle || `nub${id}`,
          content.pos,
          content.face,
          true,
        );
      }
    }

    // TODO: Stop receiving own messages?
    // if (server.id !== id) {
    if (type === `world:${piece}:tint`) {
      const kid = kids[id];
      if (kid) kid.tint(content);
    }

    if (type === `world:${piece}:mood`) {
      const kid = kids[id];
      if (kid) kid.mood(content);
    }

    if (type === `world:${piece}:write`) {
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

    if (type === `world:${piece}:write:clear`) {
      const kid = kids[id];
      if (kid) kid.write(null);
    }

    if (type === `world:${piece}:move`) {
      const kid = kids[id];
      if (kid) kid.netPos = content.pos;
    }
    // }
  });
}

function world_paint(
  { api, ink, pan, unpan, pen, screen, leaving },
  paint,
  curtain,
) {
  // 🌎 + 🧒 World & Players
  pan(cam.x, cam.y);

  paint?.(api, world);

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

  // Other kids.
  keys(kids).forEach((key) => {
    pan(cam.x, cam.y);
    const kid = kids[key];
    kid.paint(api);
    unpan();
  });

  // TODO: Make this a generic module for printing user lists? 23.12.04.15.47
  [me, ...values(kids)].forEach((kid, i) => {
    const row = i * 12;
    ink("black").write(kid.handle, { x: 7, y: 21 + 1 + row });
    ink("cyan").write(kid.handle, { x: 6, y: 21 + row });
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

  curtain?.(api); // Paint anything on top of world but under input.

  if (input.canType && !leaving()) {
    input.paint(api, false, {
      x: 0,
      y: 18,
      width: screen.width,
      height: screen.height - 18,
    });
  }
}

function world_act({ event: e, api, send, jump, hud, piece, screen }) {
  if (e.is("reframed")) {
    cam.x = screen.width / 2 - dolly.x;
    cam.y = screen.height / 2 - dolly.y;
  }

  if (!input.canType) {
    me.act(api);

    inputBtn.act(e, {
      down: () => {
        send({ type: "keyboard:soft-unlock" });
      },
      push: () => {
        me.off();
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

    if (
      !input.canType &&
      e.is("keyboard:down:enter") // ||
      // e.is("keyboard:down:escape") ||
      // e.is("keyboard:down:`")
    ) {
      send({ type: "keyboard:open" });
      me.off();
    }

    if (e.is("keyboard:down:escape") || e.is("keyboard:down:`")) jump("prompt");

    // Backspace back to `prompt`.
    if (e.is("keyboard:down:backspace")) {
      jump(`prompt~${hud.currentLabel.text || piece}`)(() => {
        send({ type: "keyboard:open" });
      });
    }
  }

  if (
    input.canType &&
    (e.is("keyboard:down:`") ||
      e.is("keyboard:down:escape") ||
      (input.text.trim().length === 0 &&
        e.is("keyboard:down:enter") &&
        !e.shift))
  ) {
    send({ type: "keyboard:close" });
  }

  if (input.canType && e.is("lift") && !input.shifting && !input.paste.down) {
    send({ type: "keyboard:close" });
  }

  if (
    e.is("keyboard:open") ||
    e.is("keyboard:close") ||
    (input.canType && !e.is("keyboard:down:escape"))
  ) {
    // if (e.is("keyboard:close")) input.text = "";
    input.act(api);
  }
}

function world_sim({ api, geo, simCount, screen, num }) {
  me.sim(api, function net(kid) {
    if (simCount % 4n === 0n) {
      // Send position updates at a rate of 30hz  (120 / 4).
      if (kid.pos) server.send("world:field:move", kid);
    }
    if (kid.clear) server.send("world:field:write:clear", kid);
  }); // 🧒 Movement

  cam.dolly.x = num.lerp(cam.dolly.x, me.pos.x, 0.05);
  cam.dolly.y = num.lerp(cam.dolly.y, me.pos.y, 0.05);

  cam.x = screen.width / 2 - cam.dolly.x;
  cam.y = screen.height / 2 - cam.dolly.y;

  keys(kids).forEach((key) => kids[key].sim(api)); // Networked kids.
  input.sim(api); // 💬 Chat

  const btnPos = me.screenPos(cam, world); // Button to activate prompt.
  inputBtn.box = new geo.Box(
    btnPos.x - me.size,
    btnPos.y - me.size,
    me.size * 2,
  );
}

function world_leave({ store, piece }) {
  store[`world:${piece}:pos`] = me.pos; // Persist current position.
  store.persist(`world:${piece}:pos`);
}

// Determines whether the world covers the whole screen or not.
// (Used to toggling backdrop.)
function coversScreen(screen) {
  return (
    cam.x <= 0 &&
    cam.y <= 0 &&
    cam.x + world.size.width > screen.width &&
    cam.y + world.size.height > screen.height
  );
}

export {
  world_boot,
  world_paint,
  world_sim,
  world_act,
  world_leave,
  coversScreen,
};

// 🧒
class Kid {
  handle;
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

  constructor(handle = "?", pos = this.pos, face, net = false) {
    this.handle = handle;
    console.log("🧒 From:", this.handle, face);

    this.pos = pos;
    if (net) this.netPos = { ...pos };

    this.face = face || this.face;
    this.net = net; // Is it from the network?
  }

  // Show a message above the kid's head for `time` frames.
  write(text, time = 320) {
    this.message = text;
    this.#messageDuration = time;
    this.#messageProgress = 0; // Reset message progress.
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
      const p2 = num.p2;
      const STEP_SIZE = 1;
      const direction = p2.norm(p2.sub(this.netPos, this.pos));
      const distance = p2.len(p2.sub(this.netPos, this.pos));
      if (distance < STEP_SIZE) {
        this.pos = this.netPos; // Set position to target.
      } else {
        this.pos = p2.inc(this.pos, p2.scl(direction, STEP_SIZE));
      }
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
  get width() {
    return this.size.width;
  }

  get height() {
    return this.size.height;
  }
}

// 🎥
class Cam {
  x = 0;
  y = 0;
  dolly = { x: 0, y: 0 };

  constructor(x, y, dolly) {
    this.x = x;
    this.y = y;
    this.dolly = { ...dolly };
  }
}
