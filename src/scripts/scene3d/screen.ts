import * as THREE from 'three';
import type { Grid } from '../grid';
import { FONT } from '../grid';
import { GLYPHS, fillCells } from '../renderer';
import { sharedRenderer } from './gl';

export interface Screen {
  resize(g: Grid): void;
  /** Show the character grid: brightness per cell, and an optional character override per cell. */
  draw(B: Float32Array, over: Uint8Array): void;
}

const FRAG = /* glsl */ `
uniform sampler2D uCells;
uniform sampler2D uAtlas;
uniform vec2 uCell;      // size of one character cell, in device pixels
uniform vec2 uGrid;      // columns, rows
uniform float uGlyphs;   // glyphs in the atlas
uniform float uHeight;   // drawing-buffer height, in device pixels
void main() {
  vec2 p = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uCell;
  vec2 cell = floor(p);
  vec2 sub = fract(p);
  vec4 d = texture2D(uCells, (cell + 0.5) / uGrid);
  float index = floor(d.r * 255.0 + 0.5);
  float ink = texture2D(uAtlas, vec2((index + sub.x) / uGlyphs, 1.0 - sub.y)).r;
  vec3 bone = vec3(228.0, 223.0, 211.0) / 255.0;
  vec3 bg = vec3(10.0) / 255.0;
  gl_FragColor = vec4(mix(bg, bone, ink * d.g), 1.0);
}`;

/**
 * Draws the character grid to the visible canvas on the graphics card: one small texture says
 * which glyph and how bright for each cell, and a shader stamps glyphs from an atlas. This
 * replaces drawing tens of thousands of characters with canvas text every frame.
 */
export function createScreen(): Screen | null {
  const renderer = sharedRenderer();
  if (!renderer) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCells: { value: null }, uAtlas: { value: null },
      uCell: { value: new THREE.Vector2(1, 1) }, uGrid: { value: new THREE.Vector2(1, 1) },
      uGlyphs: { value: GLYPHS.length }, uHeight: { value: 1 },
    },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  let cells: THREE.DataTexture | null = null;
  let data = new Uint8Array(0);

  return {
    resize(g) {
      renderer.setPixelRatio(g.dpr);
      renderer.setSize(g.W, g.H, false);

      // one glyph per atlas cell, drawn at device resolution so text stays crisp
      const cw = Math.round(g.cw * g.dpr), ch = Math.round(g.ch * g.dpr);
      const canvas = document.createElement('canvas');
      canvas.width = cw * GLYPHS.length;
      canvas.height = ch;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#000';
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = '#fff';
      c.font = `${g.fs * g.dpr}px ${FONT}`;
      c.textBaseline = 'top';
      for (let i = 0; i < GLYPHS.length; i++) c.fillText(GLYPHS[i]!, i * cw, 0);
      (material.uniforms.uAtlas!.value as THREE.Texture | null)?.dispose();
      const atlas = new THREE.CanvasTexture(canvas);
      atlas.minFilter = THREE.LinearFilter;
      atlas.magFilter = THREE.LinearFilter;
      atlas.generateMipmaps = false;
      atlas.colorSpace = THREE.NoColorSpace;
      material.uniforms.uAtlas!.value = atlas;

      cells?.dispose();
      data = new Uint8Array(g.cols * g.rows * 4);
      cells = new THREE.DataTexture(data, g.cols, g.rows, THREE.RGBAFormat);
      cells.minFilter = THREE.NearestFilter;
      cells.magFilter = THREE.NearestFilter;
      cells.colorSpace = THREE.NoColorSpace;
      material.uniforms.uCells!.value = cells;
      (material.uniforms.uCell!.value as THREE.Vector2).set(cw, ch);
      (material.uniforms.uGrid!.value as THREE.Vector2).set(g.cols, g.rows);
      material.uniforms.uHeight!.value = renderer.domElement.height;
    },

    draw(B, over) {
      if (!cells) return;
      fillCells(B, over, data);
      cells.needsUpdate = true;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
  };
}
