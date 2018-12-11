/* tslint:disable:member-ordering */
import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { ChecklistService } from '../../services/checklist.service';
import { Character, Checklist, Milestone, Reward } from '../../models/checklist';

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.scss']
})
export class ChecklistComponent implements OnInit {

  checklist: Checklist;

  private _currentChecklistSubscription: Subscription;

  constructor (private _checklistService: ChecklistService) {
  }

  ngOnInit () {


    this._currentChecklistSubscription = this._checklistService.currentChecklistObservable().subscribe(
      checklist => {
        this.checklist = checklist as Checklist;
        // console.log(checklist);

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
                name: milestone.milestoneName,
                icon: milestone.icon,
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
