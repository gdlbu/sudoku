# Aquarium rendering and simulation

This prototype provides a lightweight fish simulation with a WebGL render path and automatic mobile fallbacks.

## Features
- **Render layer**: WebGL sprites/mini meshes support normal-map sampling and rim-light shading with dynamic specular highlights.
- **Simulation layer**: Each fish owns a spine/tail skeleton, responsive tail-fin swing, turn-driven body torsion, and Bezier-smoothed paths.
- **Mobile downgrade**: The runtime watches device performance, falls back to Canvas 2D, disables normal lighting, and trims the fish count on slower hardware.

See `src/index.ts` for an example integration that spawns fish, updates their skeletons, and renders the scene.
