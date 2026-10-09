import * as THREE from 'three';
import { mat } from './builders.js';
import * as T from './textures.js';

let M = null;
export function getMaterials() {
  if (M) return M;
  M = {
    white: mat('#f4f6f8'),
    wallWhite: mat('#eef0ee', { emissive: '#34383a' }),
    wallYellow: mat('#f1d27a'),
    wallTeal: mat('#7fb7b1'),
    wallBlueLow: mat('#9cc7e6'),
    sportBlue: mat('#3b8fd0'),
    ceiling: mat('#f7f7f4', { emissive: '#c9ccc8' }),
    blue: mat('#1f63c8'),
    blueDark: mat('#174b9a'),
    blueTrim: mat('#2b6fd6'),
    plinth: mat('#8a96a6'),
    deskTop: mat('#d9a86c'),
    metal: mat('#4a4f57'),
    chair: mat('#c9874a'),
    blackChair: mat('#23262c'),
    shelf: mat('#b77b45'),
    bookA: mat('#2d6cc0'), bookB: mat('#e3e8ee'), bookC: mat('#d24b4b'),
    pot: mat('#c4683a'),
    leaf: mat('#3f8a3a', { flatShading: true }),
    pine: mat('#2f5d3a', { flatShading: true }),
    trunk: mat('#6b4a2e'),
    stepOrange: mat('#e6a23c'),
    railBlue: mat('#3aa9d8'),
    postGreen: mat('#2e9a5b'),
    curb: mat('#e9ecef'),
    door: mat('#7a4a2a'),
    redStair: mat('#b8343b'),
    steel: mat('#b9c0c8'),
    tileBlue: mat('#2f6fb3'),
    fridge: mat('#f2f4f6'),
    stage: mat('#9b5a32'),
    curtainPink: mat('#d6418f'),
    screen: mat('#f9fafb'),
    speaker: mat('#1d1f24'),
    tvBlack: mat('#121417'),
    radiatorPanel: mat('#ece6d6'),
    lampBody: mat('#e9ecef'),
    // текстуралы
    siding: mat('#ffffff', { map: T.siding(12, 6) }),
    sidingWing: mat('#ffffff', { map: T.siding(6, 6) }),
    roof: mat('#ffffff', { map: T.roofMetal(14, 2), side: THREE.DoubleSide }),
    roofWing: mat('#ffffff', { map: T.roofMetal(4, 7), side: THREE.DoubleSide }),
    wood: mat('#ffffff', { map: T.woodFloor(3, 3) }),
    woodLong: mat('#ffffff', { map: T.woodFloor(18, 1.5) }),
    tile: mat('#ffffff', { map: T.tileFloor(6, 4) }),
    tileLobby: mat('#ffffff', { map: T.tileFloor(6, 4, '#c9cfd6') }),
    tileCorridor: mat('#ffffff', { map: T.tileFloor(36, 2, '#c9cfd6') }),
    sportFloor: mat('#ffffff', { map: T.sportFloor() }),
    curtain: mat('#ffffff', { map: T.curtain(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
    blueCurtain: mat('#ffffff', { map: T.blueCurtain(), side: THREE.DoubleSide }),
    chalk: mat('#ffffff', { map: T.chalkboard() }),
    trig: mat('#ffffff', { map: T.trigStand(), transparent: true }),
    gate: mat('#ffffff', { map: T.gateSwirl(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }),
    ornament: mat('#ffffff', { map: T.ornament(), side: THREE.DoubleSide }),
    grass: mat('#ffffff', { map: T.grass() }),
    asphalt: mat('#ffffff', { map: T.asphalt() }),
    laptopScreen: new THREE.MeshBasicMaterial({ map: T.screenTex('lap') }),
    boardScreen: new THREE.MeshBasicMaterial({ map: T.screenTex('board', ['#0b2545', '#2a9df4']) }),
    tvScreen: new THREE.MeshBasicMaterial({ map: T.screenTex('tv', ['#13293d', '#3e7cb1']) }),
    // жарқырайтын
    windowGlass: new THREE.MeshBasicMaterial({ color: '#d8ecfb' }),
    extGlass: new THREE.MeshLambertMaterial({ color: '#4d6f8f', emissive: '#1a2c3d' }),
    vestGlass: new THREE.MeshLambertMaterial({ color: '#cfe3f2', transparent: true, opacity: 0.55 }),
  };
  return M;
}

/** Әр шамға жеке материал: режимге қарай түсі ауысады */
export function lampMaterial() {
  return new THREE.MeshBasicMaterial({ color: '#fff4d8' });
}

export const LAMP_COLORS = {
  current: new THREE.Color('#ffe9b8'),
  led: new THREE.Color('#e6f4ff'),
  off: new THREE.Color('#8e959e'),
  hover: new THREE.Color('#ffd34d'),
};
