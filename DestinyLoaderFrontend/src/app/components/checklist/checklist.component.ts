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

        // If we have things to show
        if (this.checklist.items && this.checklist.items.Pursuits && this.checklist.characters) {

          // Sort character by last played first
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
              // foreach pursuit, add to the character pursuits
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

              // else create the object
              const newMilestone: Milestone = {
                itemTypeDisplayName: 'Milestone',
                description: milestone.description,
                name: milestone.milestoneName,
                icon: milestone.icon,
                expirationDate: undefined,
                rewards: [],
                objectives: []
              };

              // add well formed rewards
              milestone.rewards.forEach(reward => {
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

              // add well formed objectives
              milestone.objectives.forEach(objective => {
                const newObjective: Objective = {
                    objectiveHash: objective.objectiveHash,
                    completionValue: objective.completionValue,
                    complete: objective.complete,
                    progress: objective.progress,
                    item: {
                      progressDescription: objective.itemName
                    },
                    timeTillFinished: Number.POSITIVE_INFINITY
                  }
                ;
                newMilestone.objectives.push(newObjective);
              });

              char.pursuits.push(newMilestone);
            });

            // add objectives time
            char.pursuits.forEach(pursuit => {
              pursuit.objectives.forEach(objective => {
                objective.timeTillFinished = Number.POSITIVE_INFINITY;

                if (objective.complete) {
                  objective.timeTillFinished = 0;
                } else if (this.TIMES_BY_OBJECTIVE[objective.objectiveHash]) {
                  objective.timeTillFinished = this.TIMES_BY_OBJECTIVE[objective.objectiveHash] * (objective.completionValue - objective.progress);
                }
              });
            });

            // sort pursuit
            char.pursuits.sort((p1, p2) => {
              {
                const r1 = ChecklistComponent.getMaxReward(p1.rewards);
                const r2 = ChecklistComponent.getMaxReward(p2.rewards);

                const t1 = ChecklistComponent.getMaxTimeTillFinished(p1.objectives);
                const t2 = ChecklistComponent.getMaxTimeTillFinished(p2.objectives);

                const rewardsCompared = ChecklistComponent.compareRewards(r1, r2);

                if (rewardsCompared !== 0) {
                  return rewardsCompared;
                } else {
                  // let's compare on objective times
                  return t1 - t2;
                }
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
    this.initPositionsStickyHeaders();
    this.calcPositionsStickyHeaders();
  }


  private topPage = 0;

  @HostListener('window:resize', ['$event'])
  onResize () {
    this.initPositionsStickyHeaders();

  }

  @HostListener('window:scroll', ['$event'])
  onScroll () {
    this.calcPositionsStickyHeaders();

  }

  private initPositionsStickyHeaders () {
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

  private calcPositionsStickyHeaders () {


    // get character card position
    const cards = this.elRef.nativeElement.getElementsByClassName('character-card');
    const positions = [];
    for (const card of cards) {
      const topPosition = card.getBoundingClientRect().top;
      positions.push((topPosition < this.topPage));
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
    let ret = ChecklistComponent.getRewardValue(r2) - ChecklistComponent.getRewardValue(r1);

    if ((ret === 0) && (r1 != null)) {
      if (r1.name > r2.name) {
        ret = 1;
      } else if (r1.name < r2.name) {
        ret = -1;
      }
    }

    return ret;
  }


  private static getRewardValue (r: Reward): number {
    if (r == null) {
      return -2;
    }
    if (r.redeemed) {
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

  static getMaxTimeTillFinished (objectives: Objective[]): number {

    let result = 0;
    objectives.forEach(o => {
      if (result < o.timeTillFinished) {
        result = o.timeTillFinished;
      }
    });
    return result;
  }

  private TIMES_BY_OBJECTIVE = {
    // Gambit match
    '2083819821': 15 * 60 * 1000,
    '776296945': 15 * 60 * 1000,
    // Crucible
    '2709623572': 12 * 60 * 1000,
    '562619790': 12 * 60 * 1000,
    // Strike
    '2244227422': 13.5 * 60 * 1000,
    '3201963368': 13.5 * 60 * 1000,
    '2225383629': 13.5 * 60 * 1000,
    // WANTED: The Eye in the Dark
    '277282920' : 25 * 60 * 1000
  };
}
