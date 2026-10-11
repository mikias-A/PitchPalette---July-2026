
const BOARD_X = 40;      // left edge of the drawing board
const BOARD_Y = 60;      // top edge of the drawing board
const BOARD_W = 720;     // board width
const BOARD_H = 300;     // board height
const BAND_H = BOARD_H / 8;   // a note covers 1/8th of the screen
const ROUND_MS = 20000;  // one round lasts 20 seconds
const SPEED = 120;       // canvas scrolling speed
const MARK_MS = 40;      // how much "time" each stroke covers

const NOTE_NAMES = ["low D", "E", "F", "G", "A", "B", "C", "high D"];
const KEY_CHARS  = ["A", "S", "D", "F", "G", "H", "J", "K"];

// Bigger number = higher sound
const NOTE_FREQS = [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33];

let screen = "title";    // home screen
let roundStart = 0;     
let allMarks = [];       // every dab of paint ever made (all rounds)
let pianoKeys = [];      // the 8 piano keys
let colors = [];         // the color choices
let chosenColor;         // the current paint color
let audioCtx = null;     // browser sound engine

//piano key
class PianoKey {
  constructor(index, x, y, w, h) {
    this.index = index;               // 0 = low D ... 7 = high D
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.name = NOTE_NAMES[index];
    this.keyChar = KEY_CHARS[index];
    this.isDown = false;              // true while you hold the key

    // Sound is made only while a key is held
    this.freq = NOTE_FREQS[index];
    this.osc = null;                  // the tone makers for this key
    this.osc2 = null;
    this.gain = null;                 // the volume for this key
  }

  // "start sound when key goes down"
  press() {
    if (this.isDown) return;         
    this.isDown = true;
    this.startSound();
  }

  // end sound
  release() {
    if (!this.isDown) return;
    this.isDown = false;
    this.stopSound();
  }


  startSound() {
    if (!audioCtx) return;            // sound not unlocked yet
    let now = audioCtx.currentTime;

    // volume knob: pops up fast, then fades
    this.gain = audioCtx.createGain();
    this.gain.gain.setValueAtTime(0, now);
    this.gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
    this.gain.gain.exponentialRampToValueAtTime(0.08, now + 0.7);
    this.gain.connect(audioCtx.destination);

    // main tone
    this.osc = audioCtx.createOscillator();
    this.osc.type = "triangle";
    this.osc.frequency.value = this.freq;
    this.osc.connect(this.gain);
    this.osc.start(now);

    // second tone, one octave higher and quieter
    let quiet = audioCtx.createGain();
    quiet.gain.value = 0.3;
    quiet.connect(this.gain);
    this.osc2 = audioCtx.createOscillator();
    this.osc2.type = "sine";
    this.osc2.frequency.value = this.freq * 2;
    this.osc2.connect(quiet);
    this.osc2.start(now);
  }

  // Fade the sound out
  stopSound() {
    if (!this.osc) return;
    let now = audioCtx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + 0.3);
    this.osc.stop(now + 0.35);
    this.osc2.stop(now + 0.35);
    this.osc = null;
    this.osc2 = null;
    this.gain = null;
  }

  show() {
    stroke(0);
    strokeWeight(2);
    if (this.isDown) {
      fill(chosenColor);              // key lights up in your color
    } else {
      fill(255);
    }
    rect(this.x, this.y, this.w, this.h, 0, 0, 8, 8);

    noStroke();
    fill(this.isDown ? 255 : 0);
    textAlign(CENTER, CENTER);
    textSize(22);
    text(this.keyChar, this.x + this.w / 2, this.y + this.h - 50);
    textSize(14);
    text(this.name, this.x + this.w / 2, this.y + this.h - 22);
  }
}


//the stroke itself
class Mark {
  constructor(time, noteIndex, col) {
    this.time = time;           // milliseconds since the round started
    this.noteIndex = noteIndex; // scale from 0-8
    this.col = col;
  }

  // x = where to draw it, w = how wide it is
  show(x, w) {
    // high notes go UP, so flip the index
    let y = BOARD_Y + (7 - this.noteIndex) * BAND_H;
    noStroke();
    fill(this.col);
    rect(x, y + 4, w, BAND_H - 8, 3);
  }
}


