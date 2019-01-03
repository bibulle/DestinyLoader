export class ObjectiveTime {

  _id: string;

  bungieNetUser: string;
  characterId: string;
  pursuitId: string;
  objectiveId: string;
  finished: boolean;

  timeStart: Date;
  timeEnd: Date;

  lastVerified: Date;

  countStart: number;
  countEnd: number;
  countFinished: number;

  /**
   * Constructor
   * @param option (the future object content (or timeDelta to calculate timeEnd)
   */
  constructor(option) {


    this.bungieNetUser = option['bungieNetUser'] || 'HardCoded';
    this.characterId = option['characterId'] || 'HardCoded';
    this.pursuitId = option['pursuitId'] || 'HardCoded';
    this.objectiveId = option['objectiveId'] || 'Unknown';
    this.finished = option['finished'] || false;

    if (option['timeStart']) {
      this.timeStart = new Date(option['timeStart']);
    } else {
      this.timeStart = new Date();
    }

    this.lastVerified = option['lastVerified'];

    this.countStart = option['countStart'] || 0;
    this.countEnd = option['countEnd'] || 0;
    this.countFinished = option['countFinished'] || 0;


    if (option['timeEnd']) {
      this.timeEnd = new Date(option['timeEnd']);
    } else if (option['timeDelta']) {
      this.timeEnd = new Date(this.timeStart.getTime()+option['timeDelta']);
    }



    this._id = this.bungieNetUser + this.objectiveId + this.timeStart.getTime();

  }

  public static getSum (objectiveTime: ObjectiveTime, previousTimeSummed: ObjectiveTimeSummed) {

    // calculate for this
    let ret:ObjectiveTimeSummed = {
      objectiveId: objectiveTime.objectiveId,
      time: Number.MAX_SAFE_INTEGER,
      nbProgress: 0
    } ;

    if (objectiveTime.countEnd != objectiveTime.countStart) {
      ret.nbProgress = Math.abs(objectiveTime.countEnd - objectiveTime.countStart);
      ret.time = Math.abs(objectiveTime.timeEnd.getTime() - objectiveTime.timeStart.getTime()) / ret.nbProgress;
    }

    // sum it if needed
    if (previousTimeSummed && (previousTimeSummed.nbProgress != 0)) {
      if (ret.nbProgress == 0) {
        ret = previousTimeSummed;
      } else {
        ret.time = ((ret.time * ret.nbProgress) + (previousTimeSummed.time * previousTimeSummed.nbProgress)) / (ret.nbProgress + previousTimeSummed.nbProgress);
        ret.nbProgress = ret.nbProgress + previousTimeSummed.nbProgress;
      }
    }

    return ret;


  }
}

export class ObjectiveTimeSummed {

  objectiveId: string;

  time: number; // millisecond for one progress

  nbProgress: number; // sum of all progress used to calculate this

}

//let t1: ObjectiveTime = new ObjectiveTime({});
//
//console.log(t1);
//let s = undefined
//s = t1.getSum(s);
//console.log(s);
//
//t1.finished = true;
//t1.timeEnd = new Date(t1.timeStart.getTime() + 10 * 60 * 1000);
//
//s = t1.getSum(s);
//console.log(s);
//s = t1.getSum(s);
//console.log(s);
//
//t1.timeEnd = new Date(t1.timeStart.getTime() + 20 * 60 * 1000);
//s = t1.getSum(s);
//console.log(s);
//
//t1 = new ObjectiveTime({});
//s = t1.getSum(s);
//console.log(s);
