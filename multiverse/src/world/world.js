// AETHERBOUND — world assembly. One continuous space, five movements.

import * as THREE from '../../vendor/three.module.min.js';
import { MaterialLibrary } from '../core/materials.js';
import { createSky } from './sky.js';
import { createEngine } from './engine.js';
import { createPortal } from './portal.js';
import { createOtherSide } from './otherSide.js';
import { createWatcher } from './watcher.js';

export function createWorld(options = {}) {
  const scene = new THREE.Scene();
  scene.name = 'aetherbound';

  const lib = new MaterialLibrary(THREE);

  const sky = createSky(THREE, lib, {
    starCount: options.starCount ?? 1700,
  });
  scene.add(sky.group);

  const engine = createEngine(THREE, lib);
  scene.add(engine.group);

  const portal = createPortal(THREE, lib);
  scene.add(portal.group);

  const other = createOtherSide(THREE, lib);
  scene.add(other.group);

  // The first watcher: a silhouette on a shard, looking at the engine.
  const watcher = createWatcher(THREE, lib, { scale: 1.0 });
  watcher.group.position.set(5.6, -1.7, 30);
  watcher.group.rotation.y = Math.PI;
  scene.add(watcher.group);

  // The second watcher: on the far side, looking back through the rift.
  const watcher2 = createWatcher(THREE, lib, { scale: 0.92 });
  watcher2.group.position.copy(other.heroTop).add(new THREE.Vector3(2.8, 0.02, 2.6));
  watcher2.group.rotation.y = 0.15;
  scene.add(watcher2.group);

  function update(dt, time, state, pixelRatio = 1) {
    const p = state.palette;
    lib.setLighting({
      lightDir: p.lightDir,
      lightColor: p.lightColor,
      rimColor: p.rimColor,
      rimStrength: p.rimStrength,
      fogColor: p.fogColor,
      fogDensity: p.fogDensity,
      ambient: p.ambient,
    });
    lib.update(dt, time, pixelRatio);

    sky.setPalette(p);
    sky.update(time, pixelRatio);

    engine.update(dt, time, {
      irisOpen: state.effects.irisOpen,
      portalIntensity: state.effects.portalIntensity,
    });

    portal.update(dt, time, {
      form: state.effects.portalForm,
      intensity: state.effects.portalIntensity,
      pixelRatio,
    });

    other.update(dt, time);
    watcher.update(dt, time);
    watcher2.update(dt, time);
  }

  function dispose() {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose?.();
      }
    });
  }

  return { scene, lib, sky, engine, portal, other, watcher, watcher2, update, dispose };
}
