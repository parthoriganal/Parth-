/**
 * materials.js — the metal book.
 *
 * Two metals drive the whole case (polished + brushed) so a colourway swap
 * is a couple of uniform updates rather than a rebuild. Dial and strap
 * materials are cached per finish.
 */

import * as THREE from 'three';
import {
  createDialTexture,
  createSubdialTexture,
  createLeatherTextures,
  createBrushedTexture,
  createGenevaTexture,
  createGenevaNormal,
  createPerlageTexture,
  createPerlageNormal,
  setMaxAnisotropy,
} from './textures.js';

export const CASE_METALS = {
  yellow: {
    id: 'yellow',
    label: '18k Yellow Gold',
    short: 'Yellow gold',
    color: 0xf4c86b,
    roughnessPolished: 0.055,
    roughnessBrushed: 0.5,
  },
  rose: {
    id: 'rose',
    label: '18k Rose Gold',
    short: 'Rose gold',
    color: 0xf0b394,
    roughnessPolished: 0.055,
    roughnessBrushed: 0.5,
  },
  white: {
    id: 'white',
    label: '18k White Gold',
    short: 'White gold',
    color: 0xdde0dd,
    roughnessPolished: 0.06,
    roughnessBrushed: 0.5,
  },
  platinum: {
    id: 'platinum',
    label: 'Platinum 950',
    short: 'Platinum',
    color: 0xcbcfd0,
    roughnessPolished: 0.1,
    roughnessBrushed: 0.56,
  },
};

export const DIALS = {
  obsidian: {
    id: 'obsidian',
    label: 'Obsidian',
    light: '#2c3138',
    base: '#0e1014',
    rim: '#050506',
    text: '#dcc78f',
    track: '#c9b078',
    trackFaint: 'rgba(201,176,120,0.55)',
    metalness: 0.62,
    roughness: 0.22,
  },
  salmon: {
    id: 'salmon',
    label: 'Salmon',
    light: '#f0bda7',
    base: '#d78f76',
    rim: '#a9614c',
    text: '#3b241c',
    track: '#553226',
    trackFaint: 'rgba(70,42,32,0.6)',
    metalness: 0.35,
    roughness: 0.36,
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight Blue',
    light: '#22446f',
    base: '#0b1830',
    rim: '#050b17',
    text: '#dfe7f2',
    track: '#c7d6ea',
    trackFaint: 'rgba(199,214,234,0.5)',
    metalness: 0.6,
    roughness: 0.24,
  },
  champagne: {
    id: 'champagne',
    label: 'Champagne',
    light: '#f2e3c2',
    base: '#d7c096',
    rim: '#9d855c',
    text: '#463520',
    track: '#5f4a2c',
    trackFaint: 'rgba(95,74,44,0.6)',
    metalness: 0.45,
    roughness: 0.32,
  },
};

export const STRAPS = {
  black: { id: 'black', label: 'Noir Alligator', color: 0x1c1b19, stitch: 0xbfae90 },
  cognac: { id: 'cognac', label: 'Cognac Alligator', color: 0xa97143, stitch: 0xd8c6a6 },
  navy: { id: 'navy', label: 'Navy Alligator', color: 0x3c4d69, stitch: 0xc9c3b3 },
  oxblood: { id: 'oxblood', label: 'Oxblood Alligator', color: 0x6d2f27, stitch: 0xcdbb9d },
};

