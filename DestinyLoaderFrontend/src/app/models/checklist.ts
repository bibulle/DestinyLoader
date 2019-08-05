/* tslint:disable:member-ordering */
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
  state: catalystState;
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


export class Pursuit {
  itemInstanceId: string;
  //noinspection JSUnusedGlobalSymbols
  itemType: number;
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
  type: PursuitType;

  static ITEM_TYPE_ARMOR = 2;
  static ITEM_TYPE_WEAPON = 3;

  static ITEM_TYPE_CONSUMABLE = 9;
  static ITEM_TYPE_QUEST_STEP = 12;
  static ITEM_TYPE_QUEST_STEP_COMPLETE = 13; // ?
  static ITEM_TYPE_QUEST_STEP_DUMMY = 20; // ?
  static ITEM_TYPE_BOUNTY = 26;

  static ITEM_TYPE_MILESTONE = -10;
  static ITEM_TYPE_VENDOR = -11;
  static ITEM_TYPE_CATALYST = -12;
  static ITEM_TYPE_TRIUMPH = -13;
  static ITEM_TYPE_TRIUMPH_REDEEMABLE = -14;
  static ITEM_TYPE_PROGRESSION = -15;

}

// export class PursuitType {
//  static milestone = 0;
//  static sale = 1;
//  static pursuit = 2;
// }

export enum PursuitType {
  MILESTONE, SALE, PURSUIT, CATALYST, TRIUMPH, TRIUMPH_REDEEMABLE, PROGRESSION, ITEM
}

export enum catalystState {
  UNKNOWN, DONE, DROPPED, TO_BE_COMPLETED
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

  static getMaxReward(rewards: Reward[]): Reward {
    rewards.sort(Reward.compareRewards);
    if (rewards.length > 0) {
      return rewards[0];
    } else {
      return null;
    }
  }

  static compareRewards(r1: Reward, r2: Reward): number {
    return Reward.getRewardValue(r2) - Reward.getRewardValue(r1);
  }

  static notFoundRewards = {};

