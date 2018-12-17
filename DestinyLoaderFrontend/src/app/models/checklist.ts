
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
      objectiveHash: string;
      completionValue: number;
      complete: boolean;
      progress: number;
      itemName: string;
    }[];
  }[];
  light: number;
  pursuits: (Pursuit)[];
}


export class Pursuit {
  //noinspection JSUnusedGlobalSymbols
  itemTypeDisplayName: string;
  name: string;
  //noinspection JSUnusedGlobalSymbols
  description: string;
  //noinspection JSUnusedGlobalSymbols
  icon: string;
  expirationDate: string;
  rewards: Reward[];
  maxRewardLevel: number;
  objectives: Objective[];


}

export class Milestone {
  itemTypeDisplayName: string;
  name: string;
  description: string;
  icon: string;
  expirationDate: string;
  rewards: Reward[];
  maxRewardLevel: number;
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

  static getMaxReward (rewards: Reward[]): Reward {
    rewards.sort(Reward.compareRewards);
    if (rewards.length > 0) {
      return rewards[0];
    } else {
      return null;
    }
  }

  static compareRewards (r1: Reward, r2: Reward): number {
    let ret = Reward.getRewardValue(r2) - Reward.getRewardValue(r1);

    if ((ret === 0) && (r1 != null)) {
      if (r1.name > r2.name) {
        ret = 1;
      } else if (r1.name < r2.name) {
        ret = -1;
      }
    }

    return ret;
  }

  static getRewardValue (r: Reward): number {
    if (r == null) {
      return -2;
    }
    if (r.redeemed) {
      return -1;
    }

    switch (r.name) {
      case 'Powerful Gear':
        return Reward.VALUE_POWER_GEAR;
      case 'Legendary Gear':
        return Reward.VALUE_LEGENDARY_GEAR;
      case 'Enhancement Core':
      case 'Dark Fragment':
      case 'Transcendent Blessing':
        return Reward.VALUE_IMPORTANT_CONSUMABLE;
      case 'Crucible Token':
      case 'Clan XP':
      case 'Infamy Rank Points':
      case 'Vanguard Tactician Token':
      case 'Nessus Rewards':
        return 3;
      case 'Legendary Shards':
        return 1;
      case 'Baryon Bough':
      case 'Alkane Dust':
      case 'Dusklight Shard':
      case 'Bright Dust':
      case 'Phaseglass Needle':
      case 'Microphasic Datalattice':
      case 'Glimmer':
        return 0;
      default:
        // console.log(r.name);
        return 5;
    }
  }

// tslint:disable-next-line:member-ordering
  static VALUE_POWER_GEAR = 100;
// tslint:disable-next-line:member-ordering
  static VALUE_LEGENDARY_GEAR = 50;
// tslint:disable-next-line:member-ordering
  static VALUE_IMPORTANT_CONSUMABLE = 10;
}
export class Objective {
  objectiveHash: string;
  completionValue: number;
  complete: boolean;
  progress: number;
  item: {
    progressDescription: string;
  };
  timeTillFinished: number;

  static getMaxTimeTillFinished (objectives: Objective[]): number {

    let result = 0;
    objectives.forEach(o => {
      if (result < o.timeTillFinished) {
        result = o.timeTillFinished;
      }
    });
    return result;
  }

}


