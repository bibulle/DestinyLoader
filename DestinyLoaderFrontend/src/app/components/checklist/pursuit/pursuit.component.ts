/* tslint:disable:member-ordering */
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, NgModule, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {HeaderService} from '../../../services/header.service';
import {Subscription} from 'rxjs';
import {ChecklistService} from '../../../services/checklist.service';
import {UtilService} from '../../../services/util.service';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {MatCardModule, MatCheckboxModule, MatChipsModule, MatIconModule, MatTabsModule} from '@angular/material';
import {TimeExpirationModule} from '../../../pipes/time-expiration.pipe';
import {RewardComponent} from './reward/reward.component';
import {ObjectiveComponent} from './objective/objective.component';
import {TagComponent} from './tag/tag.component';
import {Tag} from '../../../models/tag';
import {Pursuit} from '../../../models/pursuit';
import {ObjectiveTime} from '../../../models/objective-time';
import {Objective} from '../../../models/objective';

@Component({
  selector: 'app-pursuit',
  templateUrl: './pursuit.component.html',
  styleUrls: ['./pursuit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PursuitComponent implements OnInit, OnChanges {

  tagList = Tag.list;

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

  @Input()
  pursuitIsSelected: boolean;

  @Input()
  searchedId: string;
  searchText = '';
  searchRegExp: RegExp;
  found = false;
  private _currentSearchSubscription: Subscription;
  // @Output()
  // pursuitMatchSearch: EventEmitter<any> = new EventEmitter();

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

  private itemTypeDisplayNameHighlighted: string;
  private nameHighlighted: string;
  private descriptionHighlighted: string;
  private vendorNameHighlighted: string;


  constructor(private _checklistService: ChecklistService,
              private _headerService: HeaderService,
              private _changeDetectorRef: ChangeDetectorRef) {
  }

  ngOnInit() {
    this._currentSearchSubscription = this._headerService.searchObservable().subscribe(
      search => {
        if (this.searchText !== search.searchText) {
          this.found = false;
          this.searchText = search.searchText;
          this.searchRegExp = new RegExp(this.searchText.replace(/ /, '([  ]|&nbsp;)'), 'gi');
          this.highlightPursuit();
          this._changeDetectorRef.markForCheck();
        }

      }
    );

  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.hasOwnProperty('pursuit') || changes.hasOwnProperty('genderedClassNames')) {
      this.highlightPursuit();
    }
    // console.log(changes);
  }

  // cptHighlight = 0;

  highlightPursuit() {
    // console.log(this.pursuit.name);
    // console.log(new Error());
    this.itemTypeDisplayNameHighlighted = UtilService.highlight(this.pursuit.itemTypeDisplayName, this.searchText, this.searchRegExp);
    this.nameHighlighted = UtilService.highlight(this.pursuit.name, this.searchText, this.searchRegExp);
    this.descriptionHighlighted = UtilService.highlight(this.pursuit.description, this.searchText, this.searchRegExp);
    this.vendorNameHighlighted = UtilService.highlight(this.pursuit.vendorName, this.searchText, this.searchRegExp);
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
    // console.log('stopObjectiveTime');

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
    // console.log('launchObjectiveTime');

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

  containsTag(tag: Tag) {
    if (!this.pursuit.tags || (this.pursuit.tags.length === 0)) {
      return false;
    }
    return this.pursuit.tags.filter(t => t === tag.name).length !== 0;
  }


  toggleTag(tag: Tag, selected: boolean) {
    if (!this.pursuit.tags) {
      this.pursuit.tags = [];
    }
    if (selected) {
      this.pursuit.tags.push(tag.name);
    } else {
      this.pursuit.tags = this.pursuit.tags.filter(t => t !== tag.name);
    }
    let key = this.pursuit.itemInstanceId;
    if (this.pursuit.questlineItemHash) {
      key = this.pursuit.questlineItemHash;
    }
    this._checklistService.setTag(key, this.pursuit.tags);
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
    MatChipsModule,
    TimeExpirationModule
  ],
  declarations: [
    PursuitComponent,
    RewardComponent,
    ObjectiveComponent,
    TagComponent
  ],
  providers: [],
  exports: [
    PursuitComponent
  ]
})
export class PursuitModule {
}