function setup() {
  createCanvas(800, 560);

  colors = [
    color(220, 30, 30),    // red
    color(255, 140, 0),    // orange
    color(250, 200, 0),    // yellow
    color(40, 170, 70),    // green
    color(40, 100, 220),   // blue
    color(140, 60, 200),   // purple
    color(20, 20, 20)      // black
  ];
  chosenColor = colors[0]; // start with red

  // build the 8 piano keys, side by side under the board
  let keyW = BOARD_W / 8;
  for (let i = 0; i < 8; i++) {
    pianoKeys.push(new PianoKey(i, BOARD_X + i * keyW, 395, keyW, 140));
  }
}

//draws the app
function draw() {
  background(255);

  if (screen === "title") {
    drawTitle();
  } else if (screen === "play") {
    drawPlay();
  } else if (screen === "review") {
    drawReview();
  }
}


//title
function drawTitle() {
  // outer frame
  noFill();
  stroke(0);
  strokeWeight(5);
  rect(30, 30, 740, 500);

  noStroke();
  fill(0);
  textFont("cursive");
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Pitch Palette!", width / 2, 100);
  textFont("sans-serif");

  // yellow play button: circle + triangle
  noFill();
  stroke(250, 200, 0);
  strokeWeight(5);
  ellipse(width / 2, 270, 170, 150);
  noStroke();
  fill(250, 200, 0);
  triangle(365, 225, 365, 315, 445, 270);

  fill(0);
  textSize(18);
  text("Pick your color, then press play", width / 2, 400);
  drawSwatches(450);
}


//the game itself
function drawPlay() {
  let elapsed = millis() - roundStart;   // how long this round has been running

  // round over? see the art
  if (elapsed >= ROUND_MS) {
    endRound();
    return;
  }

  // allows for multiple keys
  for (let i = 0; i < pianoKeys.length; i++) {
    if (pianoKeys[i].isDown) {
      allMarks.push(new Mark(elapsed, i, chosenColor));
    }
  }

  drawBoardBackground(true);

  // Draw every mark. and move them all to the left as time goes on
  for (let i = 0; i < allMarks.length; i++) {
    let m = allMarks[i];
    let x = BOARD_X + BOARD_W - (elapsed - m.time) * SPEED / 1000;
    let w = MARK_MS * SPEED / 1000;
    if (x + w > BOARD_X && x < BOARD_X + BOARD_W) {
      m.show(x, w);
    }
  }

  // cover the overflow on the left and right
  noStroke();
  fill(255);
  rect(0, BOARD_Y - 5, BOARD_X - 2, BOARD_H + 10);
  rect(BOARD_X + BOARD_W + 2, BOARD_Y - 5, BOARD_X, BOARD_H + 10);

  drawBoardFrame();

  for (let i = 0; i < pianoKeys.length; i++) {
    if (pianoKeys[i].isDown) {
      let y = BOARD_Y + (7 - i) * BAND_H + BAND_H / 2;
      fill(chosenColor);
      stroke(0);
      strokeWeight(2);
      ellipse(BOARD_X + BOARD_W, y, 18, 18);
    }
  }

  // time up top
  noStroke();
  fill(230);
  rect(BOARD_X, 25, BOARD_W, 10, 5);
  fill(chosenColor);
  rect(BOARD_X, 25, BOARD_W * (elapsed / ROUND_MS), 10, 5);

  // 6) Piano
  for (let i = 0; i < pianoKeys.length; i++) {
    pianoKeys[i].show();
  }

  // 7) "End early" button
  drawButton("End early (Enter)", 590, 364, 170, 28);
}


//review screen
function drawReview() {
  drawBoardBackground(false);

  // the whole round squeezed onto the board so you can see everything
  for (let i = 0; i < allMarks.length; i++) {
    let m = allMarks[i];
    let x = BOARD_X + (m.time / ROUND_MS) * BOARD_W;
    let w = (MARK_MS / ROUND_MS) * BOARD_W;
    m.show(x, w);
  }
  drawBoardFrame();

  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Your painting! Pick a color and go again:", width / 2, 30);

  drawSwatches(400);

  // buttons
  drawButton("Go again", 180, 450, 180, 50);
  drawButton("Clear & start over", 440, 450, 180, 50);
}


