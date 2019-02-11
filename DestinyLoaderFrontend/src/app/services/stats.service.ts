import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Stats } from '../models/stats';
import { BehaviorSubject ,  Observable } from 'rxjs';
import * as d3 from 'd3';
import { Character } from '../models/character';
import { UserService } from './user.service';
import { HeaderService } from './header.service';

@Injectable({
  providedIn: 'root'
})
export class StatsService {

  private static statsList: Character[];
  // private static statsList: [ {key: string, values: Stats[]} ];
  private static REFRESH_EVERY = 60 * 1000;

  private static _refreshIsRunning = false;
  private readonly currentStatsSubject: BehaviorSubject<Character[]>;

  private booksUrl = environment.serverUrl + 'api1';

  constructor (private httpClient: HttpClient,
               private _userService: UserService,
               private _headerService: HeaderService) {
    this.currentStatsSubject = new BehaviorSubject<Character[]>([]);

  }

  /**
   * Refresh characters every...
   * @private
   */
  static _refreshStats (_service: StatsService) {
    if (_service.currentStatsSubject.observers.length > 0) {
      StatsService._refreshIsRunning = true;
      _service._loadStats()
              .then(stats => {
                // console.log('currentStatsSubject.next ' + stats.length);
                _service.currentStatsSubject.next(stats);

                setTimeout(() => {
                    this._refreshStats(_service);
                  }, StatsService.REFRESH_EVERY
                )
                ;
              })
              .catch((reason) => {
                console.log(reason);
                setTimeout(() => {
                    this._refreshStats(_service);
                  }, StatsService.REFRESH_EVERY
                );
              });
    } else {
      StatsService._refreshIsRunning = false;
    }
  }

  /**
   * Initialize the loading of stats
   */
  startLoadingStats () {
    if (!StatsService._refreshIsRunning) {
      StatsService._refreshStats(this);
    }
  }

  /**
   * load the characters list
   */
  private _loadStats (): Promise<Character[]> {
    // console.log('_loadStats ');

    this._headerService.startReloading();
    return new Promise<Character[]>((resolve, reject) => {
      this.httpClient.get(this.booksUrl)
      // .map((res: Response) => res.json().data as Book[])
          .subscribe(
            (data: Object) => {
              // console.log(data);

              // is the token refreshed ?
              if (data['refreshedToken']) {
                UserService.tokenSetter(data['refreshedToken']);
                this._userService.checkAuthent();
              }

              const stats = data['data'] as Stats[];

              stats.forEach(function (v) {
                v.date = new Date(v.date);
                v.userId = v.userId.replace(/#[0-9]*$/, '');
              });


              StatsService.statsList = d3.nest()
                                         .key(function (v: Stats) {
                                           return v.id;
                                         })
                                         // .sortKeys(d3.ascending)
                                         .entries(stats) as Character[];

              const charCounter = [];
              const isOnLine = [];
              const minutePlayedTotalTotal: number[] = [];
              const minutePlayed = [];
              StatsService.statsList.forEach(function (d) {
                // Calculate the labels
                d.userId = d.values[d.values.length - 1].userId;
                d.labelClass = d.values[d.values.length - 1].userId + ' / ' + d.values[d.values.length - 1].class + '';
                d.label = d.userId;

                if (d.values[d.values.length - 1].isOnLine == null) {
                  try {
                    if (d.values[d.values.length - 2].minutesPlayedTotal !== d.values[d.values.length - 1].minutesPlayedTotal) {
                      d.values[d.values.length - 1].isOnLine = true;
                    }
                  } catch (e) {
                  }
                }
                if (d.values[d.values.length - 1].isOnLine) {
                  d.labelClass = d.labelClass + ' &bull;';
                  isOnLine[d.userId] = true;
                }

                // calculate the total played time
                if (!minutePlayedTotalTotal[d.userId]) {
                  minutePlayedTotalTotal[d.userId] = 0;
                }
                //noinspection PointlessArithmeticExpressionJS
                minutePlayedTotalTotal[d.userId] += 1.0 * d.values[d.values.length - 1].minutesPlayedTotal;
                // console.log(d.userId + ' ' + minutePlayedTotalTotal[d.userId]);

                // Calc the char num
                if (charCounter[d.userId]) {
                  charCounter[d.userId]++;
                } else {
                  charCounter[d.userId] = 1;
                }
                d.charNum = charCounter[d.userId];
                // console.log(d.userId+" "+d.charNum);

                // Calculate the played time
                d.values.forEach(function (v) {

                  // calculate the played time per user (not character)
                  if (!minutePlayed[d.userId]) {
                    minutePlayed[d.userId] = [];
                  }
                  if (!minutePlayed[d.userId][v.date.getTime()]) {
                    minutePlayed[d.userId][v.date.getTime()] = 0;
                  }
                  minutePlayed[d.userId][v.date.getTime()] += v.minutesPlayedTotal;
                });
              });

              // Calculate the sums (for the time played for example)
              StatsService.statsList.forEach(function (d) {
                if (isOnLine[d.userId]) {
                  d.isOnLine = true;
                  d.label = d.label + ' &bull;';
                } else {
                  d.isOnLine = false;
                }

                d.minutePlayedTotalTotal = minutePlayedTotalTotal[d.userId];
                // console.log(d.userId+" "+d.minutePlayedTotalTotal);

                // Calculate the played percentage
                const prevDate = [];
                const prevVal = [];
                d.values.forEach(function (v) {
                  if (minutePlayed[d.userId][v.date.getTime()]) {
                    v.minutePlayedTotalTotal = minutePlayed[d.userId][v.date.getTime()];

                    v.playedRatio = 0;
                    if ((prevDate.length !== 0) && (prevVal.length !== 0)) {
                      const deltaTime = (v.date.getTime() - prevDate[0]) / (60 * 1000);
                      if (deltaTime !== 0) {
                        v.playedRatio = (v.minutePlayedTotalTotal - prevVal[0]) / deltaTime;
                        // if (v.playedRatio > 1) {
                        //  v.playedRatio = 1;
                        // }
                      }
                    }
                    prevDate.push(v.date);
                    prevVal.push(v.minutePlayedTotalTotal);
                    while (prevDate.length > 20) {
                      prevDate.shift();
                      prevVal.shift();
                    }
                  }

                });

              });

//              // Calculate de date_min
//              var savedGraphType = graphType;
//              for (var i = 0; i < GRAPHTYPE_length; i++) {
//                graphType = i;
//                var dateMin = new Date();
//
//                d.forEach(function (v) {
//                  if ((v.date.getTime() < dateMin.getTime()) && (getYMax(v) > MIN_VALUES[i])) {
//                    dateMin = v.date;
//                    //console.log(i + " " + MIN_VALUES[i] + " " + v.userId + " " + v.date);
//                  }
//                });
//                DATE_MIN[i] = dateMin;
//              }
//              graphType = savedGraphType;


              this._headerService.stopReloading();
              resolve(StatsService.statsList);
            },
            err => {
              this._headerService.stopReloading();
              reject(err);
            },
          );
    });
  }

  //noinspection JSUnusedGlobalSymbols
  /**
   * Get the characters list
   */
  getCharacters (): Promise<Character[]> {
    // console.log('_loadStats ');

    if (StatsService.statsList) {
      return new Promise<Character[]>((resolve) => {
        resolve(StatsService.statsList);
      });
    } else {
      return this._loadStats();
    }
  }

  /**
   * Subscribe to know if current course changes
   */
  currentStatsObservable (): Observable<Character[]> {
    return this.currentStatsSubject;
  }

}
