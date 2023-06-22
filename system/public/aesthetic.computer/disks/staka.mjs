// Staka, 2023.6.17.17.01.49
// Stack colors with your hand!

/* #region 📚 README 
#endregion */

/* #region 🏁 TODO 
- [-] Generate falling shapes 
- [] Catch falling shapes on the line
- [] Create screen boundaries for where the console can be used  
- [] Game start, game over
- [] Hand is working/not working
- [] Levels
- [] Beeps
+ Done
- [x] Recognize shaka gesture based on T and P y values 
- [x] Draw line between T and P 
#endregion */

import { HandInput } from "../lib/hand.mjs";
let speed;
let circle, plate, touching;
let circleColor = Math.floor(Math.random() * 16777215).toString(16);
let reverseIt = false;
// 🥾 Boot
let handInput;
function boot({ num, geo, screen }) {
  // Runs once at the start.
  handInput = new HandInput();
  const radius = 16;
  circle = new geo.Circle(num.randInt(screen.width), -radius, radius);
  //   circle = new geo.Circle(screen.width / 2, screen.height / 2, radius);
}

// 🎨 Paint
function paint($) {
  const {
    wipe,
    ink,
    screen: { height },
    num,
  } = $;
  wipe(127);

  handInput.paint($, { faded: plate !== undefined }); // Uses calculated points.

  //Stuff to replace with Jeffreys code:
  function proj(a, b) {
    const k = $.num.p2.dot(a, b) / $.num.p2.dot(b, b);
    return { x: k * b.x, y: k * b.y };
  }

  let vecDistance;
  if (plate) {
    ink(255, 96).pline(
      [
        { x: plate[0][0], y: plate[0][1] },
        { x: plate[1][0], y: plate[1][1] },
      ],
      12
    );
    ink(255).line(...plate);

    let A = { x: plate[0][0], y: plate[0][1] };
    let B = { x: plate[1][0], y: plate[1][1] };
    let C = { x: circle.x, y: circle.y };

    const AC = $.num.p2.sub(C, A);
    const AB = $.num.p2.sub(B, A);

    const D = $.num.p2.add(proj(AC, AB), A);
    //Vector 1 (the center of the circle to the start of the line), Vector 2 (the start and end of the line), Vector 3 (center of circle to line)
    // ink("yellow").line(circle.x, circle.y, plate[0][0], plate[0][1]);
    // ink("blue").line(plate[0][0], plate[0][1], plate[1][0], plate[1][1]);
    // ink("red").line(circle.x, circle.y, D.x, D.y);
    vecDistance = num.dist(circle.x, circle.y, D.x, D.y);
    const AD = $.num.p2.sub(D, A);
    const k = Math.abs(AB.x) > Math.abs(AB.y) ? AD.x / AB.x : AD.y / AB.y;
    if (k > 0.0 && k < 1.0 && vecDistance < circle.radius) {
      // if plate in contact with ball
      reverseIt = true;
      speed = (Math.random() * 2) + 0.1;
    }
  }
  //Draw Circle
  ink(circleColor).circle(circle.x, circle.y, circle.radius, true);
  ink(255, 255, 0).circle(circle.x, circle.y, circle.radius);
}

// 🧮 Sim
function sim($) {
  console.log(speed);
  handInput.sim($); // Calculate the hand points.
  // Runs once per logic frame. (120fps locked.
  if (reverseIt === true) {
    circle.y -= speed;
    if (circle.y < 0) {
      console.log("gone:)");
      reverseIt = false;
    }
  } else {
    circle.y += Math.random();
  }
  const timop = handInput.timop;
  if (circle.y > $.screen.height) {
    circle.y = circle.radius;
    circle.x = $.num.randInt($.screen.width);
    circle.radius = Math.floor(Math.random() * 20) + 10;
    circleColor = Math.floor(Math.random() * 16777215).toString(16);
    speed = (Math.random() * 2) + 0.1;
}

  if (timop.length > 0) {
    const t = timop[0],
      i = timop[1],
      m = timop[2],
      o = timop[3],
      p = timop[4];

    if (
      t[1] < i[1] &&
      t[1] < m[1] &&
      t[1] < o[1] && // if t is higher than imo
      p[1] < i[1] &&
      p[1] < m[1] &&
      p[1] < o[1] // and p is higher than imo
    ) {
      plate = [timop[0], timop[4]];

      //   touching = circle.online(...plate[0], ...plate[1]);
    } else {
      plate = undefined;
    }
  }
}

// 🎪 Act
function act($) {
  handInput.act($);
  // Respond to user input here.
}

// 🥁 Beat
// function beat() {
//   // Runs once per metronomic BPM.
// }

// 👋 Leave
// function leave() {
//  // Runs once before the piece is unloaded.
// }

// 📰 Meta
function meta() {
  return {
    title: "Staka",
    desc: "Stack colors with your hand!",
  };
}

export { boot, act, meta, paint, sim };

// 📚 Library
//   (Useful functions used throughout the piece)
