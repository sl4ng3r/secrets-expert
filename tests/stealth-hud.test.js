import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createStealthHud, STEALTH_OFF, STEALTH_ON } from '../behavior_pack/scripts/stealth-hud.js';

test('the status is personal, refreshed while active, and cleared when taking off the helmet', () => {
  const hud = createStealthHud();
  const messages = [];
  const alice = (message) => messages.push(['alice', message]);
  const bob = (message) => messages.push(['bob', message]);

  hud.update('alice', 1, false, alice);
  hud.update('alice', 2, true, alice);
  hud.update('bob', 2, false, bob);
  hud.update('alice', 3, true, alice);
  hud.update('alice', 22, true, alice);
  hud.update('alice', 23, false, alice);
  hud.update('alice', 24, false, alice);

  assert.deepEqual(messages, [['alice', STEALTH_ON], ['alice', STEALTH_ON], ['alice', STEALTH_OFF]]);
});

test('a returning player gets a fresh indicator immediately', () => {
  const hud = createStealthHud();
  const messages = [];
  const send = (message) => messages.push(message);
  hud.update('alice', 2, true, send);
  hud.remove('alice');
  hud.update('alice', 3, true, send);
  assert.deepEqual(messages, [STEALTH_ON, STEALTH_ON]);
});

test('the HUD redirects only the private signals and places the helmet icon on the right', () => {
  const ui = JSON.parse(readFileSync(new URL('../resource_pack/ui/hud_screen.json', import.meta.url), 'utf8'));
  assert.equal(ui.secrets_expert_stealth_status.anchor_to, 'top_right');
  assert.equal(ui.secrets_expert_stealth_status.texture, 'textures/items/stealth_helmet');
  assert.equal(ui.secrets_expert_stealth_status.visible, `($actionbar_text = '${STEALTH_ON}')`);
  assert.equal(ui.hud_actionbar_text.visible, `(not (($actionbar_text = '${STEALTH_ON}') or ($actionbar_text = '${STEALTH_OFF}')))`);
});
