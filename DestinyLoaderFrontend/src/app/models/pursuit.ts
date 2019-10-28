/* tslint:disable:member-ordering */
import {Reward} from './reward';
import {Objective} from './objective';

export class Pursuit {
  itemInstanceId: string;
  pursuitNum: number;
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
  tags: string[];
  questlineItemHash: string = null;


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

