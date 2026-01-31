"use strict";

/* ======================
   GLOBAL STATE
====================== */
let finalStripCanvas = null;
let photos = [];

const video = document.getElementById("camera");
const countdownEl = document.getElementById("countdown");
const result = document.getElementById("result");
const downloadBtn = document.getElementById("downloadBtn");
const customTextInput = document.getElementById("customText");

const MAX_CUSTOM_CHARS = 60;

/* ======================
   CAMERA
====================== */
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });
  video.srcObject = stream;
}
startCamera();

/* ======================
   HELPERS
====================== */
function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function countdown(seconds) {
  return new Promise(resolve => {
    let count = seconds;
    countdownEl.textContent = count;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        countdownEl.textContent = "";
        resolve();
      } else {
        countdownEl.textContent = count;
      }
    }, 1000);
  });
}

function flashEffect() {
  return new Promise(resolve => {
    const flash = document.createElement("div");
    flash.style.position = "fixed";
    flash.style.inset = 0;
    flash.style.background = "white";
    flash.style.opacity = "0.7";
    flash.style.zIndex = 9999;
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(flash);
        resolve();
      }, 250);
    }, 100);
  });
}

/* ======================
   IMAGE PROCESSING
   (Safari-safe vintage)
====================== */
function applyVintageFilter(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    // grayscale
    let v = 0.299 * r + 0.587 * g + 0.114 * b;

    // contrast
    v = (v - 128) * 1.4 + 128;

// grayscale only, light sepia
d[i]     = Math.min(255, v * 1.02 + 8);
d[i + 1] = Math.min(255, v * 0.97 + 4);
d[i + 2] = Math.min(255, v * 0.90);
  }

  ctx.putImageData(imgData, 0, 0);
}

/* ======================
   TAKE PHOTO (4:3 LANDSCAPE)
====================== */
function takePhoto() {
  const w = 800;
  const h = 600;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");

  // mirror
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);

  // bake vintage look
  applyVintageFilter(ctx, w, h);

  photos.push(canvas);
}

/* ======================
   SESSION
====================== */
async function startSession() {
  photos = [];
  result.innerHTML = "";
  downloadBtn.style.display = "none";

  for (let i = 0; i < 4; i++) {
    await countdown(3);
    takePhoto();
    await flashEffect();
    if (i < 3) await pause(800);
  }

  buildStrip();
}

/* ======================
   BUILD STRIP (VERTICAL)
====================== */
function buildStrip() {
  const PHOTO_W = 800;
  const PHOTO_H = 600;

  const SIDE_MARGIN = 20;
  const TOP_MARGIN = 100;
  const SPACING = 20;
  const BOTTOM_MARGIN = 140;

  const stripWidth = PHOTO_W + SIDE_MARGIN * 2;
  const stripHeight =
    TOP_MARGIN +
    photos.length * PHOTO_H +
    (photos.length - 1) * SPACING +
    BOTTOM_MARGIN;

  const canvas = document.createElement("canvas");
  canvas.width = stripWidth;
  canvas.height = stripHeight;
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = "#0a0303";
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  // title
  drawTitle(ctx, "Ure's 30th Murder Mystery Party", stripWidth, TOP_MARGIN / 2 + 30);

  // photos
  photos.forEach((photo, i) => {
    const x = SIDE_MARGIN;
    const y = TOP_MARGIN + i * (PHOTO_H + SPACING);

    ctx.drawImage(photo, x, y, PHOTO_W, PHOTO_H);

    ctx.strokeStyle = "#3e0f0f";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, PHOTO_W, PHOTO_H);
  });

  // bottom text
  drawBottomText(ctx, stripWidth, stripHeight);

  // texture (FULL STRIP)
  applyTexture(ctx, stripWidth, stripHeight);

  // preview
  result.innerHTML = "";
  result.appendChild(canvas);
  finalStripCanvas = canvas;
  downloadBtn.style.display = "inline-block";
}

/* ======================
   TITLE
====================== */
function drawTitle(ctx, text, width, y) {
  ctx.fillStyle = "#f5f0e6";
  ctx.textAlign = "center";

  let size = 48;
  do {
    ctx.font = `${size}px 'Playwrite India Guides', cursive`;
    size--;
  } while (ctx.measureText(text).width > width - 40);

  ctx.fillText(text, width / 2, y);
}

/* ======================
   BOTTOM TEXT
====================== */
function drawBottomText(ctx, stripWidth, stripHeight) {
  const text = customTextInput.value.slice(0, MAX_CUSTOM_CHARS);
  const date = new Date().toLocaleDateString();

  ctx.fillStyle = "#f5f0e6";
  ctx.textAlign = "center";

  ctx.font = "22px 'Playwrite India Guides', cursive";
  ctx.fillText(text, stripWidth / 2, stripHeight - 80);

  ctx.font = "16px 'Playwrite India Guides', cursive";
  ctx.fillText(date, stripWidth / 2, stripHeight - 45);
}

/* ======================
   TEXTURE
====================== */
function applyTexture(ctx, w, h) {
  const texture = new Image();
  texture.src = "vintage-texture.jpg";
  texture.onload = () => {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(texture, 0, 0, w, h);
    ctx.restore();
  };
}

/* ======================
   DOWNLOAD
====================== */
function downloadStrip() {
  if (!finalStripCanvas) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const dataURL = finalStripCanvas.toDataURL("image/png");

  if (isIOS) {
    window.open(dataURL, "_blank");
  } else {
    const link = document.createElement("a");
    link.download = "photo-strip.png";
    link.href = dataURL;
    link.click();
  }

  // reset for next guest
  photos = [];
  finalStripCanvas = null;
  result.innerHTML = "";
  customTextInput.value = "";
  downloadBtn.style.display = "none";
}
