/* tslint:disable:member-ordering */
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { ChecklistService } from '../../services/checklist.service';
import { Character, Checklist, Milestone, Objective, ObjectiveTime, Pursuit, Reward } from '../../models/checklist';
import { Config } from '../../models/config';
import { HeaderService } from '../../services/header.service';

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss']
})
export class ChecklistComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('page')
  tableElement: ElementRef;

  checklist: Checklist = new Checklist();
  private _currentChecklistSubscription: Subscription;

  config: Config = new Config();
  private _currentConfigSubscription: Subscription;

  constructor (private _checklistService: ChecklistService,
               private _headerService: HeaderService,
               private elRef: ElementRef) {
  }

  ngOnInit () {


    this._currentChecklistSubscription = this._checklistService.currentChecklistObservable().subscribe(
      (checklist: Checklist) => {

        checklist = checklist as Checklist;
        // If we have things to show
        if (checklist && checklist.items && checklist.items.Pursuits && checklist.characters && checklist.times && checklist.currentTimes) {

          // create by user and by objective objective time array
          const currentTimeObjective: { [characterId: string]: { [objectiId: string]: ObjectiveTime } } = {};

          checklist.currentTimes.forEach(ot => {
            if (!currentTimeObjective[ot.characterId]) {
              currentTimeObjective[ot.characterId] = {};
            }
            currentTimeObjective[ot.characterId][ot.objectiveId] = ot;
          });


          // Sort character by last played first
          checklist.characters.sort((c1: Character, c2: Character) => {
            if (c1.dateLastPlayed > c2.dateLastPlayed) {
              return -1;
            } else if (c1.dateLastPlayed < c2.dateLastPlayed) {
              return 1;
            } else {
              return 0;
            }
          });

          // forEach character
          checklist.characters.forEach(char => {
            char.pursuits = [];

            // foreach pursuit type
            Object.keys(checklist.items.Pursuits).forEach(key => {
              // foreach pursuit, add to the character pursuits
              checklist.items.Pursuits[key].forEach(pursuit => {
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
                maxRewardLevel: -2,
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
                  earned: reward.earned,
                  objectivesSize: milestone.objectives.length
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
                    timeTillFinished: Number.MAX_SAFE_INTEGER
                  }
                ;
                newMilestone.objectives.push(newObjective);
              });

              char.pursuits.push(newMilestone);
            });

            // add objectives time (and running one)
            char.pursuits.forEach(pursuit => {
              pursuit.objectives.forEach(objective => {
                objective.timeTillFinished = Number.MAX_SAFE_INTEGER;

                if (objective.complete) {
                  objective.timeTillFinished = 0;
                } else if (checklist.times[objective.objectiveHash]) {
                  objective.timeTillFinished = checklist.times[objective.objectiveHash].time * (objective.completionValue - objective.progress);
                }

                if (currentTimeObjective[char.characterId] && currentTimeObjective[char.characterId][objective.objectiveHash]) {
                  objective.runningTimeObjective = currentTimeObjective[char.characterId][objective.objectiveHash];
                  objective.runningTimeObjective.timeStart = new Date(objective.runningTimeObjective.timeStart);
                  objective.runningTimeObjective.timeRunning = (new Date().getTime() - objective.runningTimeObjective.timeStart.getTime());

                }
              });
            });

            // sort pursuit
            char.pursuits.sort((p1, p2) => {
              {
                const r1 = Reward.getMaxReward(p1.rewards);
                p1.maxRewardLevel = Reward.getRewardValue(r1);
                const r2 = Reward.getMaxReward(p2.rewards);
                p2.maxRewardLevel = Reward.getRewardValue(r2);

                const t1 = Objective.getMaxTimeTillFinished(p1.objectives);
                const t2 = Objective.getMaxTimeTillFinished(p2.objectives);

                const rewardsCompared = Reward.compareRewards(r1, r2);

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

        console.log(checklist);
        ChecklistComponent.updateObject(checklist, this.checklist);
        console.log(this.checklist);


      }
    );
    this._checklistService.startLoadingChecklist();

    this._currentConfigSubscription = this._headerService.configObservable().subscribe(
      rel => {
        this.config = rel;
      });

    // refresh the running times
    this.refreshRunningTimes();

  }

  refreshRunningTimes () {
    // console.log('refreshRunningTimes')
    // console.log(this.checklist.currentTimes)
    if (this.checklist && this.checklist.currentTimes) {
      this.checklist.currentTimes.forEach(rt => {
        rt.timeRunning = (new Date().getTime() - rt.timeStart.getTime());
      });
    }
    setTimeout(() => {
      this.refreshRunningTimes();
    }, 5000);
  }

  ngOnDestroy (): void {
    if (this._currentChecklistSubscription) {
      this._currentChecklistSubscription.unsubscribe();
    }
    if (this._currentConfigSubscription) {
      this._currentConfigSubscription.unsubscribe();
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

  stopObjectiveTime (objective: Objective, characterId: string) {
    console.log('stopObjectiveTime');
    this._checklistService.stopObjective(objective, characterId)
        .then(obj => {

          if (obj.runningTimeObjective) {
            obj.runningTimeObjective.timeStart = new Date(obj.runningTimeObjective.timeStart);
          }
          ChecklistComponent.updateObject(obj, objective);
        });
  }

  launchObjectiveTime (objective: Objective, characterId: string) {
    console.log('launchObjectiveTime');
    this._checklistService.startObjective(objective, characterId)
        .then(obj => {

          if (obj.runningTimeObjective) {
            console.log(obj);
            obj.runningTimeObjective.timeStart = new Date(obj.runningTimeObjective.timeStart);
            obj.runningTimeObjective.timeRunning = (new Date().getTime() - obj.runningTimeObjective.timeStart.getTime());
            console.log(obj);
          }

          ChecklistComponent.updateObject(obj, objective);
          this.checklist.currentTimes.push(objective.runningTimeObjective);
        });

  }


  private static updateObject (src: Object, dst: Object) {

    if ((src instanceof Array) && (dst instanceof Array)) {
      while (src.length < dst.length) {
        dst.splice(-1, 1);
      }
    } else {
      for (const key of Object.keys(dst)) {
        if (!src.hasOwnProperty(key)) {
          delete dst[key];
        }
      }
    }

    for (const key of Object.keys(src)) {
      if (src[key] instanceof Object) {
        if ((!dst.hasOwnProperty(key)) || (src[key] instanceof Date)) {
          dst[key] = src[key];
        } else {
          ChecklistComponent.updateObject(src[key], dst[key]);
        }
      } else {
        dst[key] = src[key];
        // console.log(key);
      }
    }
  }


  toggleShowOnlyPowerfullGear () {
    this._headerService.toggleShowOnlyPowerfulGear();
  }

  pursuitShouldBeDisplayed (pursuit: Pursuit) {
    if (!pursuit) {
      return false;
    }
    return !this.config.showOnlyPowerfullGear || (pursuit.maxRewardLevel >= Reward.VALUE_POWER_GEAR);
  }
}
