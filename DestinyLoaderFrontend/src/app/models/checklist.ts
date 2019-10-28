/* tslint:disable:member-ordering */
import {ObjectiveTime, ObjectiveTimeSummed} from './objective-time';
import {Objective} from './objective';
import {Pursuit} from './pursuit';

export class Checklist {

  items: {
    Pursuits: {};
  };
  characters: Character[];
  times: { [id: string]: ObjectiveTimeSummed };
  currentTimes: ObjectiveTime[];
  vendors: {};
  catalysts: Catalyst[];
  triumphs: Triumph[];
  itemWithObjectives: { [id: string]: Item[] };
  tags: { [key: string]: string[] };

}

export class Item {
  itemInstanceId: string;
  itemName: string;
  item: {
    itemType: number;
    displayProperties: {
      name: string;
      icon: string;
      description: string;
    }
  };
  objective: {
    objectives: Objective[];
  };

}

export class Catalyst {
  inventoryItem: {
    itemName: string;
    itemInstanceId: string;
  };
  item: {
    displayProperties: {
      name: string;
      icon: string;
      description: string;
    };
  };
  description: string;
  state: CatalystState;
  objectives: Objective[];
}

export class Triumph {
  hash: string;
  item: {
    presentationInfo: {
      parentPresentationNodeHashes: []
    };
    displayProperties: {
      name: string;
      icon: string;
      description: string;
    };
  };
  state: number;
  objectives: Objective[];
  scoreValue: number;
  parentIcon: string;
}

export class Character {
  characterId: string;
  charNum: number;
  //noinspection JSUnusedGlobalSymbols
  baseCharacterLevel: number;
  //noinspection JSUnusedGlobalSymbols
  checklists: Object[];
  //noinspection JSUnusedGlobalSymbols
  classType: number;
  genderedClassNames: string;
  genderedRaceNames: string;
  //noinspection JSUnusedGlobalSymbols
  emblemBackgroundPath: string;
  dateLastPlayed: string;
  milestones: {
    instanceId: string;
    milestoneName: string;
    description: string;
    icon: string;
    rewards: {
      itemHash: number;
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
      displayProperties: {
        name: string;
        icon: string;
      };
      redeemed: boolean;
      earned: boolean;
      quantity: number;
    }[];
    objectives: {
      objectiveHash: string;
      completionValue: number;
      complete: boolean;
      progress: number;
      itemName: string;
    }[];
  }[];
  progressions: {
    instanceId: string;
    progressionName: string;
    description: string;
    icon: string;
    objectives: {
      objectiveHash: string;
      completionValue: number;
      complete: boolean;
      progress: number;
      itemName: string;
    }[];
  }[];

  light: number;
  pursuits: (Pursuit)[];
  triumphs: Triumph[];
}

export enum CatalystState {
  UNKNOWN, DONE, DROPPED, TO_BE_COMPLETED
}
