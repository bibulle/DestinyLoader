/* tslint:disable:member-ordering */
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { ChecklistService } from '../../services/checklist.service';
import { Character, Checklist, Objective, ObjectiveTime, Pursuit, Reward } from '../../models/checklist';
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

  private static PURSUIT_HASH = '1345459588';

  ngOnInit () {


    this._currentChecklistSubscription = this._checklistService.currentChecklistObservable().subscribe(
      (checklist: Checklist) => {

        const listOfPursuitsKey = [];

        checklist = checklist as Checklist;
        // If we have things to show
        if (checklist && checklist.items && checklist.items[ChecklistComponent.PURSUIT_HASH] && checklist.characters && checklist.times && checklist.currentTimes) {

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
            Object.keys(checklist.items[ChecklistComponent.PURSUIT_HASH]).forEach(key => {
              // foreach pursuit, add to the character pursuits
              checklist.items[ChecklistComponent.PURSUIT_HASH][key].forEach(pursuit => {
                if (pursuit.characterId === char.characterId) {
                  listOfPursuitsKey.push(ChecklistComponent.getPursuitKey(pursuit, char));
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
              const newMilestone: Pursuit = {
                itemInstanceId: milestone.instanceId,
                itemTypeDisplayName: 'Milestone',
                description: milestone.description,
                name: milestone.milestoneName,
                icon: milestone.icon,
                expirationDate: undefined,
                rewards: [],
                maxRewardLevel: -2,
                objectives: [],
                vendorName: undefined,
                saleDescription: undefined,
              };

              // add well formed rewards
              milestone.rewards.forEach(reward => {
                if (reward.definition) {
                  const newReward: Reward = {
                    name: reward.definition.items[0].itemName,
                    icon: reward.definition.items[0].icon,
                    quantity: reward.definition.items[0].quantity,
                    identifier: reward.definition.displayProperties.name,
                    identifierIcon: reward.definition.displayProperties.icon,
                    redeemed: reward.redeemed,
                    earned: reward.earned,
                    objectivesSize: milestone.objectives.length,
                    itemHash: reward.itemHash
                  };
                  newMilestone.rewards.push(newReward);
                } else {
                  const newReward: Reward = {
                    name: reward.displayProperties.name,
                    icon: reward.displayProperties.icon,
                    quantity: reward.quantity,
                    identifier: reward.displayProperties.name,
                    identifierIcon: null,
                    redeemed: false,
                    earned: false,
                    objectivesSize: milestone.objectives.length,
                    itemHash: reward.itemHash
                  };
                  newMilestone.rewards.push(newReward);
                }

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

              listOfPursuitsKey.push(ChecklistComponent.getPursuitKey(newMilestone, char));
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

                if (currentTimeObjective[char.characterId] &&
                  currentTimeObjective[char.characterId][objective.objectiveHash] &&
                  currentTimeObjective[char.characterId][objective.objectiveHash].pursuitId === pursuit.itemInstanceId) {
                  objective.runningTimeObjective = currentTimeObjective[char.characterId][objective.objectiveHash];
                  objective.runningTimeObjective.timeStart = new Date(objective.runningTimeObjective.timeStart);
                  objective.runningTimeObjective.timeRunning = (new Date().getTime() - objective.runningTimeObjective.timeStart.getTime());

                }
              });
            });

            // add purchasable bounties
            Object.keys(checklist.vendors).forEach(
              key => {
                if (key === char.characterId) {
                  checklist.vendors[key].forEach(
                    vendor => {
                      if (vendor.enabled) {
                        vendor.sales.forEach(
                          sale => {
                            // if there is rewards and it's purchasable
                            if ((sale.rewards.length !== 0) && (sale.saleStatus < 3)) {
                              // console.log(key + ' ' + vendor.name + ' : ' + sale.name + ' (' + sale.itemTypeDisplayName + ')');
                              const newSale: Pursuit = {
                                itemInstanceId: sale.hash,
                                itemTypeDisplayName: 'Vendor',
                                description: sale.displaySource,
                                vendorName: vendor.name,
                                saleDescription: sale.itemTypeDisplayName,
                                name: sale.name,
                                icon: sale.icon,
                                expirationDate: undefined,
                                rewards: [],
                                maxRewardLevel: -2,
                                objectives: []
                              };

                              // add  rewards
                              sale.rewards.forEach(reward => {
                                const newReward: Reward = {
                                  name: reward.item.displayProperties.name,
                                  icon: reward.item.displayProperties.icon,
                                  quantity: reward.quantity,
                                  identifier: '',
                                  identifierIcon: null,
                                  redeemed: false,
                                  earned: false,
                                  objectivesSize: sale.objectives.length,
                                  itemHash: reward.itemHash
                                };
                                newSale.rewards.push(newReward);

                              });

                              // add well formed objectives
                              sale.objectives.forEach(objective => {
                                const newObjective: Objective = {
                                    objectiveHash: objective.objectiveHash,
                                    completionValue: objective.completionValue,
                                    complete: objective.complete,
                                    progress: objective.progress,
                                    item: objective.item,
                                    timeTillFinished: Number.MAX_SAFE_INTEGER
                                  }
                                ;
                                newSale.objectives.push(newObjective);
                              });

                              listOfPursuitsKey.push(ChecklistComponent.getPursuitKey(newSale, char));
                              char.pursuits.push(newSale);

                            }
                          }
                        );
                      }
                    }
                  );
                }
              }
            );

            // sort pursuit
            this.sortPursuits(char);

          });

        }

        // clean the selected pursuit list
        if (this.config.selectedPursuits) {
          this.config.selectedPursuits = this.config.selectedPursuits.filter(key => {
            return (listOfPursuitsKey.indexOf(key) > -1);
          });
        }
        // console.log(this.config.selectedPursuits);

        console.log(checklist);
        ChecklistComponent.updateObject(checklist, this.checklist);
        console.log(this.checklist);


      }
    );
    this._checklistService.startLoadingChecklist();

    this._currentConfigSubscription = this._headerService.configObservable().subscribe(
      rel => {
        this.config = rel;

        this.checklist.characters.forEach(char => {
          this.sortPursuits(char);
        });

      });

    // refresh the running times
    this.refreshRunningTimes();

  }

  refreshRunningTimes () {
    // console.log('refreshRunningTimes')
    // console.log(this.checklist.currentTimes)
    if (this.checklist && this.checklist.currentTimes) {
      this.checklist.currentTimes.forEach(rt => {
        rt.timeStart = new Date(rt.timeStart);
        rt.timeRunning = (new Date().getTime() - rt.timeStart.getTime());
      });
    }
    setTimeout(() => {
      this.refreshRunningTimes();
    }, 5000);
  }

  sortPursuits (char) {
    char.pursuits.sort((p1, p2) => {
      {
        let selectedCompare = 0;
        if (this.pursuitIsSelected(p1, char)) {
          selectedCompare--;
        }
        if (this.pursuitIsSelected(p2, char)) {
          selectedCompare++;
        }

        const r1 = Reward.getMaxReward(p1.rewards);
        p1.maxRewardLevel = Reward.getRewardValue(r1);
        const r2 = Reward.getMaxReward(p2.rewards);
        p2.maxRewardLevel = Reward.getRewardValue(r2);

        const t1 = Objective.getMaxTimeTillFinished(p1.objectives);
        const t2 = Objective.getMaxTimeTillFinished(p2.objectives);

        const rewardsCompared = Reward.compareRewards(r1, r2);

        if (selectedCompare !== 0) {
          return selectedCompare;
        } else if (rewardsCompared !== 0) {
          return rewardsCompared;
        } else {
          // let's compare on objective times
          return t1 - t2;
        }
      }
    });
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

  stopObjectiveTime (objective: Objective, characterId: string, pursuitId: string) {
    console.log('stopObjectiveTime');
    this._checklistService.stopObjective(objective, characterId, pursuitId)
        .then(obj => {

          if (obj.runningTimeObjective) {
            obj.runningTimeObjective.timeStart = new Date(obj.runningTimeObjective.timeStart);
          }
          ChecklistComponent.updateObject(obj, objective);
        });
  }

  launchObjectiveTime (objective: Objective, characterId: string, pursuitId: string) {
    console.log('launchObjectiveTime');
    this._checklistService.startObjective(objective, characterId, pursuitId)
        .then(obj => {

          if (obj.runningTimeObjective) {
            // console.log(obj);
            obj.runningTimeObjective.timeStart = new Date(obj.runningTimeObjective.timeStart);
            obj.runningTimeObjective.timeRunning = (new Date().getTime() - obj.runningTimeObjective.timeStart.getTime());
            // console.log(obj);
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


  toggleShowOnlyPowerfulGear () {
    this._headerService.toggleShowOnlyPowerfulGear();
  }


  static getPursuitKey(pursuit, character) {
    return character.characterId + ' ' + pursuit.itemInstanceId;
  }

  toggleSelectedPursuit (pursuit, character) {
    this._headerService.toggleSelectedPursuit(ChecklistComponent.getPursuitKey(pursuit, character));
    // console.log(pursuit);
  }

  pursuitIsSelected(pursuit, character) {
    return this.config.selectedPursuits && (this.config.selectedPursuits.indexOf(ChecklistComponent.getPursuitKey(pursuit, character)) > -1);
  }

  pursuitShouldBeDisplayed (pursuit: Pursuit, character) {
    if (!pursuit) {
      return false;
    }
    return this.pursuitIsSelected(pursuit, character) || !this.config.showOnlyPowerfulGear || (pursuit.maxRewardLevel >= Reward.VALUE_POWER_GEAR);
  }

  pursuitHasRunningObjectives (pursuit: Pursuit) {
    let ret = false;
    pursuit.objectives.forEach((obj) => {
      if (this.objectivesIsRunning(obj)) {
        ret = true;
      }
    });

    return ret;
  }

  objectivesIsRunning (objective) {
    return objective.runningTimeObjective && !objective.runningTimeObjective.finished;
  }
}
