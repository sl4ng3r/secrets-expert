import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SWITCHES } from '../behavior_pack/scripts/switch-catalog.js';
import { guideBody } from '../behavior_pack/scripts/switch-guide.js';
import { ACTIVITY_STATE, FACE_STATE, emitTorchParticles, handleSwitchInteraction, preparePlacement, stopPulse } from '../behavior_pack/scripts/switch-logic.js';

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
    isValid: true,
    permutation: permutation({ [ACTIVITY_STATE]: false, [FACE_STATE]: face }),
    writes: 0,
    offset(offset) {
      assert.deepEqual(offset, directions[face].offset);
      return { isAir: support === 'minecraft:air', isLiquid: support === 'minecraft:water' };
    },
    setPermutation(next) { this.permutation = next; this.writes++; },
  };
}

function click(block, { itemStack, isSneaking = false, isFirstEvent = true, cancel = false } = {}) {
  const event = { block, itemStack, player: { isSneaking }, isFirstEvent, cancel };
  const pending = [];
  handleSwitchInteraction(event, (callback) => pending.push(callback));
  return { event, pending };
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
    if (!block.components['secrets_expert:torch_ambience']) assert.equal(block.components['minecraft:tick'], undefined);
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

test('the three torch switches emit the matching flame sprite and smoke even when unpowered', () => {
  const sprites = { torch: [0, 24], soul_torch: [16, 24], copper_torch: [32, 56] };
  for (const { model, original, name } of SWITCHES) {
    const { components } = json(bp, `blocks/${name}.json`)['minecraft:block'];
    const ambience = components['secrets_expert:torch_ambience'];
    if (model !== 'torch') {
      assert.equal(ambience, undefined);
      continue;
    }
    assert.deepEqual(components['minecraft:tick'], { interval_range: [20, 20], looping: true });
    assert.deepEqual(ambience, { flame: `secrets_expert:${original}_flame` });
    const effect = json(rp, `particles/${original}_flame.json`).particle_effect;
    assert.equal(effect.description.identifier, ambience.flame);
    assert.deepEqual(effect.components['minecraft:particle_appearance_billboard'].uv.uv, sprites[original]);
    assert.deepEqual(effect.components['minecraft:emitter_rate_instant'], { num_particles: 1 });
  }
  const smoke = json(rp, 'particles/torch_smoke.json').particle_effect;
  assert.equal(smoke.description.identifier, 'secrets_expert:torch_smoke');
  assert.deepEqual(smoke.components['minecraft:emitter_rate_instant'], { num_particles: 1 });
});

test('torch effects start at the outward tip in all four wall orientations', () => {
  for (const [face, { offset }] of Object.entries(directions)) {
    const block = wallSwitch(face);
    const effects = [];
    block.location = { x: 4, y: 80, z: -5 };
    block.dimension = { spawnParticle: (id, location) => effects.push({ id, location }) };
    const origin = { x: 4.5 + offset.x * 3 / 16, y: 80 + 13 / 16, z: -4.5 + offset.z * 3 / 16 };
    emitTorchParticles(block, 'secrets_expert:torch_flame');
    assert.deepEqual(effects, [
      { id: 'secrets_expert:torch_flame', location: origin },
      { id: 'secrets_expert:torch_smoke', location: origin },
    ]);
  }
});

test('activates a wall switch once and resets only the powered state', () => {
  for (const face of Object.keys(directions)) {
    const block = wallSwitch(face);
    click(block).pending[0]();
    click(block).pending[0]();
    assert.equal(block.permutation.getState(ACTIVITY_STATE), true);
    assert.equal(block.writes, 1);
    stopPulse(block);
    stopPulse(block);
    assert.equal(block.permutation.getState(ACTIVITY_STATE), false);
    assert.equal(block.permutation.getState(FACE_STATE), face);
    assert.equal(block.writes, 2);
  }
});

test('all switch variants consume a normal use click with empty hand, a tool or a building block', () => {
  for (const { id } of SWITCHES) {
    for (const itemStack of [undefined, { typeId: 'minecraft:iron_pickaxe' }, { typeId: 'minecraft:cobblestone' }]) {
      const block = { ...wallSwitch(), typeId: id };
      const { event, pending } = click(block, { itemStack });
      assert.equal(event.cancel, true);
      assert.equal(block.writes, 0, 'world changes must happen after the before-event');
      assert.equal(pending.length, 1);
      pending[0]();
      assert.equal(block.permutation.getState(ACTIVITY_STATE), true);
    }
  }
});

test('sneaking with an item, ordinary blocks and cancelled clicks pass through without a pulse', () => {
  const block = wallSwitch();
  const vanilla = { ...block, typeId: 'minecraft:torch' };
  for (const [target, options] of [
    [block, { isSneaking: true, itemStack: { typeId: 'minecraft:stone' } }],
    [vanilla, {}],
    [block, { cancel: true }],
  ]) {
    const { event, pending } = click(target, options);
    assert.equal(event.cancel, options.cancel ?? false);
    assert.equal(pending.length, 0);
    assert.equal(target.writes, 0);
  }
  const { event, pending } = click(block, { isSneaking: true });
  assert.equal(event.cancel, true);
  assert.equal(pending.length, 1);
});

test('holding use consumes repeats without firing again and a fresh press reactivates the switch', () => {
  const block = wallSwitch();
  const itemStack = { typeId: 'minecraft:stone' };
  click(block, { itemStack }).pending[0]();
  stopPulse(block);
  const repeat = click(block, { itemStack, isFirstEvent: false });
  assert.equal(repeat.event.cancel, true);
  assert.equal(repeat.pending.length, 0);
  assert.equal(block.permutation.getState(ACTIVITY_STATE), false);
  click(block, { itemStack }).pending[0]();
  assert.equal(block.permutation.getState(ACTIVITY_STATE), true);
});

test('deferred activation skips removed, changed, unloaded or unsupported switches', () => {
  for (const change of [
    (block) => { block.typeId = 'minecraft:air'; },
    (block) => { block.typeId = 'secrets_expert:switch_soul_torch'; },
    (block) => { block.permutation = block.permutation.withState(FACE_STATE, 'east'); },
    (block) => { block.isValid = false; },
    (block) => { block.offset = () => ({ isAir: true, isLiquid: false }); },
    (block) => { block.offset = () => undefined; },
  ]) {
    const block = wallSwitch();
    const { pending } = click(block);
    change(block);
    pending[0]();
    assert.equal(block.writes, 0);
  }
  const floor = wallSwitch('up');
  click(floor).pending[0]();
  assert.equal(floor.writes, 0);
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
