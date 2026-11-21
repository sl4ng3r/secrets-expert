import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  reconcileHelmet,
  SAVED_DISTANCE,
  STEALTH_HELMET,
} from '../behavior_pack/scripts/stealth-helmet.js';

function playerWithDistance(distance, savedDistance) {
  const state = new Map();
  if (savedDistance !== undefined) state.set(SAVED_DISTANCE, savedDistance);

  return {
    distance,
    state,
    writes: [],
    get nameplateRenderDistance() {
      return this.distance;
    },
    set nameplateRenderDistance(value) {
      this.writes.push(['distance', value]);
      this.distance = value;
    },
    getDynamicProperty(key) {
      return state.get(key);
    },
    setDynamicProperty(key, value) {
      this.writes.push(['property', value]);
      if (value === undefined) state.delete(key);
      else state.set(key, value);
    },
  };
}

test('a helmet in the inventory has no effect', () => {
  const player = playerWithDistance(64);
  player.inventory = [STEALTH_HELMET];
  reconcileHelmet(player, undefined);
  assert.deepEqual(player.writes, []);
});

test('equipping saves the original distance before hiding, without repeated writes', () => {
  const player = playerWithDistance(37.5);
  assert.equal(reconcileHelmet(player, STEALTH_HELMET), true);
  assert.equal(reconcileHelmet(player, STEALTH_HELMET), true);
  assert.deepEqual(player.writes, [['property', 37.5], ['distance', 0]]);
});

for (const replacement of [undefined, 'minecraft:leather_helmet']) {
  test(`restores the original distance with head slot ${replacement ?? 'empty'}`, () => {
    const player = playerWithDistance(37.5);
    reconcileHelmet(player, STEALTH_HELMET);
    assert.equal(reconcileHelmet(player, replacement), false);
    reconcileHelmet(player, replacement);
    assert.deepEqual(player.writes, [
      ['property', 37.5], ['distance', 0], ['distance', 37.5], ['property', undefined],
    ]);
    assert.equal(player.state.has(SAVED_DISTANCE), false);
  });
}

test('reapplies camouflage on a new player handle with persisted state', () => {
  const player = playerWithDistance(64, 19);
  reconcileHelmet(player, STEALTH_HELMET);
  assert.deepEqual(player.writes, [['distance', 0]]);
  reconcileHelmet(player, undefined);
  assert.equal(player.distance, 19);
});

test('restores a persisted custom distance after restart with the helmet removed', () => {
  const player = playerWithDistance(64, 21);
  reconcileHelmet(player, undefined);
  assert.deepEqual(player.writes, [['distance', 21], ['property', undefined]]);
});

test('preserves a nameplate that was already hidden before equipping', () => {
  const player = playerWithDistance(0);
  reconcileHelmet(player, STEALTH_HELMET);
  reconcileHelmet(player, undefined);
  assert.deepEqual(player.writes, [['property', 0], ['property', undefined]]);
  assert.equal(player.distance, 0);
});

test('retains the saved distance when an engine write fails and retries', () => {
  const player = playerWithDistance(0, 42);
  const descriptor = Object.getOwnPropertyDescriptor(player, 'nameplateRenderDistance');
  Object.defineProperty(player, 'nameplateRenderDistance', {
    ...descriptor,
    set() { throw new Error('player unloaded'); },
  });
  assert.throws(() => reconcileHelmet(player, undefined), /player unloaded/);
  assert.equal(player.state.get(SAVED_DISTANCE), 42);
  Object.defineProperty(player, 'nameplateRenderDistance', descriptor);
  reconcileHelmet(player, undefined);
  assert.equal(player.distance, 42);
  assert.equal(player.state.has(SAVED_DISTANCE), false);
});

test('leaves the nameplate alone if saving the original distance fails', () => {
  const player = playerWithDistance(32);
  player.setDynamicProperty = () => { throw new Error('player unloaded'); };
  assert.throws(() => reconcileHelmet(player, STEALTH_HELMET), /player unloaded/);
  assert.equal(player.distance, 32);
});
