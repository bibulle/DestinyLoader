
export class Checklist {

  items: {
    Pursuits: {};
  };
  characters: Character[];


}

export class Character {
  characterId: string;
  //noinspection JSUnusedGlobalSymbols
  baseCharacterLevel: number;
  //noinspection JSUnusedGlobalSymbols
  checklists: Object[];
  //noinspection JSUnusedGlobalSymbols
  classType: number;
  //noinspection JSUnusedGlobalSymbols
  emblemBackgroundPath: string;
  dateLastPlayed: string;
  milestones: {
    milestoneName: string;
    description: string;
    icon: string;
    rewards: {
      definition: {
        items: {
          itemName: string;
          icon: string;
          quantity: number;
        }[];
        displayProperties: {
          name: string;
          icon: string;
        }
      };
      redeemed: boolean;
      earned: boolean;
    }[];
    objectives: {
      completionValue: number;
      complete: boolean;
      progress: number;
      itemName: string;
    }[];
  }[];
  light: number;
  pursuits: (Pursuit|Milestone)[];
}


export class Pursuit {
  //noinspection JSUnusedGlobalSymbols
  itemTypeDisplayName: string;
  name: string;
  //noinspection JSUnusedGlobalSymbols
  icon: string;
  rewards: Reward[];
  //noinspection JSUnusedGlobalSymbols
  description: string;
}
export class Milestone {
  itemTypeDisplayName: string;
  name: string;
  description: string;
  icon: string;
  expirationDate: string;
  rewards: Reward[];
  objectives: Objective[];
}

export class Reward {
  name: string;
  icon: string;
  quantity: number;
  identifier: string;
  identifierIcon: string;
  redeemed: boolean;
  earned: boolean;
}
export class Objective {
  completionValue: number;
  complete: boolean;
  progress: number;
  item: {
    progressDescription: string;
  };
}

