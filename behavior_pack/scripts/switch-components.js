import { EntityComponentTypes, EquipmentSlot, system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { NAMESPACE } from './switch-catalog.js';
import { guideBody } from './switch-guide.js';
import { activateSwitch, emitTorchParticles, preparePlacement, stopPulse } from './switch-logic.js';

const openGuides = new Set();

async function showGuide(player) {
  if (!player.isValid || openGuides.has(player.id)) return;
  openGuides.add(player.id);
  try {
    await new ActionFormData()
      .title({ translate: 'item.secrets_expert:switch_guide.name' })
      .body(guideBody())
      .button({ translate: 'secrets_expert.guide.close' })
      .show(player);
  } catch (error) {
    console.warn(`[Secrets Expert] Could not open the switch handbook. ${error}`);
  } finally {
    openGuides.delete(player.id);
  }
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry, itemComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent(`${NAMESPACE}:switch`, {
    beforeOnPlayerPlace: preparePlacement,
    onPlayerInteract({ block, player }) {
      const equipment = player?.getComponent(EntityComponentTypes.Equippable);
      if (equipment) activateSwitch(block, !equipment.getEquipment(EquipmentSlot.Mainhand));
    },
  });
  blockComponentRegistry.registerCustomComponent(`${NAMESPACE}:switch_reset`, {
    onTick({ block }) { stopPulse(block); },
  });
  blockComponentRegistry.registerCustomComponent(`${NAMESPACE}:torch_ambience`, {
    onTick({ block }, { params }) { emitTorchParticles(block, params.flame); },
  });
  itemComponentRegistry.registerCustomComponent(`${NAMESPACE}:read_switch_guide`, {
    onUse({ source }) { void showGuide(source); },
  });
});
