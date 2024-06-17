import sSweepVert from "./shader/sweep-vert.glsl";
import sOutputDrawFrag from "./shader/output-draw-frag.glsl";
import sTornLeafFrag from "./displacement.glsl";
import * as twgl from "twgl.js";
import {unis, randProgram} from "./prog.js";

const imageUrl = "image.jpg";
const animating = true;
const progRefreshSec = 10;

setTimeout(init, 50);

let webGLCanvas, gl, w, h;
let sweepArrays, sweepBufferInfo;
let progiMain, progiOutputDraw;
let txOutput0, txOutput1;
let txImage;
let szImage = [0, 0];

async function init() {

  // 3D WebGL canvas, and twgl
  webGLCanvas = document.getElementById("webgl-canvas");
  gl = webGLCanvas.getContext("webgl2");
  twgl.addExtensionsToContext(gl);

  // This is for sweeping output range for pure fragment shaders
  sweepArrays = {
    position: {numComponents: 2, data: [-1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1]},
  };
  sweepBufferInfo = twgl.createBufferInfoFromArrays(gl, sweepArrays);

  resizeWorld();
  window.addEventListener("resize", () => {
    resizeWorld();
  });
  compilePrograms();
  await getImage();
  updateRandomProgram();
  requestAnimationFrame(frame);
}

function updateRandomProgram() {
  randProgram();
  setTimeout(updateRandomProgram, progRefreshSec * 1000);
}

function resizeWorld() {

  // Resize WebGL canvas
  let sz = Math.min(window.innerWidth, window.innerHeight);
  webGLCanvas.style.width = sz + "px";
  webGLCanvas.style.height = sz + "px";
  const mul = devicePixelRatio;
  w = webGLCanvas.width = Math.round(sz * mul);
  h = webGLCanvas.height = Math.round(sz * mul);

  // First pingpong output texture
  const dtRender0 = new Uint8Array(w * h * 4);
  dtRender0.fill(0);
  if (txOutput0) gl.deleteTexture(txOutput0);
  txOutput0 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    width: w,
    height: h,
    src: dtRender0,
  });

  // Other pingpong output texture
  const dtRender1 = new Uint8Array(w * h * 4);
  dtRender1.fill(0);
  if (txOutput1) gl.deleteTexture(txOutput1);
  txOutput1 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    width: w,
    height: h,
    src: dtRender1,
  });
}

async function getImage(clipName, clip) {

  // Fetch image
  const resp = await fetch(imageUrl, { method: "GET" });
  const blob = await resp.blob();

  // Get pixel data
  const imageBitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  szImage[0] = canvas.width = imageBitmap.width;
  szImage[1] = canvas.height = imageBitmap.height;
  ctx.drawImage(imageBitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const rgbaArr = new Uint8Array(data);

  // Create texture from pixel data
  if (txImage) gl.deleteTexture(txImage);
  txImage = twgl.createTexture(gl, {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    width: szImage[0],
    height: szImage[1],
    src: rgbaArr,
  });
}

function compilePrograms() {

  const del = pi => { if (pi && pi.program) gl.deleteProgram(pi.program); }
  const recreate = (v, f) => twgl.createProgramInfo(gl, [v, f]);

  // Fixed programs
  const npOutputDraw = recreate(sSweepVert, sOutputDrawFrag);

  // Main fragment
  const npMain = recreate(sSweepVert, sTornLeafFrag);

  const compileOK = (npMain && npOutputDraw);
  if (!compileOK) return false;

  del(progiMain);
  progiMain = npMain;
  progiOutputDraw = npOutputDraw;
  return true;
}

function frame(time) {

  // Render to txOutput1
  const unisMain = {
    txPrev: txOutput0,
    txClip0: txImage,
    resolution: [w, h],
    time: time,
  }
  for (let uniName in unis)
    unisMain[uniName] = unis[uniName];

  // Bind frame buffer: texture to draw on
  let atmsPR = [{attachment: txOutput1}];
  let fbufPR = twgl.createFramebufferInfo(gl, atmsPR, w, h);
  twgl.bindFramebufferInfo(gl, fbufPR);
  // Set up size, program, uniforms
  gl.viewport(0, 0, w, h);
  gl.useProgram(progiMain.program);
  twgl.setBuffersAndAttributes(gl, progiMain, sweepBufferInfo);
  twgl.setUniforms(progiMain, unisMain);
  // Clear to black
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);
  // Render fragment sweep
  twgl.drawBufferInfo(gl, sweepBufferInfo);

  // Render txOutput1 to canvas
  const unisOutputDraw = {
    txOutput: txOutput1,
  }
  twgl.bindFramebufferInfo(gl, null);
  // Set up size, program, uniforms
  gl.viewport(0, 0, w, h);
  gl.useProgram(progiOutputDraw.program);
  twgl.setBuffersAndAttributes(gl, progiOutputDraw, sweepBufferInfo);
  twgl.setUniforms(progiOutputDraw, unisOutputDraw);
  // Render fragment swep
  twgl.drawBufferInfo(gl, sweepBufferInfo);

  // Swap output buffers: current output becomes "prev" texture for next round
  [txOutput0, txOutput1] = [txOutput1, txOutput0];

  // Schedule next frame
  if (animating) requestAnimationFrame(frame);
}
