/**
 * geometry.js — the machinist's bench.
 *
 * Every piece of the watch is generated from primitives: lathed case parts,
 * extruded hands and lugs, a swept alligator strap, fluted crown, gears.
 * All measurements are in millimetres and the watch is modelled dial-up
 * (+Z), 12 o'clock at +Y, 3 o'clock at +X.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * case parts
 * ------------------------------------------------------------------ */

/**
 * Revolve a [radius, z] profile around the Z axis.
 * Profiles are authored bottom → top so normals face outward.
 */
export function lathe(profile, material, { segments = 192, rotationZ = 0 } = {}) {
  const points = profile.map(([radius, z]) => new THREE.Vector2(radius, z));
  const geometry = new THREE.LatheGeometry(points, segments);
  geometry.rotateX(Math.PI / 2);
  geometry.rotateZ(rotationZ);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Rounded rectangle path helper. */
export function roundedRectShape(width, height, radius = 2) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, Math.min(width, height) / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/** Extrude a 2D shape along +Z, with polished bevels. */
export function extrudeShape(shape, material, {
  depth = 1,
  bevel = 0.1,
  bevelSegments = 2,
  curveSegments = 12,
  steps = 1,
} = {}) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps,
    curveSegments,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Applied hour marker: a dauphine cross-section (triangle) extruded along Y.
 * Length runs from -length/2 to +length/2, base sits at z = 0, ridge up +Z.
 */
export function batonGeometry(length, width, height, bevel = 0.045) {
  // Flat-topped trapezoid: the top facet faces the crystal, so applied gold
  // catches the key light instead of reading as a dark ridge.
  const topWidth = width * 0.58;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(topWidth, height);
  shape.lineTo(-topWidth, height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 2,
  });
  geometry.translate(0, 0, -length / 2);
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/** Crown: a cylinder with fine coin-edge fluting cut into its flanks. */
export function flutedCylinderGeometry(radius, height, {
  flutes = 22,
  depth = 0.16,
  segments = 144,
} = {}) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, segments, 1, false);
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const radial = Math.hypot(v.x, v.z);
    if (radial < 1e-4) continue;
    const theta = Math.atan2(v.z, v.x);
    const ripple = Math.cos(theta * flutes) * 0.5 + 0.5;
    const scale = 1 - (depth * ripple) / radial;
    v.x *= scale;
    v.z *= scale;
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/* ------------------------------------------------------------------ *
 * hands
 * ------------------------------------------------------------------ */

/**
 * Dauphine hand: a faceted kite with a polished central ridge and a short
 * counterweight tail. Built in the XY plane at z = 0, pointing +Y.
 */
export function buildHand(material, {
  length = 12.8,
  width = 1.5,
  tail = 1.6,
  thickness = 0.34,
  ridge = 0.2,
  bodyMaterial = material,
  ridgeMaterial = material,
} = {}) {
  const group = new THREE.Group();

  // Dauphine outline: a long kite with a short counterweight tail.
  const shape = new THREE.Shape();
  shape.moveTo(0, length);
  shape.lineTo(width * 0.5, length * 0.14);
  shape.lineTo(width * 0.42, -tail);
  shape.lineTo(-width * 0.42, -tail);
  shape.lineTo(-width * 0.5, length * 0.14);
  shape.closePath();

  const slab = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.065,
      bevelSegments: 2,
      curveSegments: 2,
    }),
    bodyMaterial,
  );
  slab.castShadow = true;
  group.add(slab);

  // Faceted centre ridge — catches a hard specular line down the hand.
  const ridgeGeometry = batonGeometry(length * 0.9, width * 0.5, ridge, 0.015);
  const ridgeMesh = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
  ridgeMesh.position.set(0, (length * 0.9) / 2 + length * 0.03, thickness);
  ridgeMesh.castShadow = true;
  group.add(ridgeMesh);

  return group;
}

/** Slim needle for the seconds hand / small seconds. */
export function buildNeedle(material, { length = 14.4, width = 0.34, tail = 2.2, thickness = 0.16 } = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(0, length);
  shape.lineTo(width, length * 0.18);
  shape.lineTo(width * 0.5, -tail * 0.55);
  shape.lineTo(-width * 0.5, -tail * 0.55);
  shape.lineTo(-width, length * 0.18);
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 1,
      curveSegments: 2,
    }),
    material,
  );
  mesh.castShadow = true;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * strap
 * ------------------------------------------------------------------ */

/**
 * Sweeps a rectangular cross-section along a curve to make a leather strap.
 * Each of the four faces gets its own vertex strip so the edges stay crisp
 * while the length stays smooth. Outward winding is resolved per strip.
 */
