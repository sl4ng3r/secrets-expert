import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SWITCHES } from '../behavior_pack/scripts/switch-catalog.js';
import { guideBody } from '../behavior_pack/scripts/switch-guide.js';
import { ACTIVITY_STATE, FACE_STATE, activateSwitch, preparePlacement, stopPulse } from '../behavior_pack/scripts/switch-logic.js';

const bp = new URL('../behavior_pack/', import.meta.url);
const rp = new URL('../resource_pack/', import.meta.url);
const json = (root, file) => JSON.parse(readFileSync(new URL(file, root), 'utf8'));
const expectedIngredients = [
  'torch', 'soul_torch', 'copper_torch', 'skeleton_skull', 'end_rod',
  'dead_horn_coral_fan', 'glow_lichen', 'oak_slab', 'glass_pane',
].map((ingredient) => `minecraft:${ingredient}`);
const directions = {
  north: { side: 'south', offset: { x: 0, y: 0, z: 1 } },
  east: { side: 'west', offset: { x: -1, y: 0, z: 0 } },
  south: { side: 'north', offset: { x: 0, y: 0, z: -1 } },
  west: { side: 'east', offset: { x: 1, y: 0, z: 0 } },
};

function permutation(states) {
  return {
    getState(key) { return states[key]; },
    withState(key, value) { return permutation({ ...states, [key]: value }); },
  };
}

function wallSwitch(face = 'north', support = 'minecraft:stone') {
  return {
    typeId: 'secrets_expert:switch_torch',
    permutation: permutation({ [ACTIVITY_STATE]: false, [FACE_STATE]: face }),
    writes: 0,
    offset(offset) {
      assert.deepEqual(offset, directions[face].offset);
      return { isAir: support === 'minecraft:air', isLiquid: support === 'minecraft:water' };
    },
    setPermutation(next) { this.permutation = next; this.writes++; },
  };
}

test('all nine craftable switches appear in the reading UI and resolve in both languages', () => {
  assert.deepEqual(SWITCHES.map(({ ingredient }) => ingredient).sort(), expectedIngredients.sort());
  const recipes = readdirSync(new URL('recipes/', bp)).filter((name) => /^switch_(?!guide)/.test(name));
  assert.equal(recipes.length, SWITCHES.length);
  const texts = guideBody().rawtext;
  for (const locale of ['de_DE', 'en_US']) {
    const lang = readFileSync(new URL(`texts/${locale}.lang`, rp), 'utf8');
    const keys = new Set(lang.split(/\r?\n/).map((line) => line.split('=')[0]));
    for (const fragment of texts.filter((fragment) => fragment.translate)) {
      assert.ok(keys.has(fragment.translate), `Missing ${fragment.translate} in ${locale}`);
    }
    for (const { name, ingredient, nameKey, originalKey } of SWITCHES) {
      assert.ok(keys.has(nameKey));
      assert.equal(texts.filter((fragment) => fragment.translate === originalKey).length, 1);
      const recipe = json(bp, `recipes/${name}.json`)['minecraft:recipe_shapeless'];
      assert.deepEqual(recipe.tags, ['crafting_table']);
      assert.deepEqual(recipe.ingredients, [{ item: ingredient }, { item: 'minecraft:redstone' }]);
      assert.deepEqual(recipe.result, { item: `secrets_expert:${name}`, count: 1 });
    }
  }
});

test('each block has four powered orientations, a native reset tick, and an inactive baseline', () => {
  for (const { name, nameKey } of SWITCHES) {
    const block = json(bp, `blocks/${name}.json`)['minecraft:block'];
    assert.equal(block.description.identifier, `secrets_expert:${name}`);
    assert.equal(block.components['minecraft:display_name'], nameKey);
    assert.equal(block.components['minecraft:redstone_producer'].power, 0);
    assert.equal(block.components['minecraft:tick'], undefined);
    assert.deepEqual(block.components['minecraft:placement_filter'].conditions, [
      { allowed_faces: ['north', 'east', 'south', 'west'] },
    ]);
    const powered = block.permutations.filter(({ components }) => components['minecraft:redstone_producer']);
    assert.equal(powered.length, 4);
    for (const [face, { side }] of Object.entries(directions)) {
      const output = powered.find(({ condition }) => condition.includes(`== '${face}'`));
      assert.ok(output.condition.includes(ACTIVITY_STATE));
      assert.deepEqual(output.components['minecraft:redstone_producer'], {
        power: 15, connected_faces: [side], strongly_powered_face: side, transform_relative: false,
      });
      assert.deepEqual(output.components['minecraft:tick'].interval_range, [20, 20]);
      assert.ok(output.components['secrets_expert:switch_reset']);
    }
  }
});

test('activates a wall switch once and resets only the powered state', () => {
  for (const face of Object.keys(directions)) {
    const block = wallSwitch(face);
    activateSwitch(block, true);
    activateSwitch(block, true);
    assert.equal(block.permutation.getState(ACTIVITY_STATE), true);
    assert.equal(block.writes, 1);
    stopPulse(block);
    stopPulse(block);
    assert.equal(block.permutation.getState(ACTIVITY_STATE), false);
    assert.equal(block.permutation.getState(FACE_STATE), face);
    assert.equal(block.writes, 2);
  }
});

test('tools, vanilla blocks and unsupported placements cause no pulse', () => {
  const noSupport = wallSwitch('east', 'minecraft:air');
  const floor = wallSwitch('up');
  const vanilla = { ...wallSwitch(), typeId: 'minecraft:torch' };
  const switchWithItem = wallSwitch();
  activateSwitch(noSupport, true);
  activateSwitch(floor, true);
  activateSwitch(vanilla, true);
  activateSwitch(switchWithItem, false);
  for (const block of [noSupport, floor, vanilla, switchWithItem]) assert.equal(block.writes, 0);
});

test('placing on a vanilla-approved wall starts unpowered without a separate list of block types', () => {
  const valid = { block: wallSwitch('east', 'minecraft:oak_log'), face: 'East', permutationToPlace: permutation({ [ACTIVITY_STATE]: true }) };
  preparePlacement(valid);
  assert.notEqual(valid.cancel, true);
  assert.equal(valid.permutationToPlace.getState(ACTIVITY_STATE), false);
  assert.equal(valid.permutationToPlace.getState(FACE_STATE), 'east');
  for (const event of [
    { ...valid, face: 'Up' }, { ...valid, block: wallSwitch('east', 'minecraft:air') },
  ]) {
    preparePlacement(event);
    assert.equal(event.cancel, true);
  }
});
