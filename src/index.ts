import { FishRenderer } from './renderer';
import { PerformanceBudget } from './scaling';
import { createSkeleton, updatePathWithBezier, updateSkeletonPose } from './simulation';
import { LightingState, PathPoint, RenderSettings } from './types';

export class Aquarium {
  private renderer: FishRenderer;
  private fish: ReturnType<typeof createSkeleton>[] = [];
  private lighting: LightingState;
  private budget: PerformanceBudget;

  constructor(canvas: HTMLCanvasElement, settings: RenderSettings, lighting: LightingState) {
    this.budget = new PerformanceBudget();
    this.renderer = new FishRenderer(canvas, this.budget, settings);
    this.lighting = lighting;
  }

  public spawnFish(count: number) {
    for (let i = 0; i < count; i++) {
      const fish = createSkeleton(`fish_${i}`);
      const controlPoints: PathPoint[] = [
        { t: 0, position: { x: 10, y: 20 + i * 5, z: 0 } },
        { t: 0.33, position: { x: 120, y: 40 + i * 2, z: 0 } },
        { t: 0.66, position: { x: 200, y: 60 - i * 3, z: 0 } },
        { t: 1, position: { x: 320, y: 80 + i * 2, z: 0 } },
      ];
      updatePathWithBezier(fish, controlPoints, 20);
      this.fish.push(fish);
    }
  }

  public frame(deltaTimeMs: number) {
    this.budget.addFrameSample(deltaTimeMs);
    this.fish.forEach((fish) => {
      fish.kinematics.speed = Math.max(0.5, Math.random() * 3);
      fish.kinematics.turnRate = Math.sin(performance.now() / 4000) * 0.4;
      updateSkeletonPose(fish, deltaTimeMs);
    });
    this.renderer.render(this.fish, this.lighting);
  }
}
