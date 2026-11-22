import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAMESPACE, SWITCHES } from '../behavior_pack/scripts/switch-catalog.js';
import { ACTIVITY_STATE, FACE_STATE, FACES, PULSE_TICKS } from '../behavior_pack/scripts/switch-logic.js';

const output = (file) => fileURLToPath(new URL(`../${file}`, import.meta.url));
const check = process.argv.includes('--check');
const drift = [];

function put(file, content) {
  const path = output(file);
  const serialized = typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`;
  if (existsSync(path) && readFileSync(path, 'utf8') === serialized) return;
  if (check) {
    drift.push(file);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, serialized);
}

const wallFaces = Object.keys(FACES);
const textures = {
  torch: 'textures/blocks/torch_on',
  copper_torch: 'textures/blocks/copper_torch',
  soul_torch: 'textures/blocks/soul_torch',
  skeleton_skull: 'textures/entity/skeleton/skeleton',
  end_rod: 'textures/blocks/end_rod',
  dead_horn_coral_fan: 'textures/blocks/coral_fan_yellow_dead',
  glow_lichen: 'textures/blocks/glow_lichen',
  oak_slab: 'textures/blocks/planks_oak',
  glass_pane: 'textures/blocks/glass',
  glass_edge: 'textures/blocks/glass_pane_top',
};

function faceUv(uv, size, material) {
  return { uv, uv_size: size, ...(material ? { material_instance: material } : {}) };
}

function faceMap(faces, uv, size, material) {
  return Object.fromEntries(faces.map((face) => [face, faceUv(uv, size, material)]));
}

function box(origin, size, uv) {
  return { origin, size, ...(uv === undefined ? {} : { uv }) };
}

// The three vanilla torch textures share the same two-pixel-wide shaft.
// The rest of the sprite is transparent and should not cover the cube faces.
const torchShaft = {
  ...box([-1, 3, -6], [2, 10, 2], {
    ...faceMap(['north', 'south', 'east', 'west'], [7, 6], [2, 10]),
    up: faceUv([7, 6], [2, 2]),
    down: faceUv([7, 14], [2, 2]),
  }),
  pivot: [0, 8, -5],
  rotation: [-22.5, 0, 0],
};

// Model the end rod horizontally inside the block. Bedrock rejects the old
// vertical bone after rotating its bounds at the wall.
const rodBase = box([-2, 6, -8], [4, 4, 1], {
  ...faceMap(['north', 'south'], [2, 3], [4, 4]),
  ...faceMap(['up', 'down'], [2, 2], [4, 1]),
  east: { ...faceUv([2, 2], [4, 1]), uv_rotation: 90 },
  west: { ...faceUv([2, 2], [4, 1]), uv_rotation: 270 },
});
const rodShaft = box([-1, 7, -7], [2, 2, 15], {
  ...faceMap(['north', 'south'], [2, 0], [2, 2]),
  ...faceMap(['up', 'down'], [0, 0], [2, 15]),
  east: { ...faceUv([0, 0], [2, 15]), uv_rotation: 90 },
  west: { ...faceUv([0, 0], [2, 15]), uv_rotation: 270 },
});
const selection = {
  torch: box([-2, 2, -8], [4, 12, 6]),
  skull: box([-4, 4, -8], [8, 8, 8]),
  rod: box([-2, 6, -8], [4, 4, 16]),
  coral: box([-6, 3, -8], [12, 10, 10]),
  lichen: box([-8, 0, -8], [16, 16, 1]),
  slab: box([-8, 0, -8], [16, 8, 16]),
};

const paneParts = {
  center: box([-1, 0, -1], [2, 16, 2]),
  north: box([-1, 0, -8], [2, 16, 7]),
  east: box([1, 0, -1], [7, 16, 2]),
  south: box([-1, 0, 1], [2, 16, 7]),
  west: box([-8, 0, -1], [7, 16, 2]),
};

function paneBone(name, shape) {
  const [width, , depth] = shape.size;
  return {
    name, pivot: [0, 0, 0],
    cubes: [box(shape.origin, shape.size, {
      ...faceMap(['north', 'south'], [Math.round((16 - width) / 2), 0], [width, 16]),
      ...faceMap(['east', 'west'], [Math.round((16 - depth) / 2), 0], [depth, 16]),
      ...faceMap(['up', 'down'], [Math.round((16 - width) / 2), Math.round((16 - depth) / 2)], [width, depth], 'edge'),
    })],
  };
}

const meshes = {
  torch: [{ name: 'main', pivot: [0, 0, 0], cubes: [torchShaft] }],
  skull: [{ name: 'main', pivot: [0, 0, 0], cubes: [box([-4, 4, -8], [8, 8, 8], [0, 0])] }],
  rod: [{ name: 'main', pivot: [0, 0, 0], cubes: [rodBase, rodShaft] }],
  coral: [{ name: 'main', pivot: [0, 6, -8], rotation: [-35, 0, 0], cubes: [
    box([-8, 6, -8], [16, 0, 12], faceMap(['up', 'down'], [0, 0], [16, 16])),
  ] }],
  lichen: [{ name: 'main', pivot: [0, 0, 0], cubes: [
    box([-8, 0, -7.94], [16, 16, 0], faceMap(['north', 'south'], [0, 0], [16, 16])),
  ] }],
  slab: [{ name: 'main', pivot: [0, 0, 0], cubes: [box([-8, 0, -8], [16, 8, 16], {
    ...faceMap(['north', 'south', 'east', 'west'], [0, 8], [16, 8]),
    ...faceMap(['up', 'down'], [0, 0], [16, 16]),
  })] }],
  pane: Object.entries(paneParts).map(([name, shape]) => paneBone(name, shape)),
};

function geometryId(model) { return `geometry.${NAMESPACE}.switch_${model}`; }
const geometry = Object.entries(meshes).map(([model, bones]) => ({
  description: {
    identifier: geometryId(model),
    texture_width: model === 'skull' ? 64 : 16,
    texture_height: model === 'skull' ? 32 : 16,
    visible_bounds_width: 2, visible_bounds_height: 2, visible_bounds_offset: [0, 0.5, 0],
  },
  bones,
}));

function putParticle(name, components) {
  put(`resource_pack/particles/${name}.json`, {
    format_version: '1.10.0',
    particle_effect: {
      description: {
        identifier: `${NAMESPACE}:${name}`,
        basic_render_parameters: { material: 'particles_alpha', texture: 'textures/particle/particles' },
      },
      components: {
        'minecraft:emitter_rate_instant': { num_particles: 1 },
        'minecraft:emitter_lifetime_once': { active_time: 0.05 },
        ...components,
      },
    },
  });
}

const flameSprites = { torch: [0, 24], soul_torch: [16, 24], copper_torch: [32, 56] };
for (const [torch, uv] of Object.entries(flameSprites)) {
  const size = 'math.max(0.01, 0.12 - 0.07 * variable.particle_age)';
  putParticle(`${torch}_flame`, {
    'minecraft:particle_lifetime_expression': { max_lifetime: 'math.random(1.0, 1.4)' },
    'minecraft:particle_appearance_billboard': {
      size: [size, size], facing_camera_mode: 'lookat_xyz',
      uv: { texture_width: 128, texture_height: 128, uv, uv_size: [8, 8] },
    },
  });
}

putParticle('torch_smoke', {
  'minecraft:emitter_shape_point': { direction: [0, 1, 0] },
  'minecraft:particle_initial_speed': 0.5,
  'minecraft:particle_lifetime_expression': { max_lifetime: 'math.random(0.4, 1.0)' },
  'minecraft:particle_motion_dynamic': { linear_acceleration: [0, 0.3, 0] },
  'minecraft:particle_appearance_billboard': {
    size: [0.085, 0.085], facing_camera_mode: 'lookat_xyz',
    uv: {
      texture_width: 128, texture_height: 128,
      flipbook: {
        base_UV: [56, 0], size_UV: [8, 8], step_UV: [-8, 0],
        frames_per_second: 8, max_frame: 8, stretch_to_lifetime: true,
      },
    },
  },
  'minecraft:particle_appearance_lighting': {},
});

function panePermutations() {
  return Array.from({ length: 16 }, (_, mask) => {
    const connected = wallFaces.filter((_, index) => mask & (1 << index));
    const test = wallFaces.map((face) => `${connected.includes(face) ? '' : '!'}q.block_state('minecraft:connection_${face}')`);
    const [north, east, south, west] = wallFaces.map((face) => connected.includes(face));
    return {
      condition: test.join(' && '),
      components: {
        'minecraft:collision_box': [paneParts.center, ...connected.map((face) => paneParts[face])],
        'minecraft:selection_box': box(
          [west ? -8 : -1, 0, north ? -8 : -1],
          [2 + (west ? 7 : 0) + (east ? 7 : 0), 16, 2 + (north ? 7 : 0) + (south ? 7 : 0)],
        ),
      },
    };
  });
}

function definition(variant) {
  const { model, original, id, nameKey, light } = variant;
  const slab = model === 'slab';
  const pane = model === 'pane';
  const material = {
    texture: `${NAMESPACE}_${original}`,
    render_method: slab || model === 'skull' || model === 'rod' || model === 'torch' ? 'opaque' : 'alpha_test',
  };
  const materials = { '*': material };
  const geometryComponent = { identifier: geometryId(model) };
  if (pane) {
    materials.edge = { texture: `${NAMESPACE}_glass_edge`, render_method: 'alpha_test' };
    geometryComponent.bone_visibility = Object.fromEntries(wallFaces.map((face) => [face, `q.block_state('minecraft:connection_${face}')`]));
  }
  const traits = {
    'minecraft:placement_position': { enabled_states: slab ? [FACE_STATE, 'minecraft:vertical_half'] : [FACE_STATE] },
  };
  if (pane) traits['minecraft:connection'] = { enabled_states: ['minecraft:cardinal_connections'] };

  const permutations = wallFaces.flatMap((face) => {
    const { support, rotation } = FACES[face];
    const placed = `q.block_state('${FACE_STATE}') == '${face}'`;
    const states = [{
      condition: `${placed} && q.block_state('${ACTIVITY_STATE}')`,
      components: {
        'minecraft:redstone_producer': { power: 15, connected_faces: [support], strongly_powered_face: support, transform_relative: false },
        'minecraft:tick': { interval_range: [PULSE_TICKS, PULSE_TICKS], looping: true },
        [`${NAMESPACE}:switch_reset`]: {},
      },
    }];
    if (!pane && !slab && rotation) states.push({
      condition: placed,
      components: { 'minecraft:transformation': { rotation: [0, rotation, 0] } },
    });
    return states;
  });
  if (slab) permutations.push({
    condition: "q.block_state('minecraft:vertical_half') == 'top'",
    components: {
      'minecraft:transformation': { translation: [0, 0.5, 0] },
    },
  });
  if (pane) permutations.push(...panePermutations());

  const components = {
    'minecraft:display_name': nameKey,
    'minecraft:geometry': geometryComponent,
    'minecraft:material_instances': materials,
    'minecraft:placement_filter': { conditions: [{ allowed_faces: wallFaces }] },
    'minecraft:collision_box': slab ? selection.slab : false,
    'minecraft:selection_box': pane ? paneParts.center : selection[model],
    'minecraft:destructible_by_mining': { seconds_to_destroy: slab ? 1 : 0.1 },
    'minecraft:light_dampening': 0,
    'minecraft:redstone_producer': { power: 0 },
    'minecraft:loot': `loot_tables/blocks/${variant.name}.json`,
    [`${NAMESPACE}:switch`]: {},
  };
  if (light) components['minecraft:light_emission'] = light;
  if (model === 'torch') {
    components['minecraft:tick'] = { interval_range: [20, 20], looping: true };
    components[`${NAMESPACE}:torch_ambience`] = { flame: `${NAMESPACE}:${original}_flame` };
  }
  if (pane) components['minecraft:connection_rule'] = { accepts_connections_from: 'all' };

  return {
    format_version: '1.26.40',
    'minecraft:block': {
      description: { identifier: id, menu_category: { category: 'construction' }, states: { [ACTIVITY_STATE]: [false, true] }, traits },
      components,
      permutations,
    },
  };
}

for (const variant of SWITCHES) {
  put(`behavior_pack/blocks/${variant.name}.json`, definition(variant));
  put(`behavior_pack/recipes/${variant.name}.json`, {
    format_version: '1.21.30',
    'minecraft:recipe_shapeless': {
      description: { identifier: variant.id },
      tags: ['crafting_table'],
      ingredients: [{ item: variant.ingredient }, { item: 'minecraft:redstone' }],
      unlock: { context: 'AlwaysUnlocked' },
      result: { item: variant.id, count: 1 },
    },
  });
  put(`behavior_pack/loot_tables/blocks/${variant.name}.json`, {
    pools: [{ rolls: 1, entries: [{ type: 'item', name: variant.id, weight: 1 }] }],
  });
}

put('resource_pack/models/blocks/secret_switches.geo.json', {
  format_version: '1.21.0', 'minecraft:geometry': geometry,
});
put('resource_pack/textures/terrain_texture.json', {
  resource_pack_name: NAMESPACE, texture_name: 'atlas.terrain',
  texture_data: Object.fromEntries(Object.entries(textures).map(([name, path]) => [`${NAMESPACE}_${name}`, { textures: path }])),
});
const sounds = { torch: 'wood', skull: 'stone', rod: 'wood', coral: 'stone', lichen: 'glow_lichen', slab: 'wood', pane: 'glass' };
put('resource_pack/blocks.json', {
  format_version: '1.19.30',
  ...Object.fromEntries(SWITCHES.map(({ id, model }) => [id, { sound: sounds[model] }])),
});
put('resource_pack/local_lighting/local_lighting.json', {
  format_version: '1.21.120',
  'minecraft:local_light_settings': Object.fromEntries(
    SWITCHES.filter(({ lightColor }) => lightColor).map(({ id, lightColor }) => [
      id, { light_color: lightColor, light_type: 'point_light' },
    ]),
  ),
});

const marker = '## Generated by tools/generate-switches.js';
for (const [locale, language, suffix] of [['de_DE', 'de', 'Geheimschalter'], ['en_US', 'en', 'Secret Switch']]) {
  const file = `resource_pack/texts/${locale}.lang`;
  const base = readFileSync(output(file), 'utf8').split(marker)[0].trimEnd();
  const switchNames = SWITCHES.flatMap((variant) => [
    `${variant.nameKey}=${variant[language]} (${suffix})`,
    `${variant.originalKey}=${variant[language]}`,
  ]);
  put(file, `${base}\n\n${marker}\n${switchNames.join('\n')}\n`);
}

if (drift.length) {
  console.error(`Regenerate switch content with node tools/generate-switches.js:\n${drift.join('\n')}`);
  process.exitCode = 1;
}
