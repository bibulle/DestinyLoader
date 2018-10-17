import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { StatsService } from '../../services/stats.service';
import { Character } from '../../models/character';
import { GraphTypeKey } from '../../models/graph';

@Component({
  selector: 'app-triumph',
  templateUrl: './triumph.component.html',
  styleUrls: ['./triumph.component.scss']
})
export class TriumphComponent implements OnInit {

  characters: Character[] = [];
  graphType = GraphTypeKey.TRIUMPH;

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
