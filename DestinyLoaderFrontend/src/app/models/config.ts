
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
      triumphs: false,
      tokens: true,
      resources: true
    },
    types: {
      milestone: true,
      quest_step: true,
      catalyst: true,
      vendor_bounty: true,
      owned_bounty: true,
      // forge: true,
      // prime_gambit: true,
      pursuit: true,
      triumph: false,
      triumphRedeemable: false,
      progression: false,
      item: true
    }
  };
  selectedTags: string[] = [];
}

export class Search {
  shown = false;
  searchText = '';
//  action: SearchAction = SearchAction.FIRST;
  foundCount = 0;
  foundCurrent = 0;
  style = SearchStyle.SEARCH;
  tagsShown = false;
}

export enum SearchAction {
  FIRST, NEXT
}

export enum SearchStyle {
  SEARCH, FILTER
}
