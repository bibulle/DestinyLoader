/* tslint:disable:member-ordering */
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChecklistService } from '../../services/checklist.service';
import { catalystState, Character, Checklist, Objective, ObjectiveTime, Pursuit, PursuitType, Reward } from '../../models/checklist';
import { Config } from '../../models/config';
import { HeaderService } from '../../services/header.service';
import { TranslateService } from '@ngx-translate/core';

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
               private _translateService: TranslateService,
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
            // console.log(ot);
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
          let charIndex = 0;
          checklist.characters.forEach(char => {
            charIndex++;
            char.pursuits = [];

            // foreach pursuit type
            Object.keys(checklist.items[ChecklistComponent.PURSUIT_HASH]).forEach(key => {
              // foreach pursuit, add to the character pursuits
              checklist.items[ChecklistComponent.PURSUIT_HASH][key].forEach(pursuit => {
                if (pursuit.characterId === char.characterId) {
                  listOfPursuitsKey.push(ChecklistComponent.getPursuitKey(pursuit, char));
                  pursuit.type = PursuitType.PURSUIT;
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
                itemType: Pursuit.ITEM_TYPE_MILESTONE,
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
                type: PursuitType.MILESTONE
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
                                itemType: Pursuit.ITEM_TYPE_VENDOR,
                                itemTypeDisplayName: 'Vendor',
                                description: sale.displaySource,
                                vendorName: vendor.name,
                                saleDescription: sale.itemTypeDisplayName,
                                name: sale.name,
                                icon: sale.icon,
                                expirationDate: undefined,
                                rewards: [],
                                maxRewardLevel: -2,
                                objectives: [],
                                type: PursuitType.SALE
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

            // add catalyst (to the first character)
            if (charIndex === 1) {
              checklist.catalysts.forEach(
                catalyst => {
                  if ((catalyst.state === catalystState.DROPPED) || (catalyst.state === catalystState.TO_BE_COMPLETED)) {
                    const newCatalyst: Pursuit = {
                      itemInstanceId: catalyst.inventoryItem.itemInstanceId,
                      itemType: Pursuit.ITEM_TYPE_CATALYST,
                      itemTypeDisplayName: 'Catalyst',
                      description: catalyst.item.displayProperties.description,
                      name: catalyst.inventoryItem.itemName,
                      icon: catalyst.item.displayProperties.icon,
                      expirationDate: undefined,
                      rewards: [],
                      maxRewardLevel: -2,
                      objectives: [],
                      vendorName: undefined,
                      saleDescription: undefined,
                      type: PursuitType.CATALYST
                    };

                    this._translateService
                        .get('catalyst', {name: catalyst.inventoryItem.itemName})
                        .subscribe(res => {
                          newCatalyst.name = res;
                        });

                    // change description on dropped catalyst
                    if (catalyst.state === catalystState.DROPPED) {
                      this._translateService
                          .get('catalyst.dropped')
                          .subscribe(res => {
                            newCatalyst.description = res;
                          });
                    }


                    listOfPursuitsKey.push(ChecklistComponent.getPursuitKey(newCatalyst, char));
                    char.pursuits.push(newCatalyst);

                    // add well formed objectives
                    if (catalyst.objectives) {
                      // console.log(newCatalyst.itemInstanceId+" "+newCatalyst.name);
                      catalyst.objectives.forEach(objective => {
                        const newObjective: Objective = {
                          objectiveHash: objective.objectiveHash,
                          completionValue: objective.completionValue,
                          complete: objective.complete,
                          progress: objective.progress,
                          item: objective.item,
                          timeTillFinished: Number.MAX_SAFE_INTEGER
                        };
                        newCatalyst.objectives.push(newObjective);


                        // add running objective
                        if (currentTimeObjective[char.characterId] &&
                          currentTimeObjective[char.characterId][objective.objectiveHash] &&
                          currentTimeObjective[char.characterId][objective.objectiveHash].pursuitId === newCatalyst.itemInstanceId) {
                          newObjective.runningTimeObjective = currentTimeObjective[char.characterId][objective.objectiveHash];
                          newObjective.runningTimeObjective.timeStart = new Date(newObjective.runningTimeObjective.timeStart);
                          newObjective.runningTimeObjective.timeRunning = (new Date().getTime() - newObjective.runningTimeObjective.timeStart.getTime());

                        }

                      });
                    }

                    // console.log(catalyst);
                  }
                }
              );
            }

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
        // console.log(rel);

        this.checklist.characters.forEach(char => {
          setTimeout(() => {
            this.sortPursuits(char);
          }, 500);
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

        let catalystCompare = 0;
        if ((p1.type === PursuitType.CATALYST) && (p1.objectives.length === 0)) {
          catalystCompare--;
        }
        if ((p2.type === PursuitType.CATALYST) && (p2.objectives.length === 0)) {
          catalystCompare++;
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
        } else if (catalystCompare !== 0) {
          return catalystCompare;
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

  stopObjectiveTime (objective: Objective, characterId: string, pursuitId: string, event: any) {
    // console.log('stopObjectiveTime');
    event.stopPropagation();

    this._checklistService.stopObjective(objective, characterId, pursuitId)
        .then(obj => {

          if (obj.runningTimeObjective) {
            obj.runningTimeObjective.timeStart = new Date(obj.runningTimeObjective.timeStart);
          }
          ChecklistComponent.updateObject(obj, objective);
        });
  }

  launchObjectiveTime (objective: Objective, characterId: string, pursuitId: string, event: any) {
    // console.log('launchObjectiveTime');
    event.stopPropagation();

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


  toggleShowOnlyPowerfulGear (event: any) {
    event.stopPropagation();
    this._headerService.toggleShowOnlyPowerfulGear();
  }


  static getPursuitKey (pursuit, character) {
    return character.characterId + ' ' + pursuit.itemInstanceId;
  }

  toggleSelectedPursuit (pursuit, character, event: any) {
    // console.log('toggleSelectedPursuit');
    event.stopPropagation();
    this._headerService.toggleSelectedPursuit(ChecklistComponent.getPursuitKey(pursuit, character));
    // console.log(pursuit);
  }

  pursuitIsSelected (pursuit, character) {
    return this.config.selectedPursuits && (this.config.selectedPursuits.indexOf(ChecklistComponent.getPursuitKey(pursuit, character)) > -1);
  }

  pursuitShouldBeDisplayed (pursuit: Pursuit, character) {
    if (!pursuit) {
      return false;
    }

    if (this.pursuitIsSelected(pursuit, character)) {
      return true;
    }

    let ret = false;

    let checkedRewards = true;
    pursuit.rewards.forEach(reward => {
      const val = Reward.getRewardValue(reward);
      switch (val) {
        case Reward.VALUE_POWER_GEAR:
          checkedRewards = true;
          ret = ret || this.config.visible.rewards.powerful_gear;
          break;
        case Reward.VALUE_LEGENDARY_GEAR:
          checkedRewards = true;
          ret = ret || this.config.visible.rewards.legendary_gear;
          break;
        case Reward.VALUE_IMPORTANT_CONSUMABLE:
          checkedRewards = true;
          ret = ret || this.config.visible.rewards.important_consumable;
          break;
        case Reward.VALUE_SPECIAL_WEAPON:
          checkedRewards = true;
          ret = ret || this.config.visible.rewards.special_weapon;
          break;
        case Reward.VALUE_TOKENS:
          checkedRewards = true;
          ret = ret || this.config.visible.rewards.tokens;
          break;
        case Reward.VALUE_RESOURCE:
          checkedRewards = true;
          ret = ret || this.config.visible.rewards.resources;
          break;
        case Reward.VALUE_UNKNOWN:
        default:
          break;
      }
    });

    if (!checkedRewards && (pursuit.rewards.length > 0)) {
      console.log('Not checked rewards');
      console.log(pursuit);
    }

    let checkedType = ret;
    if (!ret) {
      switch (pursuit.itemType) {
        case Pursuit.ITEM_TYPE_MILESTONE:
          checkedType = true;
          ret = ret || this.config.visible.types.milestone;
          break;
        case Pursuit.ITEM_TYPE_QUEST_STEP: // 'Quest Step'
        case Pursuit.ITEM_TYPE_QUEST_STEP_COMPLETE: // 'Quest Step' complete ?
        case Pursuit.ITEM_TYPE_QUEST_STEP_DUMMY: // 'Quest Step'
          checkedType = true;
          ret = ret || this.config.visible.types.quest_step;
          break;
        case Pursuit.ITEM_TYPE_CATALYST:
          checkedType = true;
          ret = ret || this.config.visible.types.catalyst;
          break;
        case Pursuit.ITEM_TYPE_VENDOR:
          checkedType = true;
          ret = ret || this.config.visible.types.vendor_bounty;
          break;
        case Pursuit.ITEM_TYPE_BOUNTY: // 'Queen's Bounty', 'Eververse Bounty', 'Scrapper Bounty', 'Daily Bounty', 'Weekly Bounty', 'Gambit Bounty', 'Weekly Drifter Bounty'
          checkedType = true;
          ret = ret || this.config.visible.types.owned_bounty;
          break;
        case 0:
          switch (pursuit.itemTypeDisplayName) {
            case 'Forge Vessel':
            case 'Réceptacle de forge':
            case 'Key Mold':
            case 'Moule de clé':
              checkedType = true;
              ret = ret || this.config.visible.types.forge;
              break;
            case 'Pursuits':
            case 'Poursuites':
              checkedType = true;
              ret = ret || this.config.visible.types.pursuit;
              break;
            case 'Weekly Drifter Bounty':
            case 'Contrats de la semaine du Vagabond':
              checkedType = true;
              ret = ret || this.config.visible.types.owned_bounty;
              break;
          }
      }
    }

    if (!checkedType) {
      console.log('not checked : ' + pursuit.itemType + ' ' + pursuit.itemTypeDisplayName);
      console.log(pursuit);
    }


    return ret;
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

