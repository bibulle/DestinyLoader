import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {Reward} from '../../../../models/reward';
import {UtilService} from '../../../../services/util.service';

@Component({
  selector: 'app-reward',
  templateUrl: './reward.component.html',
  styleUrls: ['./reward.component.scss']
})
export class RewardComponent implements OnInit, OnChanges {

  @Input()
  reward: Reward;

  @Input()
  pursuitName: string;
  @Input()
  pursuitObjectivesLength: number;

  @Input()
  searchText: string;
  @Input()
  searchRegExp: RegExp;

  private nameHighlighted: string;

  constructor() {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.hasOwnProperty('reward') || changes.hasOwnProperty('searchText')) {
      this.nameHighlighted = UtilService.highlight(this.reward.name, this.searchText, this.searchRegExp);
    }
    // console.log(changes);
  }

}
