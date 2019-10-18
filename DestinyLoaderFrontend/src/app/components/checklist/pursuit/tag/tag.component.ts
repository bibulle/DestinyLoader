import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Tag} from '../../../../models/checklist';
import {Config} from '../../../../models/config';

@Component({
  selector: 'app-tag',
  templateUrl: './tag.component.html',
  styleUrls: ['./tag.component.scss']
})
export class TagComponent implements OnInit {

  @Input()
  tag: Tag;

  @Input()
  selected: boolean;

  @Output()
  toggleTagEmitter: EventEmitter<boolean> = new EventEmitter();

  constructor() {
  }

  ngOnInit() {
  }

  toggleTag(event: MouseEvent) {
    event.stopPropagation();
    this.toggleTagEmitter.emit(!this.selected);
  }
}
