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

export function handleSwitchInteraction(event, defer) {
  if (event.cancel || (event.itemStack && event.player.isSneaking)) return;
  const { block } = event;
  const { typeId } = block;
  if (!switchIds.has(typeId)) return;

  event.cancel = true;
  if (!event.isFirstEvent) return;
  const face = block.permutation.getState(FACE_STATE);
  defer(() => {
    if (!block.isValid || block.typeId !== typeId) return;
    const permutation = block.permutation;
    if (permutation.getState(FACE_STATE) === face) activateSwitch(block, permutation);
  });
}

export function activateSwitch(block, permutation = block.permutation) {
  if (permutation.getState(ACTIVITY_STATE) || !hasSupport(block, permutation.getState(FACE_STATE))) return;
  block.setPermutation(permutation.withState(ACTIVITY_STATE, true));
}

export function stopPulse(block) {
  if (!switchIds.has(block.typeId)) return;
  const { permutation } = block;
  if (permutation.getState(ACTIVITY_STATE)) block.setPermutation(permutation.withState(ACTIVITY_STATE, false));
}

export function emitTorchParticles(block, effect, roll = Math.random()) {
  // Emit on 40% of the one-second ticks to leave gaps between bursts.
  if (roll >= 0.4) return;
  const support = FACES[block.permutation.getState(FACE_STATE)]?.offset;
  if (!support) return;
  const { x, y, z } = block.location;
  // The tilted wick is 13 pixels high and 3.5 pixels toward the wall from the center.
  const tip = { x: x + 0.5 + support.x * 3.5 / 16, y: y + 13 / 16, z: z + 0.5 + support.z * 3.5 / 16 };
  block.dimension.spawnParticle(effect, tip);
}
