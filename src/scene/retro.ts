// The look: the scene renders at full screen resolution (capped by the graphics setting), then a
// soft CRT pass adds the retro vibe: faint scanlines, fine dithering, film grain, a touch of
// colour fringing at the edges and a vignette. Medium and High add a warm bloom glow.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { Preset } from './quality';

const crtShader = {
  uniforms: {
    tDiffuse: { value: null },
    lineHeight: { value: 3 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float lineHeight;
    uniform float time;
    varying vec2 vUv;

    float bayer(vec2 p) {
      int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
      float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      return m[x + y * 4] / 16.0 - 0.5;
    }

    void main() {
      vec2 d = vUv - 0.5;
      vec2 fringe = d * dot(d, d) * 0.012;              // colour fringing, only near the edges
      vec3 c = vec3(
        texture2D(tDiffuse, vUv + fringe).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv - fringe).b
      );
      vec2 px = gl_FragCoord.xy;
      c = floor(c * 63.0 + 0.5 + bayer(px)) / 63.0;      // fine dithering, a hint of old colour depth
      float grain = fract(sin(dot(px + time, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      c += grain * 0.035;
      c *= 1.0 - dot(d, d) * 0.85;                        // vignette
      c *= 0.94 + 0.06 * step(0.5, fract(px.y / lineHeight)); // faint scanlines
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export class Retro {
  private composer: EffectComposer;
  private crt = new ShaderPass(crtShader);
  private bloom: UnrealBloomPass | null = null;

  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    private preset: Preset,
  ) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = preset.shadows > 0;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: preset.samples });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    if (preset.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.5, 0.8);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass()); // tone mapping and sRGB, before the CRT touches
    this.composer.addPass(this.crt);
  }

  setSize(width: number, height: number): void {
    const ratio = Math.min(devicePixelRatio, this.preset.pixelRatio);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width, height);
    this.bloom?.resolution.set(width / 2, height / 2);
    this.crt.uniforms.lineHeight!.value = Math.max(2, Math.round(3 * ratio));
  }

  render(time: number): void {
    this.crt.uniforms.time!.value = time % 1000;
    this.composer.render();
  }
}
