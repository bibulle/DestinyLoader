import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { ChecklistService } from '../../services/checklist.service';
import { Character } from '../../models/character';
import { GraphTypeKey } from '../../models/graph';

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss']
})
export class ChecklistComponent implements OnInit {

  // characters: Character[] = [];
  private _currentChecklistSubscription: Subscription;

  constructor (private _checklistService: ChecklistService) {
  }

  ngOnInit () {


    this._currentChecklistSubscription = this._checklistService.currentChecklistObservable().subscribe(
      characters => {
        // this.characters = characters;
      }
    );

  }

}