  static getRewardValue(r: Reward): number {
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
      case 964120289: // Powerful Gear
      case 3789021730: // Powerful Gear
      case 1478801436: // Powerful Gear
      case 305996677: // Powerful Gear
      case 2043403989: // Powerful Gear
      case 248695599: // Powerful Gear
      case 1514402550: // Powerful Gear
      case 783563440 : // Powerful Gear
        return Reward.VALUE_POWER_GEAR;
      case 2646629159: // Luminous Engram
      case 2127149322: // Legendary Gear
      case 2169340581: // Ballistics Log
      case 1: // Black Armory Badge
      case 4072589658: // Augmented Weapon
      case 257827327: // Offering to the Oracle
      case 3682636565: // Etched Engram
      case 334865270: // Legendary Engram
      case 1772646107: // Rune légendaire
      case 476782113: // Best of Year One Engram
        return Reward.VALUE_LEGENDARY_GEAR;
      case 3853748946: // Enhancement Core
      case 1633854071: // Dark Fragment
      case 3255036626: // Transcendent Blessing
      case 214896340: // Black Armory Badge
      case 1691570586: // Invader Synth
      case 3948022968: // Collector Synth
      case 3552598030: // Sentry Synth
      case 889896758: // Reaper Synth
      case 596773932: // Synthesizer Upgrade
      case 1355700046: // Invader Head Upgrade
      case 1045201464: // Sentry Head Upgrade
      case 3007303932: // Reaper Head
      case 4041437604: // Collector Head
      case 3818379434: // Powerful Revelry Head Engram
      case 514936467: // Powerful Revelry Chest Engram
      case 323881355: // Powerful Revelry Leg Engram
      case 2501601653: // Powerful Revelry Arms Engram
      case 1508024268: // Powerful Revelry Class Engram
      case 2823823727: // Bourse d'Impériaux minuscule
        return Reward.VALUE_IMPORTANT_CONSUMABLE;
      case 580961571: // Loaded Question
      case 792755504: // Nightshade
      case 324382200: // Breakneck
      case 3354242550: // The recluse
      case 1600633250: // 21% Delirium
      case 46155327: // Who Are You?
      case 3907337522: // Oxygen SR3
      case 578459533: // Wendigo GL3
      case 1584643826: // Chut
      case 654608616: // Revoker
      case 1970295559: // Murmuration (it's a ship)
      case 2199703228 : // Synestesia (Borealis ornement)
        return Reward.VALUE_SPECIAL_WEAPON;
      case 3782248531: // Modulus Report
      case 183980811: // Crucible Token
      case 1873857625: // Iron Banner Token
      case 304443327: // Clan XP
      case 372496383: // Infamy Rank Points
      case 1808687944: // Valor Rank Points
      case 3899548068: // Vanguard Tactician Token
      case 3196288028: // Boon of the Crucible
      case 3922324861: // Nessus Rewards
      case 2367373121: // Io Rewards
      case 3696608133: // Titan Rewards
      case 1317670974: // EDZ Rewards
      case 2109561326: // Eververse Bounty Note
      case 3792590697: // Confectionery Heart
      case 1629549128: // Random Armor Mod
      case 2654582465: // Random Weapon Mod
      case 4046539562: // Mod Components
      case 659535164: // Boon of Opulence
      case 1605352950: // Solstice Key Fragment
        return Reward.VALUE_TOKENS;
      case Reward.TRIUMPH_POINT_PSEUDO_HASH: // Triumph points
        return Reward.VALUE_TRIUMPH;
      case 3272358192: // Reveler's Essence
      case 1022552290: // Legendary Shards
      case 592227263: // Baryon Bough
      case 2014411539: // Alkane Dust
      case 950899352: // Dusklight Shard
      case 31293053: // Seraphide
      case 2817410917: // Bright Dust
      case 1305274547: // Phaseglass Needle
      case 3487922223: // Microphasic Datalattice
      case 1177810185: // Etheric Spiral
      case 353785467: // Prismatic Facet
      case 3085039018: // Glimmer
      case 3159615086: // Glimmer
      case 49145143: // Simulation Seed
      case 1498824035: // Shotgun (Power 640)
      case 3946022997: // Pulse Rifle (Power 640)
      case 2462658602: // Rocket Launcher (Power 640)
      case 562103581: // Helmet (Power 640)
      case 1202043098: // Gauntlets (Power 640)
      case 1244752982: // Chest Armor (Power 640)
      case 3896846872: // Leg Armor (Power 640)
      case 2515448385: // Class Item (Power 640)
      case 2961190721: // A Gift from Eververse
      case 374658385: // Memory of Aru'un
      case 374658384: // Memory of B'ael
      case 374658387: // Memory of Gra'ask
      case 374658386: // Memory of M'orn
      case 374658397: // Memory of Ta'aurc
        return Reward.VALUE_RESOURCE;
      default:
        if (!Reward.notFoundRewards[r.itemHash]) {
          console.log('reward "' + r.itemHash + '" not found (' + r.name + ')');
          console.log(r);
          Reward.notFoundRewards[r.itemHash] = r;
        }
        return Reward.VALUE_UNKNOWN;
    }
  }

  static TRIUMPH_POINT_PSEUDO_HASH = -999999;

  static VALUE_POWER_GEAR = 100;
  static VALUE_LEGENDARY_GEAR = 50;
  static VALUE_IMPORTANT_CONSUMABLE = 10;
  static VALUE_SPECIAL_WEAPON = 6;
  static VALUE_UNKNOWN = 5;
  static VALUE_TRIUMPH = 4;
  static VALUE_TOKENS = 3;
  static VALUE_RESOURCE = 0;
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

  static getMaxTimeTillFinished(objectives: Objective[]): number {

    let result = 0;
    objectives.forEach(o => {
      if (result < o.timeTillFinished) {
        result = o.timeTillFinished;
      }
    });
    return result;
  }

  static getPercentageTillFinished(objectives: Objective[]): number {

    let result = 0;
    objectives.forEach(o => {
      result += Math.min(o.progress, Math.max(1, o.completionValue)) / Math.max(1, o.completionValue);
    });
    result = result / Math.max(1, objectives.length);

    return result;
  }

}

export class ObjectiveTime {
  bungieNetUser: string;
  bungieUserName: string;
  characterId: string;
  characterName: string;
  objectiveId: number;
  objectiveProgressDescription: string;
  pursuitId: string;
  pursuitName: string;
  finished: boolean;
  timeStart: Date;
  timeEnd: Date;
  timeRunning: number;
  countStart: number;
  countEnd: number;
  countFinished: number;
  lastVerified: Date;

}

export class ObjectiveTimeSummed {
  //noinspection JSUnusedGlobalSymbols
  objectiveId: string;

  time: number; // millisecond for one progress

  //noinspection JSUnusedGlobalSymbols
  nbProgress: number; // sum of all progress used to calculate this

}


