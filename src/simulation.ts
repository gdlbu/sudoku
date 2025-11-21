import { FishInstance, FishSkeleton, Joint, PathPoint, Vec3 } from './types';

export function createSkeleton(id: string, segmentCount = 6): FishInstance {
  const spine: Joint[] = [];
  const tail: Joint[] = [];
  for (let i = 0; i < segmentCount; i++) {
    spine.push({
      name: `spine_${i}`,
      index: i,
      position: { x: i * 8, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    });
    if (i >= segmentCount - 2) {
      tail.push({
        name: `tail_${i}`,
        index: i,
        position: { x: i * 8, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      });
    }
  }

  const skeleton: FishSkeleton = { spine, tail };
  return {
    id,
    skeleton,
    kinematics: { speed: 0, turnRate: 0 },
    path: [],
    spriteTexture: null,
    normalMap: null,
  };
}

export function updateSkeletonPose(fish: FishInstance, deltaTime: number) {
  const { speed, turnRate } = fish.kinematics;
  const swaySpeed = Math.max(0.6, speed * 0.4);
  const swingAmplitude = 6 + Math.min(10, speed * 4) + Math.abs(turnRate) * 12;

  fish.skeleton.tail.forEach((joint, idx) => {
    const phase = (performance.now() / 1000 + idx * 0.1) * swaySpeed;
    joint.rotation.y = Math.sin(phase) * swingAmplitude * (1 + idx * 0.2);
  });

  fish.skeleton.spine.forEach((joint) => {
    const torsion = turnRate * 4 * (joint.index / fish.skeleton.spine.length);
    joint.rotation.z = torsion;
  });
}

export function updatePathWithBezier(fish: FishInstance, controlPoints: PathPoint[], steps = 10) {
  fish.path = sampleBezier(controlPoints, steps);
}

function sampleBezier(points: PathPoint[], steps: number): PathPoint[] {
  if (points.length < 4) return points;
  const [p0, p1, p2, p3] = points;
  const result: PathPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    result.push({ t, position: cubicBezier(p0.position, p1.position, p2.position, p3.position, t) });
  }
  return result;
}

function cubicBezier(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
    z: mt2 * mt * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t2 * t * p3.z,
  };
}
