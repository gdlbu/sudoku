import { FishInstance, LightingState, RenderSettings, Vec3 } from './types';
import { PerformanceBudget } from './scaling';

export class FishRenderer {
  private gl: WebGLRenderingContext | null;
  private ctx2d: CanvasRenderingContext2D | null;
  private canvas: HTMLCanvasElement;
  private settings: RenderSettings;
  private budget: PerformanceBudget;

  constructor(canvas: HTMLCanvasElement, budget: PerformanceBudget, settings: RenderSettings) {
    this.canvas = canvas;
    this.budget = budget;
    this.gl = canvas.getContext('webgl');
    this.ctx2d = null;
    this.settings = settings;

    this.applyMobileFallbackIfNeeded();
  }

  private applyMobileFallbackIfNeeded() {
    if (this.budget.requiresFallback()) {
      this.settings = {
        ...this.settings,
        useNormalMap: false,
        rimLightEnabled: false,
        renderMode: 'canvas2d',
        maxFish: Math.floor(this.settings.maxFish * this.budget.fishScale()),
      };
      this.gl = null;
      this.ctx2d = this.canvas.getContext('2d');
    }
  }

  public render(fish: FishInstance[], lighting: LightingState) {
    const visibleFish = fish.slice(0, this.settings.maxFish);
    if (this.settings.renderMode === 'canvas2d' || !this.gl) {
      return this.renderCanvas(visibleFish);
    }
    return this.renderWebGL(visibleFish, lighting);
  }

  private renderCanvas(fish: FishInstance[]) {
    if (!this.ctx2d) return;
    const ctx = this.ctx2d;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.globalAlpha = 0.9;

    fish.forEach((f) => {
      const position = f.path[0]?.position;
      if (!position) return;
      ctx.save();
      ctx.fillStyle = '#6bb5ff';
      ctx.translate(position.x, position.y);
      ctx.scale(1.2, 0.8);
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderWebGL(fish: FishInstance[], lighting: LightingState) {
    if (!this.gl) return;
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    fish.forEach((instance) => {
      this.bindNormalMap(instance);
      const rim = this.computeRimLight(lighting.cameraDirection, lighting.rimColor, lighting.rimStrength);
      const specular = this.computeSpecular(lighting.lightDirection, lighting.cameraDirection);

      // Placeholder for mesh or sprite draw calls. In a real pipeline these values
      // feed into shader uniforms/textures before issuing drawArrays/drawElements.
      this.submitDrawCall({ rim, specular });
    });
  }

  private bindNormalMap(instance: FishInstance) {
    if (!this.gl || !this.settings.useNormalMap || !instance.normalMap) return;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, instance.normalMap);
  }

  private computeRimLight(view: Vec3, rimColor: Vec3, rimStrength: number): Vec3 {
    if (!this.settings.rimLightEnabled) {
      return { x: 0, y: 0, z: 0 };
    }
    const intensity = Math.max(0, 1 - view.z) * rimStrength;
    return {
      x: rimColor.x * intensity,
      y: rimColor.y * intensity,
      z: rimColor.z * intensity,
    };
  }

  private computeSpecular(light: Vec3, view: Vec3): number {
    const dot = light.x * view.x + light.y * view.y + light.z * view.z;
    return Math.pow(Math.max(dot, 0), 8);
  }

  private submitDrawCall(material: { rim: Vec3; specular: number }) {
    // Stub: integrate with shader uniforms, vertex attributes and draw calls.
    // Keeping this logic allows us to unit test the lighting calculations even
    // when WebGL is not available in the environment.
    return material;
  }
}
