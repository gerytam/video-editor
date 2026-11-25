import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cancelRender, useDelayRender, useVideoConfig } from "remotion";
import { Cam, coverFor } from "./camera";

// A still photo re-rendered through a virtual camera, using its depth map.
// The fragment shader inverts the forward model in camera.ts with a short
// fixed-point iteration: for each screen pixel, find the source pixel that
// the camera move would have landed there.

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uCover;
uniform float uZoom;
uniform vec2 uPan;
uniform vec2 uShift;
uniform float uDolly;
uniform float uFocus;
void main() {
  vec2 c = vec2(0.5) + uPan;
  vec2 q = c + (vUv - 0.5) * uCover / uZoom;
  vec2 p = q;
  for (int i = 0; i < 14; i++) {
    float d = texture(uDepth, p).r - uFocus;
    p = c + (q - c - uShift * d) / (1.0 + uDolly * d);
  }
  outColor = texture(uImg, p);
}`;

type GLState = {
  gl: WebGL2RenderingContext;
  u: Record<string, WebGLUniformLocation | null>;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) ?? "shader compile failed");
  }
  return s;
};

const texture = (
  gl: WebGL2RenderingContext,
  unit: number,
  img: HTMLImageElement,
  mipmaps: boolean,
) => {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (mipmaps) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  return t;
};

const setup = (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  depth: HTMLImageElement,
): GLState => {
  const gl = canvas.getContext("webgl2", {
    preserveDrawingBuffer: true,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl) throw new Error("WebGL2 not available. Render with --gl=swangle.");
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) ?? "link failed");
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  texture(gl, 0, img, true);
  texture(gl, 1, depth, false);
  const u: GLState["u"] = {};
  for (const n of [
    "uImg",
    "uDepth",
    "uCover",
    "uZoom",
    "uPan",
    "uShift",
    "uDolly",
    "uFocus",
  ]) {
    u[n] = gl.getUniformLocation(prog, n);
  }
  gl.uniform1i(u.uImg, 0);
  gl.uniform1i(u.uDepth, 1);
  return { gl, u };
};

const draw = (s: GLState, cam: Cam, cover: { x: number; y: number }) => {
  const { gl, u } = s;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.uniform2f(u.uCover, cover.x, cover.y);
  gl.uniform1f(u.uZoom, cam.zoom);
  gl.uniform2f(u.uPan, cam.panX, cam.panY);
  gl.uniform2f(u.uShift, cam.shiftX, cam.shiftY);
  gl.uniform1f(u.uDolly, cam.dolly);
  gl.uniform1f(u.uFocus, cam.focus);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.finish();
};

export const DepthPhoto: React.FC<{
  src: string;
  depthSrc: string;
  aspect: number;
  cam: Cam;
  style?: React.CSSProperties;
}> = ({ src, depthSrc, aspect, cam, style }) => {
  const { width, height } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<GLState | null>(null);
  const camRef = useRef(cam);
  camRef.current = cam;
  const cover = coverFor(aspect, width / height);
  const coverRef = useRef(cover);
  coverRef.current = cover;
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`depth photo ${src}`));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadImage(src), loadImage(depthSrc)])
      .then(([img, depth]) => {
        if (cancelled || !canvas.current) return;
        state.current = setup(canvas.current, img, depth);
        draw(state.current, camRef.current, coverRef.current);
        setReady(true);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
    return () => {
      cancelled = true;
      const gl = state.current?.gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      state.current = null;
    };
  }, [src, depthSrc, handle, continueRender]);

  useLayoutEffect(() => {
    if (ready && state.current) draw(state.current, cam, cover);
  });

  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, width, height, ...style }}
    />
  );
};
