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

// Full blocks suitable for both mounting and conducting a strong signal.
export const WALL_BLOCKS = [
  'stone', 'smooth_stone', 'cobblestone', 'mossy_cobblestone',
  'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'chiseled_stone_bricks',
  'granite', 'diorite', 'andesite', 'polished_granite', 'polished_diorite', 'polished_andesite',
  'deepslate', 'cobbled_deepslate', 'polished_deepslate', 'deepslate_bricks', 'deepslate_tiles',
  'tuff', 'polished_tuff', 'tuff_bricks', 'calcite', 'brick_block', 'mud_bricks',
  'sandstone', 'red_sandstone', 'netherrack', 'nether_brick', 'blackstone', 'polished_blackstone',
  'end_stone', 'end_bricks', 'quartz_block', 'smooth_quartz',
  'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks',
  'dark_oak_planks', 'mangrove_planks', 'cherry_planks', 'pale_oak_planks',
  'hardened_clay', 'white_concrete', 'gray_concrete', 'light_gray_concrete', 'black_concrete',
].map((id) => `minecraft:${id}`);

const wallIds = new Set(WALL_BLOCKS);
const switchIds = new Set(SWITCHES.map(({ id }) => id));

export function isSwitch(typeId) {
  return switchIds.has(typeId);
}

function hasSupport(block, face) {
  const offset = FACES[face]?.offset;
  return Boolean(offset && wallIds.has(block.offset(offset)?.typeId));
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
  if (!emptyMainHand || !isSwitch(block.typeId)) return;
  const { permutation } = block;
  if (permutation.getState(ACTIVITY_STATE) || !hasSupport(block, permutation.getState(FACE_STATE))) return;
  block.setPermutation(permutation.withState(ACTIVITY_STATE, true));
}

export function stopPulse(block) {
  if (!isSwitch(block.typeId)) return;
  const { permutation } = block;
  if (permutation.getState(ACTIVITY_STATE)) block.setPermutation(permutation.withState(ACTIVITY_STATE, false));
}
