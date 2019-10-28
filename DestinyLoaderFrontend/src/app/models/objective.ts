import {ObjectiveTime} from './objective-time';

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

  static objectivesIsRunning(objective) {
    return objective.runningTimeObjective && !objective.runningTimeObjective.finished;
  }

}