// The light-gray board with faint lines between the 8 note bands.
// If showNames is true, also write each note's name on the left.
function drawBoardBackground(showNames) {
  noStroke();
  fill(245);
  rect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

  // faint lines between bands, plus a glow on bands whose key is held
  for (let i = 0; i < 8; i++) {
    let y = BOARD_Y + (7 - i) * BAND_H;
    if (pianoKeys[i].isDown && screen === "play") {
      // Make a see-through version using the color's red/green/blue numbers.
      fill(red(chosenColor), green(chosenColor), blue(chosenColor), 50);
      noStroke();
      rect(BOARD_X, y, BOARD_W, BAND_H);   // feedback: band glows
    }
    stroke(220);
    strokeWeight(1);
    line(BOARD_X, y, BOARD_X + BOARD_W, y);
  }
}

function drawBoardFrame() {
  noFill();
  stroke(0);
  strokeWeight(3);
  rect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
}

// row of color circles
function drawSwatches(y) {
  for (let i = 0; i < colors.length; i++) {
    let x = swatchX(i);
    // pick the circle that matches the chosen color
    if (colors[i] === chosenColor) {
      stroke(0);
      strokeWeight(4);
    } else {
      noStroke();
    }
    fill(colors[i]);
    ellipse(x, y, 40, 40);
  }
}

// Where the swatch i sits horizontally
function swatchX(i) {
  return width / 2 + (i - (colors.length - 1) / 2) * 60;
}

function drawButton(label, x, y, w, h) {
  stroke(0);
  strokeWeight(3);
  fill(250, 200, 0);
  rect(x, y, w, h, 10);
  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(18);
  text(label, x + w / 2, y + h / 2);
}

function mouseInside(x, y, w, h) {
  return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
}

function startRound() {
  roundStart = millis();
  for (let i = 0; i < pianoKeys.length; i++) {
    pianoKeys[i].release();
  }
  screen = "play";
}

function endRound() {
  for (let i = 0; i < pianoKeys.length; i++) {
    pianoKeys[i].release();   // stops any notes still ringing
  }
  screen = "review";
}


// runs once each time ANY key is pressed
function keyPressed() {
  if (screen !== "play") return;

  // Enter ends the painting early
  if (keyCode === ENTER) {
    endRound();
    return false;
  }

  let i = KEY_CHARS.indexOf(key.toUpperCase());
  if (i >= 0) {
    pianoKeys[i].press();
  }
  return false;   // stops the browser from doing its own thing with the key
}

// runs once each time a key is let go
function keyReleased() {
  if (screen !== "play") return;
  let i = KEY_CHARS.indexOf(key.toUpperCase());
  if (i >= 0) {
    pianoKeys[i].release();
  }
  return false;
}

function mousePressed() {
  // browsers block sound until the user clicks something, this unlocks it by making hitting play count as a click
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch (e) {
    console.log("Sound unavailable:", e);
  }

  // clicking a color circle (title and review screens only)
  if (screen === "title" || screen === "review") {
    let y = (screen === "title") ? 450 : 400;
    for (let i = 0; i < colors.length; i++) {
      if (dist(mouseX, mouseY, swatchX(i), y) < 22) {
        chosenColor = colors[i];
      }
    }
  }

  if (screen === "title") {
    // click inside the play button
    if (dist(mouseX, mouseY, width / 2, 270) < 80) {
      startRound();
    }
  } else if (screen === "play") {
    // click the "End early" button
    if (mouseInside(590, 364, 170, 28)) {
      endRound();
    }
  } else if (screen === "review") {
    if (mouseInside(180, 450, 180, 50)) {
      startRound();                 // go again, keeping your old painting
    }
    if (mouseInside(440, 450, 180, 50)) {
      allMarks = [];                // wipe the painting
      startRound();
    }
  }
}
