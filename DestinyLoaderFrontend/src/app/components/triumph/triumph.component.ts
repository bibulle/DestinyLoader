import { Component, OnDestroy, OnInit} from '@angular/core';
import { Subscription } from 'rxjs';
import { StatsService } from '../../services/stats.service';
import { Character } from '../../models/character';
import { GraphTypeKey } from '../../models/graph';
import {HeaderService, ReloadingKey} from '../../services/header.service';

@Component({
  selector: 'app-triumph',
  templateUrl: './triumph.component.html',
  styleUrls: ['./triumph.component.scss']
})
export class TriumphComponent implements OnInit, OnDestroy {

  characters: Character[] = [];
  graphType = GraphTypeKey.TRIUMPH;

  private _currentStatsSubscription: Subscription;

  constructor (private _headerService: HeaderService,
               private _statsService: StatsService) {
  }

  ngOnInit () {

    this._headerService.setSearchShown(false);
    this._headerService.setTagsShown(false);

    this._currentStatsSubscription = this._statsService.currentStatsObservable().subscribe(
      characters => {
        this.characters = characters;
      }
    );
    this._statsService.startLoadingStats();

  }

  ngOnDestroy (): void {
    this._headerService.stopReloading(ReloadingKey.Stats);
    if (this._currentStatsSubscription) {
      this._currentStatsSubscription.unsubscribe();
    }
  }

}
