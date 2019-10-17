import {Component, EventEmitter, Input, NgModule, OnInit, Output} from '@angular/core';
import {Objective, ObjectiveTime, Pursuit} from '../../../models/checklist';
import {HeaderService} from '../../../services/header.service';
import {Subscription} from 'rxjs';
import {ChecklistService} from '../../../services/checklist.service';
import {UtilService} from '../../../services/util.service';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {MatCardModule, MatCheckboxModule, MatIconModule, MatTabsModule} from '@angular/material';
import {TimeExpirationModule} from '../../../pipes/time-expiration.pipe';
import {RewardComponent} from './reward/reward.component';
import {ObjectiveComponent} from './objective/objective.component';

@Component({
  selector: 'app-pursuit',
  templateUrl: './pursuit.component.html',
  styleUrls: ['./pursuit.component.scss']
})
export class PursuitComponent implements OnInit {


  @Input()
  pursuit: Pursuit;

  @Input()
  characterId: string;
  @Input()
  genderedClassNames: string;
  @Input()
  charNum: number;
  @Input()
  swipeRunning: number;

  // @Input()
  // pursuitHasRunningObjectives: boolean;
  @Input()
  pursuitShouldBeDisplayed: boolean;
  @Input()
  pursuitIsSelected: boolean;

  @Input()
  searchedId: string;
  searchText: string;
  search: RegExp;
  found = false;
  private _currentSearchSubscription: Subscription;
  @Output()
  pursuitMatchSearch: EventEmitter<any> = new EventEmitter();

  @Output()
  objectiveTimeChange: EventEmitter<ObjectiveTime> = new EventEmitter();

  // @Input()
  // highlight: (string: string, charNum: number, pursuitNum: number) => string;

  // @Input()
  // stopObjectiveTime: (objective: Objective, characterId: string, itemInstanceId: string, $event: MouseEvent) => void;
  // @Input()
  // launchObjectiveTime: (objective: Objective, characterId: string, genderedClassNames: string, itemInstanceId: string, pursuitName: string, $event: MouseEvent) => void;

  @Output()
  toggleSelectedPursuit = new EventEmitter();


  constructor(private _checklistService: ChecklistService,
              private _headerService: HeaderService) {
  }

  ngOnInit() {
    this._currentSearchSubscription = this._headerService.searchObservable().subscribe(
      search => {
        if (this.searchText !== search.searchText) {
          this.found = false;
          this.searchText = search.searchText;
          this.search = new RegExp(this.searchText.replace(/ /, '([  ]|&nbsp;)'), 'gi');
        }

      }
    );

    console.log(this.swipeRunning);
    console.log(this.charNum);
  }

  highlight(string): string {
    if (!this.searchText) {
      return string;
    }
    // do the highlighting
    return string.replace(this.search, (match: string) => {
      if (!this.found) {
        this.found = true;
        this.pursuitMatchSearch.emit({charNum: this.charNum, pursuitNum: this.pursuit.pursuitNum});
      }
      return '<span class="highlight-text">' + match + '</span>';
    });
  }

  pursuitHasRunningObjectives() {
    let ret = false;
    this.pursuit.objectives.forEach((obj) => {
      if (Objective.objectivesIsRunning(obj)) {
        ret = true;
      }
    });

    return ret;
  }

  stopObjectiveTime(objective: Objective) {
    console.log('stopObjectiveTime');

    if (this.swipeRunning === -1) {

      this._checklistService.stopObjective(objective, this.characterId, this.pursuit.itemInstanceId)
        .then(obj => {

          if (obj.runningTimeObjective) {
            obj.runningTimeObjective.timeStart = new Date(obj.runningTimeObjective.timeStart);
          }
          UtilService.updateObject(obj, objective);
        });
    }
  }

  launchObjectiveTime(objective: Objective) {
    console.log('launchObjectiveTime');

    console.log(this);

    if (this.swipeRunning === -1) {
      console.log('2');

      this._checklistService.startObjective(objective, this.characterId, this.genderedClassNames, this.pursuit.itemInstanceId, this.pursuit.name)
        .then(obj => {
          console.log(obj);
          if (obj.runningTimeObjective) {
            // console.log(obj);
            obj.runningTimeObjective.timeStart = new Date(obj.runningTimeObjective.timeStart);
            obj.runningTimeObjective.timeRunning = (new Date().getTime() - obj.runningTimeObjective.timeStart.getTime());
            // console.log(obj);
          }

          UtilService.updateObject(obj, objective);
          this.objectiveTimeChange.emit(objective.runningTimeObjective);
        });
    }
  }





}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatTabsModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    TimeExpirationModule
  ],
  declarations: [
    PursuitComponent,
    RewardComponent,
    ObjectiveComponent
  ],
  providers: [],
  exports: [
    PursuitComponent
  ]
})
export class PursuitModule {
}
