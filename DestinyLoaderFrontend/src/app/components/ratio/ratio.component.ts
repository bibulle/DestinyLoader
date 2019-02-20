import { Component, OnDestroy, OnInit} from '@angular/core';
import { Subscription } from 'rxjs';
import { StatsService } from '../../services/stats.service';
import { Character } from '../../models/character';
import { GraphTypeKey } from '../../models/graph';
import { HeaderService } from '../../services/header.service';

@Component({
  selector: 'app-ratio',
  templateUrl: './ratio.component.html',
  styleUrls: ['./ratio.component.scss']
})
export class RatioComponent implements OnInit, OnDestroy {

  characters: Character[] = [];
  graphType = GraphTypeKey.RATIO;

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
    if (this._currentStatsSubscription) {
      this._currentStatsSubscription.unsubscribe();
    }
  }

}
