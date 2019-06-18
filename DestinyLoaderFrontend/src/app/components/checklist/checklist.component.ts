/* tslint:disable:member-ordering no-bitwise */
import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChecklistService } from '../../services/checklist.service';
import { catalystState, Character, Checklist, Objective, ObjectiveTime, Pursuit, PursuitType, Reward } from '../../models/checklist';
import { Config } from '../../models/config';
import { HeaderService } from '../../services/header.service';
import { TranslateService } from '@ngx-translate/core';
import Timer = NodeJS.Timer;

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss']
})
export class ChecklistComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('page', { static: false })
  tableElement: ElementRef;

  checklist: Checklist = new Checklist();
  private _currentChecklistSubscription: Subscription;

  config: Config = new Config();
  private _currentConfigSubscription: Subscription;
  oldLanguage = '';

  search = '';
  foundList: number[] = [];
  searchTimout: Timer;
  private _currentSearchSubscription: Subscription;

  selectedTab = 0;
  searchedId = '';

  constructor (private _checklistService: ChecklistService,
               private _translateService: TranslateService,
               private _headerService: HeaderService,
               private elRef: ElementRef,
               private cd: ChangeDetectorRef) {
  }

  private static PURSUIT_HASH = '1345459588';

  private SEARCH_MIN_LENGTH = 3;

  private PURSUIT_KEY_MULTIPLIER = 1000000000;

  ngOnInit () {


    this._currentChecklistSubscription = this._checklistService.currentChecklistObservable().subscribe(
      (checklist: Checklist) => {

        const listOfPursuitsKey = [];

        checklist = checklist as Checklist;

        // if (checklist.characters) {
        //  checklist.characters = [checklist.characters[0]];
        // }

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

            // add catalyst and triumph (to the first character)
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
              checklist.triumphs.forEach(
                triumph => {

                  // if it's a root item (badges), do nothing (they cannot be redeemed)
                  if ((triumph.state === 0) && (triumph.item.presentationInfo.parentPresentationNodeHashes.length === 0)) {
                    return;
                  }

                  // If not already redeemed, add it
                  if ((triumph.state & 1) === 0) {
                    const newTriumph: Pursuit = {
                      itemInstanceId: triumph.hash,
                      itemType: (triumph.state === 0 ? Pursuit.ITEM_TYPE_TRIUMPH_REDEEMABLE : Pursuit.ITEM_TYPE_TRIUMPH),
                      itemTypeDisplayName: 'Triumph',
                      description: triumph.item.displayProperties.description,
                      name: triumph.item.displayProperties.name,
                      icon: triumph.item.displayProperties.icon,
                      expirationDate: undefined,
                      rewards: [],
                      maxRewardLevel: -2,
                      objectives: [],
                      vendorName: undefined,
                      saleDescription: undefined,
                      type: (triumph.state === 0 ? PursuitType.TRIUMPH_REDEEMABLE : PursuitType.TRIUMPH)
                    };

                    listOfPursuitsKey.push(ChecklistComponent.getPursuitKey(newTriumph, char));
                    char.pursuits.push(newTriumph);

                    // add well formed objectives
                    if (triumph.objectives) {
                      // console.log(newCatalyst.itemInstanceId+" "+newCatalyst.name);
                      triumph.objectives.forEach(objective => {
                        const newObjective: Objective = {
                          objectiveHash: objective.objectiveHash,
                          completionValue: objective.completionValue,
                          complete: objective.complete,
                          progress: objective.progress,
                          item: objective.item,
                          timeTillFinished: Number.MAX_SAFE_INTEGER
                        };
                        newTriumph.objectives.push(newObjective);


                        // add running objective
                        if (currentTimeObjective[char.characterId] &&
                          currentTimeObjective[char.characterId][objective.objectiveHash] &&
                          currentTimeObjective[char.characterId][objective.objectiveHash].pursuitId === newTriumph.itemInstanceId) {
                          newObjective.runningTimeObjective = currentTimeObjective[char.characterId][objective.objectiveHash];
                          newObjective.runningTimeObjective.timeStart = new Date(newObjective.runningTimeObjective.timeStart);
                          newObjective.runningTimeObjective.timeRunning = (new Date().getTime() - newObjective.runningTimeObjective.timeStart.getTime());

                        }


                      });
                    }

                    // Add pseudo reward
                    if (triumph.scoreValue) {
                      const newReward: Reward = {
                        name: 'Triumph points',
                        icon: triumph.parentIcon,
                        quantity: triumph.scoreValue,
                        identifier: '',
                        identifierIcon: '',
                        redeemed: false,
                        earned: false,
                        objectivesSize: newTriumph.objectives.length,
                        itemHash: Reward.TRIUMPH_POINT_PSEUDO_HASH
                      };


                      newTriumph.rewards.push(newReward);

                    }


                    // console.log(catalyst);
                  }
                });
            }

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

        // console.log(checklist);
        this.foundList = [];
        ChecklistComponent.updateObject(checklist, this.checklist);
        console.log(this.checklist);


      }
    );
    this._checklistService.startLoadingChecklist();

    this._currentConfigSubscription = this._headerService.configObservable().subscribe(
      rel => {
        if (this.oldLanguage !== rel.language) {
          this.config = rel;
          this._checklistService.refreshChecklist(this._checklistService, true);
          this.oldLanguage = rel.language;
        }
        this.config = rel;
        // console.log(rel);

        this.checklist.characters.forEach(char => {
          setTimeout(() => {
            this.sortPursuits(char);
          }, 500);
        });

      });

    this._headerService.setSearchShown(true);
    this._currentSearchSubscription = this._headerService.searchObservable().subscribe(
      search => {
        if (this.search !== search.searchText) {
          this.foundList = [];
        }

        this.search = search.searchText;

        if (search.searchText.length >= this.SEARCH_MIN_LENGTH) {
          if (this.searchTimout) {
            clearTimeout(this.searchTimout);
          }
          this.searchTimout = setTimeout(() => {
            this.searchTimout = undefined;
            if (this.foundList.length !== 0) {
              const key = this.foundList[search.foundCurrent % this.foundList.length];

              const charNum = Math.floor(key / this.PURSUIT_KEY_MULTIPLIER);
              const pursuitNum = key - charNum * this.PURSUIT_KEY_MULTIPLIER;

              if (charNum !== this.selectedTab) {
                this.selectedTab = charNum;
              }
              this.searchedId = charNum + '-' + pursuitNum;
              // console.log(this.searchedId);

              setTimeout(() => {
                const el = document.getElementById('pursuit-' + this.searchedId);

                if (el) {
                  el.scrollIntoView({behavior: 'smooth'});
                } else {
                  console.log('not found el : ' + charNum + '-' + pursuitNum);
                  console.log(search);
                }
              });
            }
          }, 100);
        }

      }
    );

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
    char.pursuits.sort((p1: Pursuit, p2: Pursuit) => {
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

        let triumphCompare = 0;
        if ((p1.type === PursuitType.TRIUMPH) && (p2.type === PursuitType.TRIUMPH)) {
          triumphCompare = triumphCompare + (t1 / Math.max(1, +(p1.rewards.length > 0 ? p1.rewards[0].quantity : 0)));
          triumphCompare = triumphCompare - (t2 / Math.max(1, +(p2.rewards.length > 0 ? p2.rewards[0].quantity : 0)));
        }

        const rewardsCompared = Reward.compareRewards(r1, r2);

        if (selectedCompare !== 0) {
          return selectedCompare;
        } else if (catalystCompare !== 0) {
          return catalystCompare;
        } else if (rewardsCompared !== 0) {
          return rewardsCompared;
        } else if (triumphCompare !== 0) {
          return triumphCompare;
        } else if (t1 === t2) {
          return p2.name.localeCompare(p1.name);
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
    if (this._currentSearchSubscription) {
      this._currentSearchSubscription.unsubscribe();
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

    if (this.swipeRunning === -1) {

      this._checklistService.stopObjective(objective, characterId, pursuitId)
          .then(obj => {

            if (obj.runningTimeObjective) {
              obj.runningTimeObjective.timeStart = new Date(obj.runningTimeObjective.timeStart);
            }
            ChecklistComponent.updateObject(obj, objective);
          });
    }
  }

  launchObjectiveTime (objective: Objective, characterId: string, characterName: string, pursuitId: string, pursuitName: string, event: any) {
    // console.log('launchObjectiveTime');
    event.stopPropagation();

    if (this.swipeRunning === -1) {

      this._checklistService.startObjective(objective, characterId, characterName, pursuitId, pursuitName)
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
    // console.log(pursuit);

    let char = character.characterId;
    if (pursuit.itemType === Pursuit.ITEM_TYPE_TRIUMPH) {
      char = 'All';
    }

    if (pursuit.questlineItemHash) {
      return char + ' ' + pursuit.questlineItemHash;
    } else {
      return char + ' ' + pursuit.itemInstanceId;
    }
  }

  toggleSelectedPursuit (pursuit, character, event: any) {
    // console.log(`toggleSelectedPursuit (${this.swipeRunning})`);
    event.stopPropagation();
    if (this.swipeRunning === -1) {
      this._headerService.toggleSelectedPursuit(ChecklistComponent.getPursuitKey(pursuit, character));
      // console.log(pursuit);
    }
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
        case Reward.VALUE_TRIUMPH:
          checkedRewards = true;
          ret = ret || this.config.visible.rewards.triumphs;
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
        case Pursuit.ITEM_TYPE_CONSUMABLE: // Consumable (ballistic logs, ...)
          checkedType = true;
          ret = ret || this.config.visible.types.quest_step;
          break;
        case Pursuit.ITEM_TYPE_CATALYST:
          checkedType = true;
          ret = ret || this.config.visible.types.catalyst;
          break;
        case Pursuit.ITEM_TYPE_TRIUMPH:
          checkedType = true;
          ret = ret || this.config.visible.types.triumph;
          break;
        case Pursuit.ITEM_TYPE_TRIUMPH_REDEEMABLE:
          checkedType = true;
          ret = ret || this.config.visible.types.triumphRedeemable;
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
            case 'Rare Bounty':
            case 'Contrat spécial':
              checkedType = true;
              ret = ret || this.config.visible.types.forge;
              break;
            case 'Prime Daily Bounty':
            case 'Contrat du jour (Gambit Prestige)':
            case 'Prime Weekly Bounty':
            case 'Contrat de la semaine (Gambit Prestige)':
            case 'Prime "Civic Duty" Bounty':
            case 'Contrat citoyen':
              checkedType = true;
              ret = ret || this.config.visible.types.prime_gambit;
              break;
            case 'Pursuits':
            case 'Poursuites':
            case 'Ship Schematics':
            case 'Schémas de vaisseau':
            case 'Invitation of the Nine':
            case 'Invitation des Neuf':
            case 'Récipient':
            case 'Alien Technology':
            case 'Technologie extraterrestre':
            case 'Container':
            case 'Boîte':
              checkedType = true;
              ret = ret || this.config.visible.types.pursuit;
              break;
            case 'Weekly Drifter Bounty':
            case 'Contrats de la semaine du Vagabond':
            case 'Weekly Clan Bounties':
            case 'Contrats de clan de la semaine':
              checkedType = true;
              ret = ret || this.config.visible.types.owned_bounty;
              break;
          }
      }
    }

    if (!checkedType) {
      if (!ChecklistComponent.notCheckedType[pursuit.itemTypeDisplayName]) {
        console.log('not checked type : ' + pursuit.itemType + ' "' + pursuit.itemTypeDisplayName + '"');
        console.log(pursuit);
        ChecklistComponent.notCheckedType[pursuit.itemTypeDisplayName] = pursuit;
      }
      ret = ret || this.config.visible.types.pursuit;
    }


    return ret;
  }

  static notCheckedType = {};

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

  getObjectiveProgress (objective) {
    return 100 * Math.min(1.0, objective.progress / objective.completionValue);
  }

  highlight (string, charNum, pursuitNum): string {
    if (!this.search || (this.search.length < this.SEARCH_MIN_LENGTH)) {
      return string;
    }
    return string.replace(new RegExp(this.search, 'gi'), match => {
      const key = charNum * this.PURSUIT_KEY_MULTIPLIER + pursuitNum;
      if (this.foundList.indexOf(key) === -1) {
        this.foundList.push(key);
        this.foundList.sort((n1, n2) => {
          return n1 - n2;
        });
        // console.log('this.foundList.length ' + this.foundList.length);
        this._headerService.setSearchFoundCount(this.foundList.length);
      }
      return '<span class="highlight-text">' + match + '</span>';
    });
  }

  swipe(event) {
    console.log(`swipe : ${event.type} ${this.selectedTab}`);
    console.log(event);

    if ((event.type === 'swiperight') && (this.selectedTab !== 0)) {
      // console.log(this.selectedTab);
      this.selectedTab--;
    }
    if ((event.type === 'swipeleft') && (this.selectedTab !== this.checklist.characters.length - 1)) {
      // console.log(this.selectedTab);
      this.selectedTab++;
    }
    // console.log(this.selectedTab);
    this.cd.detectChanges();
    this.swipeRunning = this.selectedTab;
    setTimeout(() => {
      this.swipeRunning = -1;
    }, 100);
  }
  swipeRunning = -1;
  selectedIndexChange(event) {
    // console.log(`selectedIndexChange : ${event} (${this.swipeRunning})`);
    // console.log(this.selectedTab);
    this.selectedTab = event;
    this.cd.detectChanges();

    if ((this.swipeRunning !== -1) && (this.swipeRunning !== event)) {
      this.selectedTab = this.swipeRunning;
      this.cd.detectChanges();
    }

    // console.log(this.selectedTab);
  }
}

