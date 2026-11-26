// The PS1/CRT look: render at a low resolution, then upscale with chunky pixels, a limited
// colour depth with ordered dithering, and a soft vignette and scanlines.
import * as THREE from 'three';

export const LOW_HEIGHT = 240;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 lowSize;
  varying vec2 vUv;

  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    return m[i] / 16.0 - 0.5;
  }

  void main() {
    vec3 c = texture2D(tScene, vUv).rgb;
    c = c / (1.0 + c * 0.35);                  // soft roll-off so the chandelier doesn't clip
    c = pow(c, vec3(1.0 / 2.2));                 // to display colours before quantizing
    vec2 px = floor(vUv * lowSize);
    c = floor(c * 31.0 + 0.5 + bayer(px)) / 31.0; // 15-bit colour, like the PS1
    vec2 d = vUv - 0.5;
    c *= 1.0 - dot(d, d) * 0.9;                  // vignette
    c *= 0.93 + 0.07 * step(0.5, fract(vUv.y * lowSize.y)); // faint scanlines
    gl_FragColor = vec4(c, 1.0);
  }
`;

export class Retro {
  private target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.HalfFloatType,
  });
  private material = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: this.target.texture }, lowSize: { value: new THREE.Vector2(1, 1) } },
    vertexShader,
    fragmentShader,
    depthTest: false,
  });
  private quadScene = new THREE.Scene();
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor(private renderer: THREE.WebGLRenderer) {
    this.quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }

  setSize(width: number, height: number): void {
    const lowW = Math.round((LOW_HEIGHT * width) / height);
    this.target.setSize(lowW, LOW_HEIGHT);
    this.material.uniforms.lowSize!.value.set(lowW, LOW_HEIGHT);
    this.renderer.setSize(width, height, false);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }
}

/**
 * PS1-style vertex wobble: snap every vertex to the low-resolution pixel grid. Applied to all
 * scene materials once the scene is built.
 */
export function snapVertices(root: THREE.Object3D): void {
  const done = new Set<THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of [mesh.material].flat()) {
      if (done.has(material)) continue;
      done.add(material);
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          vec2 snapGrid = vec2(${(LOW_HEIGHT * 0.75).toFixed(1)}, ${(LOW_HEIGHT * 0.5).toFixed(1)});
          gl_Position.xy = floor(gl_Position.xy / gl_Position.w * snapGrid) / snapGrid * gl_Position.w;`,
        );
      };
    }
  });
}
