export class PerformanceBudget {
  private deviceMemory?: number;
  private hardwareConcurrency?: number;
  private fpsSamples: number[] = [];
  private fpsWindow: number;

  constructor(fpsWindow = 30) {
    this.fpsWindow = fpsWindow;
    if (typeof (navigator as any) !== 'undefined') {
      this.deviceMemory = (navigator as any).deviceMemory;
      this.hardwareConcurrency = navigator.hardwareConcurrency;
    }
  }

  public addFrameSample(deltaTimeMs: number) {
    const fps = 1000 / deltaTimeMs;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > this.fpsWindow) {
      this.fpsSamples.shift();
    }
  }

  public requiresFallback(): boolean {
    const medianFps = this.medianFps();
    const weakCpu = (this.hardwareConcurrency ?? 4) < 4;
    const lowMemory = (this.deviceMemory ?? 4) <= 2;
    const unstableFrameRate = medianFps > 0 && medianFps < 45;
    return weakCpu || lowMemory || unstableFrameRate;
  }

  public fishScale(): number {
    const medianFps = this.medianFps();
    if (medianFps === 0) return 0.5;
    if (medianFps < 30) return 0.35;
    if (medianFps < 45) return 0.6;
    return 1;
  }

  private medianFps(): number {
    if (!this.fpsSamples.length) return 0;
    const sorted = [...this.fpsSamples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}
