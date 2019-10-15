import { Component, OnDestroy, OnInit} from '@angular/core';
import { Subscription } from 'rxjs';
import { StatsService } from '../../services/stats.service';
import { Character } from '../../models/character';
import { GraphTypeKey } from '../../models/graph';
import {HeaderService, ReloadingKey} from '../../services/header.service';

@Component({
  selector: 'app-glory',
  templateUrl: './glory.component.html',
  styleUrls: ['./glory.component.scss']
})
export class GloryComponent implements OnInit, OnDestroy {

  characters: Character[] = [];
  graphType = GraphTypeKey.GLORY;

  private _currentStatsSubscription: Subscription;

  constructor (private _headerService: HeaderService,
               private _statsService: StatsService) {
  }

  ngOnInit () {

    this._headerService.setSearchShown(false);

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
