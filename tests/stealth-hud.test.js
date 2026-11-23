import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createStealthHud } from '../behavior_pack/scripts/stealth-hud.js';
import { STEALTH_HELMET } from '../behavior_pack/scripts/stealth-helmet.js';

function viewer(id) {
  const messages = [];
  return { id, messages, onScreenDisplay: { setActionBar: (message) => messages.push(message) } };
}

test('only a worn Tarnhelm starts the status and a helmet swap clears it once', () => {
  const hud = createStealthHud();
  const wearer = viewer('wearer');
  const observer = viewer('observer');
  hud.update(wearer, 0, undefined);
  hud.update(wearer, 1, 'minecraft:diamond_helmet');
  assert.deepEqual(wearer.messages, []);

  hud.update(wearer, 2, STEALTH_HELMET);
  hud.update(observer, 2, undefined);
  hud.update(wearer, 3, 'minecraft:diamond_helmet');
  hud.update(wearer, 4, undefined);
  assert.equal(wearer.messages.length, 2);
  assert.deepEqual(observer.messages, []);
  assert.notDeepEqual(wearer.messages[0], wearer.messages[1]);
});

test('status refreshes every ten ticks and starts immediately on rejoin', () => {
  const hud = createStealthHud();
  const player = viewer('player');
  hud.update(player, 10, STEALTH_HELMET);
  hud.update(player, 19, STEALTH_HELMET);
  assert.equal(player.messages.length, 1);
  hud.update(player, 20, STEALTH_HELMET);
  assert.deepEqual(player.messages, [player.messages[0], player.messages[0]]);

  hud.remove(player.id);
  const rejoined = viewer(player.id);
  hud.update(rejoined, 21, STEALTH_HELMET);
  assert.deepEqual(rejoined.messages, [player.messages[0]]);
});

test('server signals contain only invisible characters and match the HUD predicates', () => {
  const hud = createStealthHud();
  const player = viewer('player');
  hud.update(player, 1, STEALTH_HELMET);
  hud.update(player, 2, undefined);
  const [on, off] = player.messages.map((message) => {
    assert.equal(message.rawtext.length, 1);
    const { text } = message.rawtext[0];
    assert.match(text, /^\p{Cf}+$/u);
    return text;
  });
  const resource = JSON.parse(readFileSync(new URL('../resource_pack/ui/hud_screen.json', import.meta.url), 'utf8'));
  const icon = resource.secrets_expert_stealth_status;
  assert.equal(icon.$secrets_expert_text, '$actionbar_text');
  assert.equal(icon.visible, `($secrets_expert_text = '${on}')`);
  assert.deepEqual([icon.anchor_from, icon.anchor_to], ['top_right', 'top_right']);
  assert.equal(icon.texture, 'textures/ui/stealth_status');
  assert.ok(on.startsWith(off));
  const standard = resource.hud_actionbar_text;
  assert.equal(standard.$secrets_expert_text, '$actionbar_text');
  assert.equal(standard.visible, `(($secrets_expert_text - '${off}') = $secrets_expert_text)`);
  assert.equal(resource.secrets_expert_stealth_factory.factory.control_ids.hud_actionbar_text, 'secrets_expert_stealth_status@hud.secrets_expert_stealth_status');
  assert.ok(resource.root_panel.modifications.some(({ array_name, value }) =>
    array_name === 'controls' && 'secrets_expert_stealth_factory@hud.secrets_expert_stealth_factory' in value));
});
