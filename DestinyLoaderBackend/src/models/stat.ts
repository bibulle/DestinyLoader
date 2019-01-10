export class Stat {

  id: string;
  userId: string;
  name: string;
  class: string;

  date: Date;

  light: number;
  triumphScore: number;
  minutesPlayedTotal: number;
  nightfallEntered: number;
  nightfallCleared: number;
  heroicNightfallEntered: number;
  heroicNightfallCleared: number;
  raidEntered: number;
  raidCleared: number;
  strikeEntered: number;
  strikeCleared: number;
  allPvPEntered: number;
  allPvPWon: number;
  trialsOfTheNineEntered: number;
  trialsOfTheNineWon: number;
  allPvPKills: number;
  allPvPAssists: number;
  allPvPDeaths: number;


}

export class StatSummed {

  id: string;
  userId: string;
  name: string;
  class: string;

  date: Date;

  isOnLine: boolean;

  lightMin: number;
  lightMax: number;

  triumphScoreMin: number;
  triumphScore:number;

  minutesPlayedTotal:number;
  nightfallEntered:number;
  nightfallCleared:number;
  heroicNightfallEntered:number;
  heroicNightfallCleared:number;
  raidEntered:number;
  raidCleared:number;
  strikeEntered:number;
  strikeCleared:number;
  allPvPEntered:number;
  allPvPWon:number;
  trialsOfTheNineEntered:number;
  trialsOfTheNineWon:number;
  allPvPKillsDeathsAssistsRatio:number;

}