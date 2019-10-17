import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Objective} from '../../../../models/checklist';

@Component({
  selector: 'app-objective',
  templateUrl: './objective.component.html',
  styleUrls: ['./objective.component.scss']
})
export class ObjectiveComponent implements OnInit {

  @Input()
  objective: Objective;

  @Input()
  highlight: (string) => string;

  @Input()
  isVendor: boolean;
  @Input()
  characterId: string;
  @Input()
  genderedClassNames: string;

  @Output()
  launchObjectiveTimeEmitter: EventEmitter<Objective> = new EventEmitter();
  @Output()
  stopObjectiveTimeEmitter: EventEmitter<Objective> = new EventEmitter();


  constructor() {
  }

  ngOnInit() {
  }

  getObjectiveProgress(objective) {
    return 100 * Math.min(1.0, objective.progress / objective.completionValue);
  }

  objectivesIsRunning(objective) {
    return Objective.objectivesIsRunning(objective);
  }

  launchObjectiveTime(objective: Objective, event: MouseEvent) {
    event.stopPropagation();
    this.launchObjectiveTimeEmitter.emit(objective);
  }
  stopObjectiveTime(objective: Objective, event: MouseEvent) {
    event.stopPropagation();
    this.stopObjectiveTimeEmitter.emit(objective);
  }
}
