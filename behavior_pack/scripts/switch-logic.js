import { NAMESPACE, SWITCHES } from './switch-catalog.js';

export const ACTIVITY_STATE = `${NAMESPACE}:powered`;
export const FACE_STATE = 'minecraft:block_face';
export const PULSE_TICKS = 20;
export const FACES = {
  north: { support: 'south', offset: { x: 0, y: 0, z: 1 }, rotation: 180 },
  east: { support: 'west', offset: { x: -1, y: 0, z: 0 }, rotation: 90 },
  south: { support: 'north', offset: { x: 0, y: 0, z: -1 }, rotation: 0 },
  west: { support: 'east', offset: { x: 1, y: 0, z: 0 }, rotation: -90 },
};

const switchIds = new Set(SWITCHES.map(({ id }) => id));

function hasSupport(block, face) {
  const offset = FACES[face]?.offset;
  if (!offset) return false;
  const support = block.offset(offset);
  return Boolean(support && !support.isAir && !support.isLiquid);
}

export function preparePlacement(event) {
  const face = event.face.toLowerCase();
  if (!hasSupport(event.block, face)) {
    event.cancel = true;
    return;
  }
  event.permutationToPlace = event.permutationToPlace.withState(FACE_STATE, face).withState(ACTIVITY_STATE, false);
}

export function activateSwitch(block, emptyMainHand) {
  if (!emptyMainHand || !switchIds.has(block.typeId)) return;
  const { permutation } = block;
  if (permutation.getState(ACTIVITY_STATE) || !hasSupport(block, permutation.getState(FACE_STATE))) return;
  block.setPermutation(permutation.withState(ACTIVITY_STATE, true));
}

export function stopPulse(block) {
  if (!switchIds.has(block.typeId)) return;
  const { permutation } = block;
  if (permutation.getState(ACTIVITY_STATE)) block.setPermutation(permutation.withState(ACTIVITY_STATE, false));
}
