export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Joint {
  name: string;
  index: number;
  position: Vec3;
  rotation: Vec3;
}

export interface FishSkeleton {
  spine: Joint[];
  tail: Joint[];
}

export interface FishKinematics {
  speed: number;
  turnRate: number;
}

export interface PathPoint {
  t: number;
  position: Vec3;
}

export interface FishInstance {
  id: string;
  skeleton: FishSkeleton;
  kinematics: FishKinematics;
  path: PathPoint[];
  spriteTexture: WebGLTexture | null;
  normalMap: WebGLTexture | null;
}

export interface LightingState {
  lightDirection: Vec3;
  cameraDirection: Vec3;
  rimColor: Vec3;
  rimStrength: number;
}

export interface RenderSettings {
  useNormalMap: boolean;
  rimLightEnabled: boolean;
  renderMode: 'webgl' | 'canvas2d';
  maxFish: number;
}
