
export class Config {
  showOnlyPowerfulGear: boolean;
  language: string;
  selectedPursuits: string[] = [];
  visible = {
    rewards: {
      powerful_gear: true,
      // augmented_weapon: true,
      legendary_gear: true,
      special_weapon: true,
      important_consumable: true,
      tokens: true,
      resources: true
    },
    types: {
      milestone: true,
      quest_step: true,
      catalyst: true,
      vendor_bounty: true,
      owned_bounty: true,
      forge: true,
      pursuit: true
    }
  };
}
