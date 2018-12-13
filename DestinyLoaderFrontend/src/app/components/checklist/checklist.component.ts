/* tslint:disable:member-ordering */
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { ChecklistService } from '../../services/checklist.service';
import { Character, Checklist, Milestone, Objective, Reward } from '../../models/checklist';

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss']
})
export class ChecklistComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('page')
  tableElement: ElementRef;

  checklist: Checklist;

  private _currentChecklistSubscription: Subscription;

  constructor (private _checklistService: ChecklistService,
               private elRef: ElementRef) {
  }

  ngOnInit () {


    this._currentChecklistSubscription = this._checklistService.currentChecklistObservable().subscribe(
      checklist => {
        this.checklist = checklist as Checklist;
        console.log(checklist);

        if (this.checklist.items && this.checklist.items.Pursuits && this.checklist.characters) {

          this.checklist.characters.sort((c1: Character, c2: Character) => {
            if (c1.dateLastPlayed > c2.dateLastPlayed) {
              return -1;
            } else if (c1.dateLastPlayed < c2.dateLastPlayed) {
              return 1;
            } else {
              return 0;
            }
          });

          // forEach character
          this.checklist.characters.forEach(char => {
            char.pursuits = [];

            // foreach pursuit type
            Object.keys(this.checklist.items.Pursuits).forEach(key => {
              // foreach pursuit
              this.checklist.items.Pursuits[key].forEach(pursuit => {
                if (pursuit.characterId === char.characterId) {
                  char.pursuits.push(pursuit);
                }

              });


            });

            // foreach milestone
            char.milestones.forEach(milestone => {

              // remove classified milestone
              if (milestone.milestoneName === 'Classified') {
                return;
              }

              const newMilestone: Milestone = {
                itemTypeDisplayName: 'Milestone',
                description: milestone.description,
                name: milestone.milestoneName,
                icon: milestone.icon,
                expirationDate: undefined,
                rewards: [],
                objectives: []
              };

              // console.log(milestone);
              milestone.rewards.forEach(reward => {
                // console.log(reward);
                const newReward: Reward = {
                  name: reward.definition.items[0].itemName,
                  icon: reward.definition.items[0].icon,
                  quantity: reward.definition.items[0].quantity,
                  identifier: reward.definition.displayProperties.name,
                  identifierIcon: reward.definition.displayProperties.icon,
                  redeemed: reward.redeemed,
                  earned: reward.earned
                };
                newMilestone.rewards.push(newReward);
              });
              milestone.objectives.forEach(objective => {
                // console.log(objective);
                const newObjective: Objective = {
                  completionValue: objective.completionValue,
                  complete: objective.complete,
                  progress: objective.progress,
                  item: {
                    progressDescription: objective.itemName
                  }
                };
                newMilestone.objectives.push(newObjective);
              });

              char.pursuits.push(newMilestone);
            });

            // sort pursuit
            char.pursuits.sort((p1, p2) => {
              {
                const r1 = ChecklistComponent.getMaxReward(p1.rewards);
                const r2 = ChecklistComponent.getMaxReward(p2.rewards);

                return ChecklistComponent.compareRewards(r1, r2);
              }
            });

          });

        }


      }
    );
    this._checklistService.startLoadingChecklist();
  }

  ngOnDestroy (): void {
    if (this._currentChecklistSubscription) {
      this._currentChecklistSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked () {
    this.initPositions();
    this.calcPositions();
  }


  private topPage = 0;

  @HostListener('window:resize', ['$event'])
  onResize () {
    this.initPositions();

  }

  @HostListener('window:scroll', ['$event'])
  onScroll () {
    this.calcPositions();

  }

  private initPositions () {
    // calculate positioning and get reference
    this.topPage = this.elRef.nativeElement.parentElement.offsetTop;

    // get character card position
    const cards = this.elRef.nativeElement.getElementsByClassName('character-card');
    const positions = [];
    for (const card of cards) {
      positions.push({
        right: card.parentElement.getBoundingClientRect().right - card.getBoundingClientRect().right,
        left: card.getBoundingClientRect().left
      });
    }

    // set sticky character card position
    const stickyCards = this.elRef.nativeElement.getElementsByClassName('character-card-sticky');
    let index = 0;
    for (const card of stickyCards) {
      card.style.top = this.topPage + 'px';
      card.style.left = positions[index].left + 'px';
      card.style.width = card.parentElement.getBoundingClientRect().width + 'px';
      index++;
    }
  }

  private calcPositions () {


    // get character card position
    const cards = this.elRef.nativeElement.getElementsByClassName('character-card');
    const positions = [];
    for (const card of cards) {
      const topPosition = card.getBoundingClientRect().top;
      positions.push((topPosition < this.topPage ));
    }

    // set sticky character card visible or not
    const stickyCards = this.elRef.nativeElement.getElementsByClassName('character-card-sticky');
    let index = 0;
    for (const card of stickyCards) {
      if (positions[index]) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
      index++;
    }
  }


  static getMaxReward (rewards: Reward[]): Reward {
    rewards.sort(ChecklistComponent.compareRewards);
    if (rewards.length > 0) {
      return rewards[0];
    } else {
      return null;
    }
  }

  static compareRewards (r1: Reward, r2: Reward): number {
    let ret = ChecklistComponent.getValue(r2) - ChecklistComponent.getValue(r1);
    if ((ret === 0) && (r1 != null)) {
      if (r1.name > r2.name) {
        ret = 1;
      } else if (r1.name < r2.name) {
        ret = -1;
      }
    }

    return ret;
  }


  private static getValue (r: Reward): number {
    if (r == null) {
      return -1;
    }

    switch (r.name) {
      case 'Powerful Gear':
        return 100;
      case 'Legendary Gear':
        return 50;
      case 'Enhancement Core':
      case 'Dark Fragment':
      case 'Transcendent Blessing':
        return 10;
      case 'Crucible Token':
      case 'Clan XP':
      case 'Infamy Rank Points':
      case 'Vanguard Tactician Token':
      case 'Nessus Rewards':
        return 3;
      case 'Legendary Shards':
        return 1;
      case 'Baryon Bough':
      case 'Alkane Dust':
      case 'Dusklight Shard':
      case 'Bright Dust':
      case 'Phaseglass Needle':
      case 'Microphasic Datalattice':
      case 'Glimmer':
        return 0;
      default:
        // console.log(r.name);
        return 5;
    }
  }
}
