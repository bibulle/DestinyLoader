import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { StatsService } from '../../services/stats.service';
import { Character } from '../../models/character';
import { GraphTypeKey } from '../../models/graph';

@Component({
  selector: 'app-ratio',
  templateUrl: './ratio.component.html',
  styleUrls: ['./ratio.component.scss']
})
export class RatioComponent implements OnInit {

  characters: Character[] = [];
  graphType = GraphTypeKey.RATIO;

  private _currentStatsSubscription: Subscription;

  constructor (private _statsService: StatsService) {
  }

  ngOnInit () {


    this._currentStatsSubscription = this._statsService.currentStatsObservable().subscribe(
      characters => {
        this.characters = characters;
      }
    );

  }

}