export function buildStrapGeometry(curve, {
  widthStart = 20,
  widthEnd = 16,
  thickness = 2.1,
  samples = 180,
} = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const X = new THREE.Vector3(1, 0, 0);

  const rings = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3().crossVectors(X, tangent).normalize();
    const width = THREE.MathUtils.lerp(widthStart, widthEnd, t);
    // Slight thinning toward the tip, like a skived strap end.
    const height = thickness * (1 - 0.22 * Math.pow(t, 5));
    rings.push({ point, tangent, normal, width, height, t });
  }

  const length = curve.getLength();
  const vScale = length / 20; // one leather tile == 20 mm

  // Corners around the section: +X+N (outer), -X+N, -X-N (inner), +X-N.
  const corners = [
    { sx: 1, sn: 1 },
    { sx: -1, sn: 1 },
    { sx: -1, sn: -1 },
    { sx: 1, sn: -1 },
  ];

  const cornerPoint = (ring, corner) => new THREE.Vector3()
    .copy(ring.point)
    .addScaledVector(X, (ring.width / 2) * corner.sx)
    .addScaledVector(ring.normal, (ring.height / 2) * corner.sn);

  // Outward direction of each face in the strap's local frame.
  const expectedOut = [
    rings[0].normal.clone(), // outer face (+N)
    X.clone().negate(), // -X side
    rings[0].normal.clone().negate(), // lining (-N)
    X.clone(), // +X side
  ];

  for (let s = 0; s < 4; s += 1) {
    const cA = corners[s];
    const cB = corners[(s + 1) % 4];
    const base = positions.length / 3;

    for (let i = 0; i <= samples; i += 1) {
      const ring = rings[i];
      const a = cornerPoint(ring, cA);
      const b = cornerPoint(ring, cB);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const v = ring.t * vScale;
      uvs.push(0, v, 1, v);
    }

    for (let i = 0; i < samples; i += 1) {
      const a0 = base + i * 2;
      const b0 = a0 + 1;
      const a1 = a0 + 2;
      const b1 = a0 + 3;
      indices.push(a0, a1, b1, a0, b1, b0);
    }

    // Make sure this face points out of the strap, not into it.
    const p0 = cornerPoint(rings[0], cA);
    const p1 = cornerPoint(rings[1], cA);
    const p2 = cornerPoint(rings[1], cB);
    const faceNormal = new THREE.Vector3()
      .subVectors(p1, p0)
      .cross(new THREE.Vector3().subVectors(p2, p0));
    if (faceNormal.dot(expectedOut[s]) < 0) {
      for (let i = indices.length - samples * 6; i < indices.length; i += 3) {
        const tmp = indices[i + 1];
        indices[i + 1] = indices[i + 2];
        indices[i + 2] = tmp;
      }
    }
  }

  // End caps.
  for (const end of [0, samples]) {
    const ring = rings[end];
    const base = positions.length / 3;
    const pts = corners.map((c) => cornerPoint(ring, c));
    pts.forEach((p) => positions.push(p.x, p.y, p.z));
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    if (end === 0) {
      // Flip the start cap to face backwards.
      const last = indices.length - 6;
      const tmp = indices[last + 1];
      indices[last + 1] = indices[last + 2];
      indices[last + 2] = tmp;
      const tmp2 = indices[last + 4];
      indices[last + 4] = indices[last + 5];
      indices[last + 5] = tmp2;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Saddle stitching: instanced 1.6 mm stitches along both edges of the strap.
 * Returns an InstancedMesh ready to drop into the strap group.
 */
export function buildStitching(curve, material, {
  widthStart = 20,
  widthEnd = 16,
  thickness = 2.1,
  spacing = 3.2,
  inset = 1.45,
} = {}) {
  const X = new THREE.Vector3(1, 0, 0);
  const length = curve.getLength();
  const count = Math.floor(length / spacing);
  const stitch = new THREE.BoxGeometry(1.2, 0.3, 0.32);
  stitch.translate(0, 0, 0);
  const mesh = new THREE.InstancedMesh(stitch, material, count * 2);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const basis = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  let index = 0;

  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    const point = curve.getPointAt(t);
    tangent.copy(curve.getTangentAt(t)).normalize();
    normal.crossVectors(X, tangent).normalize();
    const width = THREE.MathUtils.lerp(widthStart, widthEnd, t);
    const height = thickness * (1 - 0.22 * Math.pow(t, 5));
    yAxis.copy(tangent);
    basis.makeBasis(X, yAxis, normal);
    quaternion.setFromRotationMatrix(basis);

    for (const side of [-1, 1]) {
      position.copy(point)
        .addScaledVector(X, side * (width / 2 - inset))
        .addScaledVector(normal, height / 2 + 0.03);
      matrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  mesh.count = index;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * movement
 * ------------------------------------------------------------------ */

/** Simple toothed wheel for the visible calibre. */
export function gearGeometry(radius = 4, teeth = 24, thickness = 0.5) {
  const shape = new THREE.Shape();
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const phase = i % 4;
    const r = (phase === 0 || phase === 1 ? radius : radius * 0.9);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.22, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  return new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 1,
    curveSegments: 4,
  });
}

/** Flat spiral used for the hairspring (returns a TubeGeometry). */
export function hairspringGeometry(turns = 5, inner = 0.55, outer = 2.3, tube = 0.055) {
  const points = [];
  const total = 260;
  for (let i = 0; i <= total; i += 1) {
    const t = i / total;
    const angle = t * Math.PI * 2 * turns;
    const radius = THREE.MathUtils.lerp(inner, outer, t);
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, total, tube, 5, false);
}
