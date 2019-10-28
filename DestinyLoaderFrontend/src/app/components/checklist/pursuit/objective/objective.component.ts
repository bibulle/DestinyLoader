import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {Objective} from '../../../../models/objective';
import {UtilService} from '../../../../services/util.service';

@Component({
  selector: 'app-objective',
  templateUrl: './objective.component.html',
  styleUrls: ['./objective.component.scss']
})
export class ObjectiveComponent implements OnInit, OnChanges {

  @Input()
  objective: Objective;

  @Input()
  searchText: string;
  @Input()
  searchRegExp: RegExp;

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

  progressDescriptionHighlighted: string;


  constructor() {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.hasOwnProperty('objective') || changes.hasOwnProperty('searchText')) {
      this.progressDescriptionHighlighted = UtilService.highlight(this.objective.item.progressDescription, this.searchText, this.searchRegExp);
    }
    // console.log(changes);
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
