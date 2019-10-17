import {Component, Input, OnInit} from '@angular/core';
import {Reward} from '../../../../models/checklist';

@Component({
  selector: 'app-reward',
  templateUrl: './reward.component.html',
  styleUrls: ['./reward.component.scss']
})
export class RewardComponent implements OnInit {

  @Input()
  reward: Reward;

  @Input()
  pursuitName: string;
  @Input()
  pursuitObjectivesLength: number;

  @Input()
  highlight: (string) => string;

  constructor() { }

  ngOnInit() {
  }

}
