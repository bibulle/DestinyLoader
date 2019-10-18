/* tslint:disable:member-ordering */
import {AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, NgModule, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Subscription} from 'rxjs';
import {ChecklistService} from '../../services/checklist.service';
import {catalystState, Character, Checklist, Objective, ObjectiveTime, Pursuit, PursuitType, Reward, Tag} from '../../models/checklist';
import {Config, SearchStyle} from '../../models/config';
import {HeaderService, ReloadingKey} from '../../services/header.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {MatCardModule, MatCheckboxModule, MatIconModule, MatTabsModule} from '@angular/material';
import {CommonModule} from '@angular/common';
import {TimeExpirationModule} from '../../pipes/time-expiration.pipe';
import {FormsModule} from '@angular/forms';
import {PursuitModule} from './pursuit/pursuit.component';
import {UtilService} from '../../services/util.service';
import Timer = NodeJS.Timer;

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss']
})
export class ChecklistComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('page', {static: false})
  tableElement: ElementRef;

  checklist: Checklist = new Checklist();
  private _currentChecklistSubscription: Subscription;

  config: Config = new Config();
  private _currentConfigSubscription: Subscription;
  oldLanguage = '';

  searchText = '';
  private searchStyle = SearchStyle.SEARCH;
  foundList: number[] = [];
  searchTimout: Timer;
  private _currentSearchSubscription: Subscription;

  selectedTab = 0;
  searchedId = '';

  swipeRunning = -1;


  constructor(private _checklistService: ChecklistService,
              private _translateService: TranslateService,
              private _headerService: HeaderService,
              private _utilService: UtilService,
              private elRef: ElementRef,
              private cd: ChangeDetectorRef) {
  }

  private static PURSUIT_HASH = '1345459588';


  private SEARCH_MIN_LENGTH = 3;

  private PURSUIT_KEY_MULTIPLIER = 1000000000;

  ngOnInit() {


    this._currentChecklistSubscription = this._checklistService.currentChecklistObservable().subscribe(
      (checklist: Checklist) => {

        checklist = checklist as Checklist;

        // console.log(checklist);
        // if (checklist.characters) {
        //  checklist.characters = [checklist.characters[0]];
        // }

        // characters
        //  emblemBackgroundPath
        //  genderedClassNames
        //  genderedRaceNames
        //  light
        //  pursuits
        //  characterId

        // If we have things to show
        if (checklist && checklist.items && checklist.items[ChecklistComponent.PURSUIT_HASH] && checklist.characters && checklist.times && checklist.currentTimes) {

          // create by user and by objective objective time array
          const currentTimeObjective: { [characterId: string]: { [objectiId: string]: ObjectiveTime } } = {};

          checklist.currentTimes.forEach(ot => {
            if (!currentTimeObjective[ot.characterId]) {
              currentTimeObjective[ot.characterId] = {};
            }
            currentTimeObjective[ot.characterId][ot.objectiveId] = ot;
            // console.log(ot.objectiveId);
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
            char.charNum = charIndex - 1;

            // foreach pursuit type
            Object.keys(checklist.items[ChecklistComponent.PURSUIT_HASH]).forEach(key => {
              // foreach pursuit, add to the character pursuits
              checklist.items[ChecklistComponent.PURSUIT_HASH][key].forEach(pursuit => {
                if (pursuit.characterId === char.characterId) {
                  pursuit.type = PursuitType.PURSUIT;
                  char.pursuits.push(pursuit);
                }

              });


            });

            // foreach milestone
            (char.milestones ? char.milestones : []).forEach(milestone => {

              // remove classified milestone
              if (milestone.milestoneName === 'Classified') {
                return;
              }

              // else create the object
              const newMilestone: Pursuit = {
                itemInstanceId: milestone.instanceId,
                pursuitNum: 0,
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
                type: PursuitType.MILESTONE,
                tags: [],
                questlineItemHash: null
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

              char.pursuits.push(newMilestone);
            });

            const progressionNames = [];
            // foreach progression
            (char.progressions ? char.progressions : []).forEach(progression => {

              // remove classified or unknown progression
              if ((progression.progressionName === 'Classified') ||
                (progression.progressionName === 'Unknown name') ||
                (!progression.icon) ||
                (progression.icon.match(/missing_icon/))) {
                return;
              }

              if (progressionNames.indexOf(progression.progressionName) > -1) {
                return;
              }
              progressionNames.push(progression.progressionName);

              // else create the object
              const newProgression: Pursuit = {
                itemInstanceId: progression.instanceId,
                pursuitNum: 0,
                itemType: Pursuit.ITEM_TYPE_PROGRESSION,
                itemTypeDisplayName: 'Progression',
                description: progression.description,
                name: progression.progressionName,
                icon: progression.icon,
                expirationDate: undefined,
                rewards: [],
                maxRewardLevel: -2,
                objectives: [],
                vendorName: undefined,
                saleDescription: undefined,
                type: PursuitType.PROGRESSION,
                tags: [],
                questlineItemHash: null
              };

              // add well formed objectives
              progression.objectives.forEach(objective => {
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
                newProgression.objectives.push(newObjective);
              });

              char.pursuits.push(newProgression);
            });

            // add character triumph
            if (char.triumphs) {
              char.triumphs.forEach(
                triumph => {
                  // console.log(triumph);
                  // if it's a root item (badges), do nothing (they cannot be redeemed)
                  if ((triumph.state === 0) && (triumph.item.presentationInfo.parentPresentationNodeHashes.length === 0)) {
                    return;
                  }

                  // If not already redeemed, add it
                  // tslint:disable-next-line:no-bitwise
                  if ((triumph.state & 1) === 0) {
                    const newTriumph: Pursuit = {
                      itemInstanceId: triumph.hash,
                      pursuitNum: 0,
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
                      type: (triumph.state === 0 ? PursuitType.TRIUMPH_REDEEMABLE : PursuitType.TRIUMPH),
                      tags: [],
                      questlineItemHash: null
                    };

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
                          currentTimeObjective[char.characterId][objective.objectiveHash].pursuitId === (newTriumph.itemInstanceId || 'HardCoded')) {
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

                }
              );
            }

            // foreach item with objectives
            (checklist.itemWithObjectives[char.characterId] ? checklist.itemWithObjectives[char.characterId] : []).forEach(item => {

              // else create the object
              const newProgression: Pursuit = {
                itemInstanceId: item.itemInstanceId,
                pursuitNum: 0,
                itemType: item.item.itemType,
                itemTypeDisplayName: 'Item',
                description: item.item.displayProperties.description,
                name: item.itemName,
                icon: item.item.displayProperties.icon,
                expirationDate: undefined,
                rewards: [],
                maxRewardLevel: -2,
                objectives: [],
                vendorName: undefined,
                saleDescription: undefined,
                type: PursuitType.ITEM,
                tags: [],
                questlineItemHash: null
              };


              // add well formed objectives
              item.objective.objectives.forEach(objective => {
                const newObjective: Objective = {
                    objectiveHash: objective.objectiveHash,
                    completionValue: objective.completionValue,
                    complete: objective.complete,
                    progress: objective.progress,
                    item: {
                      progressDescription: objective.item.progressDescription
                    },
                    timeTillFinished: Number.MAX_SAFE_INTEGER
                  }
                ;
                newProgression.objectives.push(newObjective);
              });

              char.pursuits.push(newProgression);
            });

            // add catalyst and triumph (to the first character)
            if (charIndex === 1) {
              (checklist.catalysts ? checklist.catalysts : []).forEach(
                catalyst => {
                  if ((catalyst.state === catalystState.DROPPED) || (catalyst.state === catalystState.TO_BE_COMPLETED)) {
                    const newCatalyst: Pursuit = {
                      itemInstanceId: catalyst.inventoryItem.itemInstanceId,
                      pursuitNum: 0,
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
                      type: PursuitType.CATALYST,
                      tags: [],
                      questlineItemHash: null
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
                          currentTimeObjective[char.characterId][objective.objectiveHash].pursuitId === (newCatalyst.itemInstanceId || 'HardCoded')) {
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
              (checklist.triumphs ? checklist.triumphs : []).forEach(
                triumph => {

                  // if it's a root item (badges), do nothing (they cannot be redeemed)
                  if ((triumph.state === 0) && (triumph.item.presentationInfo.parentPresentationNodeHashes.length === 0)) {
                    return;
                  }

                  // If not already redeemed, add it
                  // tslint:disable-next-line:no-bitwise
                  if ((triumph.state & 1) === 0) {
                    const newTriumph: Pursuit = {
                      itemInstanceId: triumph.hash,
                      pursuitNum: 0,
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
                      type: (triumph.state === 0 ? PursuitType.TRIUMPH_REDEEMABLE : PursuitType.TRIUMPH),
                      tags: [],
                      questlineItemHash: null
                    };

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
                          currentTimeObjective[char.characterId][objective.objectiveHash].pursuitId === (newTriumph.itemInstanceId || 'HardCoded')) {
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
                  currentTimeObjective[char.characterId][objective.objectiveHash].pursuitId === (pursuit.itemInstanceId || 'HardCoded')) {
                  objective.runningTimeObjective = currentTimeObjective[char.characterId][objective.objectiveHash];
                  objective.runningTimeObjective.timeStart = new Date(objective.runningTimeObjective.timeStart);
                  objective.runningTimeObjective.timeRunning = (new Date().getTime() - objective.runningTimeObjective.timeStart.getTime());

                }
              });
            });

            // add purchasable bounties
            Object.keys((checklist.vendors ? checklist.vendors : {})).forEach(
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
                                pursuitNum: 0,
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
                                type: PursuitType.SALE,
                                tags: [],
                                questlineItemHash: null
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

            // add the pursuit index and the tags
            char.pursuits.forEach((p, index) => {
              p.pursuitNum = index;

              if (p.questlineItemHash && checklist.tags[p.questlineItemHash]) {
                p.tags = checklist.tags[p.questlineItemHash];
              } else {
                p.tags = checklist.tags[p.itemInstanceId];
              }

            });

            // Clean the characters
            delete char.baseCharacterLevel;
            delete char.checklists;
            delete char['classHash'];
            delete char['classType'];
            delete char['emblemColor'];
            delete char['emblemHash'];
            delete char['emblemPath'];
            delete char['genderHash'];
            delete char['genderType'];
            delete char['levelProgression'];
            delete char['milestones'];
            delete char['progressions'];
            delete char['minutesPlayedThisSession'];
            delete char['minutesPlayedTotal'];
            delete char['percentToNextLevel'];
            delete char['raceHash'];
            delete char['raceType'];
            delete char['stats'];
            delete char['titleRecordHash'];
            delete char['triumphs'];


          });

          // Clean the checklist
          delete checklist.catalysts;
          delete checklist.items;
          delete checklist.triumphs;
          delete checklist.vendors;
          delete checklist['checklists'];
          delete checklist['messages'];
          delete checklist['objectives'];
          delete checklist['pursuitsName'];
          delete checklist.characters['times'];
          delete checklist.itemWithObjectives;

          ChecklistService.saveChecklistFromLocalStorage(checklist);
        }

        // clean the selected pursuit list
        if (this.config.selectedPursuits && checklist && checklist.characters) {
          const listOfPursuitsKey = [];
          checklist.characters.forEach(char => {
            char.pursuits.forEach(pursuit => {
              listOfPursuitsKey.push(ChecklistComponent.getPursuitKey(pursuit, char));
            });
          });
          this.config.selectedPursuits = this.config.selectedPursuits.filter(key => {
            return (listOfPursuitsKey.indexOf(key) > -1);
          });
        }


        // console.log(checklist);
        // this.foundList = [];
        UtilService.updateObject(checklist, this.checklist);
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

        if (this.checklist && this.checklist.characters) {
          this.checklist.characters.forEach(char => {
            setTimeout(() => {
              this.sortPursuits(char);
            }, 500);
          });
        }

      });

    this._headerService.setSearchShown(true);
    this._currentSearchSubscription = this._headerService.searchObservable().subscribe(
      search => {
        if (this.searchText !== search.searchText) {
          this.foundList = [];
          this.searchText = search.searchText;
        }
        // console.log(this.searchText + ' ' + search.searchText);

        this.searchStyle = search.style;

        if (search.searchText.length >= this.SEARCH_MIN_LENGTH) {
          if (this.searchTimout) {
            clearTimeout(this.searchTimout);
          }
          this.searchTimout = setTimeout(() => {
            this.searchTimout = undefined;
            // console.log(this.foundList);
            if (this.foundList.length !== 0) {
              const key = this.foundList[search.foundCurrent % this.foundList.length];


              const {charNum, pursuitNum} = this.getFromPursuitKey(key);

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

  refreshRunningTimes() {
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

  sortPursuits(char) {
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

  ngOnDestroy(): void {
    this._headerService.stopReloading(ReloadingKey.Checklist);
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

  ngAfterViewChecked() {
    this.initPositionsStickyHeaders();
    this.calcPositionsStickyHeaders();
  }


  private topPage = 0;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.initPositionsStickyHeaders();

  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    this.calcPositionsStickyHeaders();

  }

  private initPositionsStickyHeaders() {
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

  private calcPositionsStickyHeaders() {


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


  // toggleShowOnlyPowerfulGear (event: any) {
  //   event.stopPropagation();
  //   this._headerService.toggleShowOnlyPowerfulGear();
  // }


  static getPursuitKey(pursuit, character) {
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

  toggleSelectedPursuit(pursuit, character, event: any) {
    // console.log(`toggleSelectedPursuit (${this.swipeRunning})`);
    event.stopPropagation();
    if (this.swipeRunning === -1) {
      this._headerService.toggleSelectedPursuit(ChecklistComponent.getPursuitKey(pursuit, character));
      // console.log(pursuit);
    }
  }

  pursuitIsSelected(pursuit, character) {
    return this.config.selectedPursuits && (this.config.selectedPursuits.indexOf(ChecklistComponent.getPursuitKey(pursuit, character)) > -1);
  }

  pursuitShouldBeDisplayed(character: Character, pursuit: Pursuit) {

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
        case Pursuit.ITEM_TYPE_PROGRESSION:
          checkedType = true;
          ret = ret || this.config.visible.types.progression;
          break;
        case Pursuit.ITEM_TYPE_ARMOR:
        case Pursuit.ITEM_TYPE_WEAPON:
          checkedType = true;
          ret = ret || this.config.visible.types.item;
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
              ret = ret || this.config.visible.types.owned_bounty;
              break;
            case 'Prime Daily Bounty':
            case 'Contrat du jour (Gambit Prestige)':
            case 'Prime Weekly Bounty':
            case 'Contrat de la semaine (Gambit Prestige)':
            case 'Prime "Civic Duty" Bounty':
            case 'Contrat citoyen':
              checkedType = true;
              ret = ret || this.config.visible.types.owned_bounty;
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


    if (ret && (this.searchStyle === SearchStyle.FILTER)) {

      let match = false;

      // if (pursuit.name.startsWith('Trésor')) {
      //   console.log(pursuit.name + ' ' + match + ' ' + (pursuit.name.match(this.search) !== null));
      // }
      match = match || (this.foundList.indexOf(this.getPursuitKey(character.charNum, pursuit.pursuitNum)) !== -1);

      ret = match;
    }

    if (ret) {
      // check for tags
      if (this.config.selectedTags.length === 0) {
        return (!pursuit.tags || pursuit.tags.length === 0);
      } else if (!pursuit.tags) {
        return false;
      } else {
        const intersectArray: string[] = pursuit.tags.filter(t => (this.config.selectedTags.indexOf(t) > -1));
        return (intersectArray.length !== 0);
      }


    }

    return ret;
  }

  static notCheckedType = {};

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

  pursuitMatchSearch(charNum, pursuitNum) {
    // console.log(charNum+" "+pursuitNum);
    const key = this.getPursuitKey(charNum, pursuitNum);
    if (this.foundList.indexOf(key) === -1) {
      this.foundList.push(key);
      this.foundList.sort((n1, n2) => {
        return n1 - n2;
      });
      // console.log('this.foundList.length ' + this.foundList.length);
      this._headerService.setSearchFoundCount(this.foundList.length);
    }

  }

  getPursuitKey(charNum: number, pursuitNum: number): number {
    return charNum * this.PURSUIT_KEY_MULTIPLIER + pursuitNum;
  }

  getFromPursuitKey(pursuitKey: number): { charNum: number, pursuitNum: number } {
    const charNum = Math.floor(pursuitKey / this.PURSUIT_KEY_MULTIPLIER);
    const pursuitNum = pursuitKey - charNum * this.PURSUIT_KEY_MULTIPLIER;

    return {charNum, pursuitNum};
  }

  /**
   * An objective time has been launched... add it to local list (before reloading)
   * @param objectiveTime
   */
  objectiveTimeChange(objectiveTime: ObjectiveTime) {
    this.checklist.currentTimes.push(objectiveTime);
  }
}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatTabsModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    TimeExpirationModule,
    PursuitModule
  ],
  declarations: [
    ChecklistComponent
  ],
  providers: [],
  exports: [
    ChecklistComponent
  ]
})
export class ChecklistModule {
}
