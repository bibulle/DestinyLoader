export class Checklist {

  items: {
    Pursuits: {};
  };
  characters: Character[];
  times: { [id: string]: ObjectiveTimeSummed };
  currentTimes: ObjectiveTime[];
  vendors: {

  };


}

export class Character {
  characterId: string;
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
  light: number;
  pursuits: (Pursuit)[];
}


export class Pursuit {
  itemInstanceId: string;
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
  vendorName: string;
  saleDescription: string;
}

export class Reward {
  name: string;
  icon: string;
  quantity: number;
  identifier: string;
  identifierIcon: string;
  redeemed: boolean;
  earned: boolean;
  objectivesSize: number;
  itemHash: number;

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
    if ((r.earned === false) && (r.objectivesSize === 0)) {
      return -1;
    }
    if (r.redeemed) {
      return -1;
    }

    //noinspection SpellCheckingInspection
    switch (r.itemHash) {
      case 4039143015: // Powerful Gear
      case 326786556: // Powerful Gear
        return Reward.VALUE_POWER_GEAR;
      case 2646629159: // Luminous Engram
      case 2127149322: // Legendary Gear
      case 1: // Black Armory Badge
      case 4072589658: // Augmented Weapon
      case 257827327: // Offering to the Oracle
      case 3682636565: // Etched Engram
        return Reward.VALUE_LEGENDARY_GEAR;
      case 3853748946: // Enhancement Core
      case 1633854071: // Dark Fragment
      case 3255036626: // Transcendent Blessing
      case 214896340: // Black Armory Badge
        return Reward.VALUE_IMPORTANT_CONSUMABLE;
      case 580961571: // Loaded Question
      case 792755504: // Nightshade
      case 324382200: // Breakneck
        return 5;
      case 3782248531: // Modulus Report
      case 183980811: // Crucible Token
      case 1873857625: // Iron Banner Token
      case 304443327: // Clan XP
      case 372496383: // Infamy Rank Points
      case 3899548068: // Vanguard Tactician Token
      case 1: // Nessus Rewards
      case 1: // Titan Rewards
      case 1317670974: // EDZ Rewards
      case 2169340581: // Ballistics Log
      case 2109561326: // Eververse Bounty Note
        return 3;
      case 1022552290: // Legendary Shards
        return 1;
      case 592227263: // Baryon Bough
      case 2014411539: // Alkane Dust
      case 950899352: // Dusklight Shard
      case 31293053: // Seraphide
      case 2817410917: // Bright Dust
      case 1305274547: // Phaseglass Needle
      case 3487922223: // Microphasic Datalattice
      case 353785467: // Prismatic Facet
      case 3085039018: // Glimmer
      case 3159615086: // Glimmer
      case 49145143: // Simulation Seed
        return 0;
      default:
        console.log('reward "' + r.itemHash + '" not found (' + r.name + ')');
        // console.log(r);
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
  runningTimeObjective?: ObjectiveTime;

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

export class ObjectiveTime {
  characterId: string;
  pursuitId: string;
  finished: boolean;
  objectiveId: string;
  timeStart: Date;
  timeRunning: number;
}

export class ObjectiveTimeSummed {
  //noinspection JSUnusedGlobalSymbols
  objectiveId: string;

  time: number; // millisecond for one progress

  //noinspection JSUnusedGlobalSymbols
  nbProgress: number; // sum of all progress used to calculate this

}


