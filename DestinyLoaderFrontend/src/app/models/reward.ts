/* tslint:disable:member-ordering */
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
      case 73143230: // Pinnacle Gear
        return Reward.VALUE_PINNACLE_GEAR;
      // case 4039143015: // Powerful Gear
      case 326786556: // Powerful Gear
      case 964120289: // Powerful Gear
      case 3789021730: // Powerful Gear
      case 1478801436: // Powerful Gear
      case 305996677: // Powerful Gear
      case 2043403989: // Powerful Gear
      case 248695599: // Powerful Gear
      case 1514402550: // Powerful Gear
      case 783563440 : // Powerful Gear
      case 3114385605: // Powerful Gear (Tier 1)
        if (r.name.match(/(Pinnacle|de[\s]prestige)/i)) {
          return Reward.VALUE_PINNACLE_GEAR;
        } else if (r.name.match(/(Tier|Palier)[\s]2/i)) {
          return Reward.VALUE_POWER_GEAR_TIER2;
        } else {
          return Reward.VALUE_POWER_GEAR_TIER1;
        }
      case 2646629159: // Luminous Engram
      case 2127149322: // Legendary Gear
      case 3407672161: // Legendary Gear
      case 2169340581: // Ballistics Log
      case 1: // Black Armory Badge
      case 4072589658: // Augmented Weapon
      case 257827327: // Offering to the Oracle
      case 3682636565: // Etched Engram
      case 334865270: // Legendary Engram
      case 1772646107: // Rune légendaire
      case 476782113: // Best of Year One Engram
      case 591441816: // Nostalgic Engram
        return Reward.VALUE_LEGENDARY_GEAR;
      case 3853748946: // Enhancement Core
      case 2979281381: // Upgrade Module
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
      case 3586070587: // Firewall Data Fragment
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
      case 3325778512: // A Fine Memorial
      case 4227181568: // Exit Strategy
      case 847329160: // Edgewise
      case 3535742959: // Randy's Throwing Knife
      case 659922705: // Dreambane Cowl
      case 272413517: // Dreambane Helm
      case 1528483180: // Dreambane Hood
      case 3571441640: // Dreambane Grips
      case 925079356: // Dreambane Gauntlets
      case 682780965: // Dreambane Gloves
      case 883769696: // Dreambane Vest
      case 2568538788: // Dreambane Plate
      case 3692187003: // Dreambane Robes
      case 193805725: // Dreambane Cloak
      case 3312368889: // Dreambane Mark
      case 2048903186: // Dreambane Bond
      case 377813570: // Dreambane Strides
      case 310888006: // Dreambane Greaves
      case 1030110631: // Dreambane Boots
      case 1392223753: // Crucible Lazurite
      case 1392223752: // Crucible Vermillion
      case 94507878: // Burnished Blade
      case 1359616732: // Gambit Emerald
      case 1359616733: // Gambit Celadon
      case 769892737: // Living Vestige
      case 2058800852: // Vanguard Stratosphere
      case 2058800853: // Vanguard Angelos
      case 4042993010: // Timeless Vigil
      case 2663204025: // Subjunctive
      case 2314999489: // Imperative
      case 1167153950: // Adhortative
      case 2138599001: // Optative
      case 1645386487: // Tranquility
      case 2723909519: // Arc Logic
      case 3924212056: // Loud Lullaby
      case 4277547616: // Every Waking Moment
      case 3870811754: // Night Terror
      case 3690523502: // Love and Death
      case 2173837803: // Gambit Jadestone
      case 1736897076: // Team Player
      case 3603801350: // Crucible Prestige
      case 1736897075: // No Quarter
      case 838556752: // Python
      case 805677041: // Buzzard
      case 3850168899: // Martyr's Retribution
      case 3373970267: // Vanguard Nightbeam
      case 1736897078: // Tactician
      case 2697058914: // Komodo-4FR
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
      case 2211488305: // XP
      case 443031982: // Phantasmal Fragment
      case 443031983: // Phantasmal Core
      case 3428387954: // Vex Mind Components
      case 1196485999: // Chocolate Strange Coin
      case 1165306707: // Hymn of Desecration
      case 1192116287: // Major Fractaline Harvest
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
      case 3168101969: // Bright Dust
      case 3592324052: // Helium Filaments
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

  static VALUE_PINNACLE_GEAR = 104;
  static VALUE_POWER_GEAR_TIER2 = 102;
  static VALUE_POWER_GEAR_TIER1 = 100;
  static VALUE_LEGENDARY_GEAR = 50;
  static VALUE_IMPORTANT_CONSUMABLE = 10;
  static VALUE_SPECIAL_WEAPON = 6;
  static VALUE_UNKNOWN = 5;
  static VALUE_TRIUMPH = 4;
  static VALUE_TOKENS = 3;
  static VALUE_RESOURCE = 0;
}
