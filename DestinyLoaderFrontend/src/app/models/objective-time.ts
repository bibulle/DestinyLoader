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