export class MaterialLibrary {
  constructor({ anisotropy = 8 } = {}) {
    setMaxAnisotropy(anisotropy);

    this.dialCache = new Map();
    this.brushedMap = createBrushedTexture();
    this.genevaMap = createGenevaTexture();
    this.genevaNormal = createGenevaNormal();
    this.perlageMap = createPerlageTexture();
    this.perlageNormal = createPerlageNormal();
    this.leatherTextures = createLeatherTextures();

    /* ---- precious metal (swapped by the case colourway) ---- */
    this.metalPolished = new THREE.MeshPhysicalMaterial({
      name: 'metal.polished',
      color: CASE_METALS.yellow.color,
      metalness: 1,
      roughness: CASE_METALS.yellow.roughnessPolished,
      envMapIntensity: 1.9,
      reflectivity: 1,
    });

    this.metalBrushed = new THREE.MeshPhysicalMaterial({
      name: 'metal.brushed',
      color: CASE_METALS.yellow.color,
      metalness: 1,
      roughness: CASE_METALS.yellow.roughnessBrushed,
      roughnessMap: this.brushedMap,
      envMapIntensity: 1.3,
    });

    // Strap furniture gets its own copy so it can fade for the movement view.
    this.strapMetal = this.metalBrushed.clone();
    this.strapMetal.name = 'metal.strap';

    /* ---- sapphire ---- */
    this.sapphire = new THREE.MeshPhysicalMaterial({
      name: 'sapphire',
      color: 0xffffff,
      metalness: 0,
      roughness: 0.015,
      transmission: 1,
      thickness: 1.4,
      ior: 1.77,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6,
      attenuationColor: new THREE.Color(0xdfeaff),
      attenuationDistance: 120,
      iridescence: 0.14,
      iridescenceIOR: 1.32,
      iridescenceThicknessMinimum: 120,
      iridescenceThicknessMaximum: 340,
      transparent: true,
      opacity: 1,
      side: THREE.FrontSide,
      depthWrite: false,
    });

    // Display-back glass: thinner and clearer so the calibre reads brightly.
    this.backSapphire = this.sapphire.clone();
    this.backSapphire.name = 'sapphire.back';
    this.backSapphire.thickness = 0.5;
    this.backSapphire.iridescence = 0.04;
    this.backSapphire.attenuationDistance = 220;
    this.backSapphire.envMapIntensity = 1.25;

    /* ---- dials ---- */
    this.dialMaterial = new THREE.MeshPhysicalMaterial({
      name: 'dial',
      color: 0xffffff,
      map: null,
      roughnessMap: null,
      metalness: DIALS.obsidian.metalness,
      roughness: DIALS.obsidian.roughness,
      clearcoat: 0.5,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.85,
    });

    this.subdialMaterial = new THREE.MeshPhysicalMaterial({
      name: 'dial.sub',
      color: 0xffffff,
      map: null,
      roughnessMap: null,
      metalness: 0.45,
      roughness: 0.42,
      clearcoat: 0.45,
      clearcoatRoughness: 0.1,
      envMapIntensity: 0.8,
    });
    this.setDial('obsidian');

    /* ---- leather ---- */
    this.leather = new THREE.MeshPhysicalMaterial({
      name: 'leather',
      color: STRAPS.cognac.color,
      map: this.leatherTextures.map,
      normalMap: this.leatherTextures.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: this.leatherTextures.roughnessMap,
      roughness: 0.88,
      metalness: 0,
      sheen: 0.35,
      sheenRoughness: 0.62,
      sheenColor: new THREE.Color(0xd8c3a4),
      clearcoat: 0.05,
      clearcoatRoughness: 0.7,
      envMapIntensity: 0.85,
      side: THREE.DoubleSide,
    });

    this.stitching = new THREE.MeshStandardMaterial({
      name: 'stitching',
      color: STRAPS.cognac.stitch,
      roughness: 0.92,
      metalness: 0,
    });
    this.setStrap('cognac');

    /* ---- movement ---- */
    this.geneva = new THREE.MeshPhysicalMaterial({
      name: 'geneva',
      color: 0xe4c084,
      metalness: 1,
      roughness: 0.34,
      roughnessMap: this.genevaMap,
      normalMap: this.genevaNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      envMapIntensity: 1.7,
    });

    // The automatic rotor wears the same Côtes de Genève, polished a touch
    // brighter so it reads as the jewel of the display back.
    this.rotorMetal = new THREE.MeshPhysicalMaterial({
      name: 'rotor.gold',
      color: 0xeccd95,
      metalness: 1,
      roughness: 0.28,
      map: this.genevaMap,
      roughnessMap: this.genevaMap,
      normalMap: this.genevaNormal,
      normalScale: new THREE.Vector2(0.3, 0.3),
      envMapIntensity: 1.8,
    });
    this.bridgeMetal = new THREE.MeshPhysicalMaterial({
      name: 'bridge.gold',
      color: 0xcaa76a,
      metalness: 1,
      roughness: 0.32,
      map: this.genevaMap,
      roughnessMap: this.genevaMap,
      normalMap: this.genevaNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      envMapIntensity: 1.55,
    });
    this.perlage = new THREE.MeshPhysicalMaterial({
      name: 'perlage',
      color: 0xa9ada7,
      metalness: 1,
      roughness: 0.42,
      roughnessMap: this.perlageMap,
      normalMap: this.perlageNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      envMapIntensity: 1.5,
    });
    this.bluedSteel = new THREE.MeshPhysicalMaterial({
      name: 'steel.blued',
      color: 0x2f5aa8,
      metalness: 1,
      roughness: 0.12,
      envMapIntensity: 1.8,
    });
    this.steel = new THREE.MeshPhysicalMaterial({
      name: 'steel',
      color: 0xd2d6da,
      metalness: 1,
      roughness: 0.14,
      envMapIntensity: 1.8,
    });
    this.ruby = new THREE.MeshPhysicalMaterial({
      name: 'ruby',
      color: 0x9c1030,
      metalness: 0.05,
      roughness: 0.06,
      transmission: 0.45,
      thickness: 0.8,
      ior: 1.76,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.4,
      transparent: true,
    });
    this.engraving = new THREE.MeshStandardMaterial({
      name: 'engraving',
      color: 0x2a1b08,
      roughness: 0.55,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.shadowCatcher = new THREE.MeshStandardMaterial({
      name: 'shadow',
      color: 0x000000,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.42,
    });
    this.springBar = this.steel;
  }

  /** Swap the whole precious-metal colourway in one move. */
  setCaseMetal(id) {
    const metal = CASE_METALS[id] || CASE_METALS.yellow;
    this.caseMetal = metal;
    this.metalPolished.color.setHex(metal.color);
    this.metalPolished.roughness = metal.roughnessPolished;
    this.metalBrushed.color.setHex(metal.color);
    this.metalBrushed.roughness = metal.roughnessBrushed;
    this.strapMetal.color.setHex(metal.color);
    this.strapMetal.roughness = metal.roughnessBrushed;
    return metal;
  }

  /** Dials are baked lazily and cached — four colourways max. */
  setDial(id) {
    const spec = DIALS[id] || DIALS.obsidian;
    let entry = this.dialCache.get(spec.id);
    if (!entry) {
      const dialTextures = createDialTexture(spec);
      entry = {
        map: dialTextures.map,
        roughnessMap: dialTextures.roughnessMap,
        normalMap: dialTextures.normalMap,
        subMap: createSubdialTexture(spec),
      };
      this.dialCache.set(spec.id, entry);
    }
    this.dialMaterial.map = entry.map;
    this.dialMaterial.roughnessMap = entry.roughnessMap;
    this.dialMaterial.normalMap = entry.normalMap;
    this.dialMaterial.normalScale.set(0.22, 0.22);
    this.dialMaterial.metalness = spec.metalness;
    this.dialMaterial.roughness = spec.roughness;
    this.dialMaterial.needsUpdate = true;

    this.subdialMaterial.map = entry.subMap;
    this.subdialMaterial.roughnessMap = entry.roughnessMap;
    this.subdialMaterial.normalMap = entry.normalMap;
    this.subdialMaterial.normalScale.set(0.16, 0.16);
    this.subdialMaterial.roughness = Math.min(0.66, spec.roughness + 0.1);
    this.subdialMaterial.needsUpdate = true;
    this.dial = spec;
    return spec;
  }

  setStrap(id) {
    const strap = STRAPS[id] || STRAPS.cognac;
    this.leather.color.setHex(strap.color);
    this.stitching.color.setHex(strap.stitch);
    this.strap = strap;
    return strap;
  }
}
