import { Component, OnInit } from '@angular/core';
import { ObjectiveTime } from '../../models/checklist';
import { Subscription } from 'rxjs/internal/Subscription';
import { ChecklistService } from '../../services/checklist.service';
import { Config } from '../../models/config';
import { HeaderService } from '../../services/header.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-objective-times',
  templateUrl: './objective-times.component.html',
  styleUrls: ['./objective-times.component.scss']
})
export class ObjectiveTimesComponent implements OnInit {

  objectiveTimes: ObjectiveTime[] = [];
  private _currentObjectiveTimesSubscription: Subscription;

  config: Config = new Config();
  private _currentConfigSubscription: Subscription;
  oldLanguage = '';

  constructor (private _checklistService: ChecklistService,
               private _translateService: TranslateService,
               private _headerService: HeaderService) {

  }

  ngOnInit () {
    this._currentObjectiveTimesSubscription = this._checklistService.currentObjectiveTimesObservable().subscribe(
      (objectiveTimes: ObjectiveTime[]) => {
        this.objectiveTimes = objectiveTimes.sort((ot1, ot2) => {
          const ret = ot1.objectiveId - ot2.objectiveId;

          if (ret !== 0) {
            return ret;
          }
          return new Date(ot1.timeStart).getTime() - new Date(ot2.timeStart).getTime();
        });
        console.log(this.objectiveTimes);

      });

    this._checklistService.startLoadingObjectiveTimes();

    this._currentConfigSubscription = this._headerService.configObservable().subscribe(
      rel => {
        if (this.oldLanguage !== rel.language) {
          this.config = rel;
          this._checklistService.refreshObjectiveTimes(this._checklistService, true);
          this.oldLanguage = rel.language;
        }
        this.config = rel;
        // console.log(rel);


      });

  }

  getTimeByIncrement (objective: ObjectiveTime): string {
    if (objective.timeEnd === objective.timeStart) {
      return null;
    } else if (objective.timeEnd) {
      return String((new Date(objective.timeEnd).getTime() - new Date(objective.timeStart).getTime()) / (objective.countEnd - objective.countStart));
    } else {
      return String((new Date(objective.lastVerified).getTime() - new Date(objective.timeStart).getTime()) / (objective.countEnd - objective.countStart));
    }
  }


  delete (objectiveTime: ObjectiveTime) {
    this._translateService
        .get('confirmation.delete.objective.time')
        .subscribe(res => {
          if (confirm(res)) {
            //noinspection JSIgnoredPromiseFromCall
            this._checklistService.deleteObjectiveTime(objectiveTime);
          }
        });
  }
}
