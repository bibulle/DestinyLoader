/* tslint:disable:member-ordering */
import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { Graph, GraphTypeKey } from '../../models/graph';
import { Character } from '../../models/character';
import { Stats } from '../../models/stats';
import { TranslateService } from '@ngx-translate/core';
import { HeaderService } from '../../services/header.service';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit, OnDestroy, OnChanges {

  private static TEXT_SPACE = 9;

  @Input()
  characters: Character[] = [];

  @Input()
  graphType = GraphTypeKey.LIGHT;

  @ViewChild('chart')
  private chartContainer: ElementRef;

  private created: boolean;
  private margin = {top: 20, right: 120, bottom: 40, left: 70};
  private width: number;
  private height: number;
  private svg: any;
  private tooltip: any;
//  private xScale: any;
//  private yScale: any;


  // define the colors
  private myD3Category = [
    // "#1b70fc", "#faff16", "#d50527", "#158940", "#f898fd", "#24c9d7", "#cb9b64", "#866888", "#22e67a", "#e509ae", "#9dabfa", "#437e8a", "#b21bff", "#ff7b91", "#94aa05", "#ac5906", "#82a68d", "#fe6616", "#7a7352", "#f9bc0f",
    '#1b70fc', '#d50527', '#158940', '#f898fd', '#24c9d7', '#cb9b64', '#866888', '#22e67a', '#e509ae', '#9dabfa', '#437e8a', '#b21bff', '#ff7b91', '#94aa05', '#ac5906', '#82a68d', '#fe6616', '#7a7352', '#f9bc0f',
    // "#b65d66", "#07a2e6", "#c091ae", "#8a91a7", "#88fc07", "#ea42fe", "#9e8010", "#10b437", "#c281fe", "#f92b75", "#07c99d", "#a946aa", "#bfd544", "#16977e", "#ff6ac8", "#a88178", "#5776a9", "#678007", "#fa9316", "#85c070",
    '#b65d66', '#07a2e6', '#c091ae', '#8a91a7', '#ea42fe', '#9e8010', '#10b437', '#c281fe', '#f92b75', '#07c99d', '#a946aa', '#bfd544', '#16977e', '#ff6ac8', '#a88178', '#5776a9', '#678007', '#fa9316', '#85c070',
    '#6aa2a9', '#989e5d', '#fe9169', '#cd714a', '#6ed014', '#c5639c', '#c23271', '#698ffc', '#678275', '#c5a121', '#a978ba', '#ee534e', '#d24506', '#59c3fa', '#ca7b0a', '#6f7385', '#9a634a', '#48aa6f', '#ad9ad0', '#d7908c',
    '#6a8a53', '#8c46fc', '#8f5ab8', '#fd1105', '#7ea7cf', '#d77cd1', '#a9804b', '#0688b4', '#6a9f3e', '#ee8fba', '#a67389', '#9e8cfe', '#bd443c', '#6d63ff', '#d110d5', '#798cc3', '#df5f83', '#b1b853', '#bb59d8', '#1d960c',
    '#867ba8', '#18acc9', '#25b3a7', '#f3db1d', '#938c6d', '#936a24', '#a964fb', '#92e460', '#a05787', '#9c87a0', '#20c773', '#8b696d', '#78762d', '#e154c6', '#40835f', '#d73656', '#1afd5c', '#c4f546', '#3d88d8', '#bd3896',
    '#1397a3', '#f940a5', '#66aeff', '#d097e7', '#fe6ef9', '#d86507', '#8b900a', '#d47270', '#e8ac48', '#cf7c97', '#cebb11', '#718a90', '#e78139', '#ff7463', '#bea1fd'
  ];


  language = this._translateService.currentLang;
  private readonly _currentConfigSubscription: Subscription;


  needToUpdate = false;

  constructor (private _translateService: TranslateService, private _headerService: HeaderService) {

    this._currentConfigSubscription = this._headerService.configObservable().subscribe(
      rel => {

        // console.log(this.language + ' ' + rel.language);
        if (this.language !== rel.language) {
          this.language = rel.language;
          setTimeout(() => {
            // console.log('refresh chart');
            this.deleteChart();
            this.initChart();
            this.updateChart();
          });
        }

        this.language = rel.language;


      });

  }


  ngOnInit () {
    this.created = false;
    setTimeout(() => {
      // console.log('ngOnInit');
      this.initChart();
      this.updateChart();
    });
  }

  ngOnChanges (changes: SimpleChanges): void {
    // console.log('ngOnChanges');
    // console.log(changes);

    if (changes['characters']) {
      this.updateChart();
    }
  }

  ngOnDestroy (): void {
    if (this._currentConfigSubscription) {
      this._currentConfigSubscription.unsubscribe();
    }
  }


  private deleteChart () {
    const element = this.chartContainer.nativeElement;

    d3.select(element).select('svg').remove();
  }

  private initChart (): void {
    // console.log('initChart');
    const element = this.chartContainer.nativeElement;

    this.width = element.offsetWidth - this.margin.right - this.margin.left;
    this.height = element.offsetHeight - this.margin.top - this.margin.bottom;

    // Create the SVG container
    this.svg = d3.select(element).append('svg')
                 .attr('width', '100%')
                 .attr('height', '100%')
                 .classed('svg-content', true)
                 .append('g')
                 .attr('class', 'all group')
                 .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    // manage locale
    this._getLocaleLabels();
    ChartComponent._defineLocalFormatter(this.language);

    /* create tooltip div */
    this.tooltip = d3.select(element)
                     .append('div')
                     .attr('id', 'tooltip')
                     .attr('class', 'tooltip');

    // define the axis
    this.svg
        .append('g')
        .attr('class', 'x axis');
    this.svg
        .append('g')
        .attr('class', 'y axis')
        .append('text')
        .attr('class', 'y-axis-label');

    // define the clip rect
    this.svg.append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('class', 'clip-rect');

    this.created = true;
//    this.updateChart(this.characters);
  }

  /**
   * Update the chart
   */
  private updateChart (): void {
    if (!this.created) {
      return;
    }
    if (!this.characters || (this.characters.length === 0)) {
      return;
    }
    // console.log('updateChart');

    this.width = this.chartContainer.nativeElement.offsetWidth - this.margin.right - this.margin.left;
    this.height = this.chartContainer.nativeElement.offsetHeight - this.margin.top - this.margin.bottom;

    // Sort data (depending on the curve)
    const that = this;
    this.characters.sort(function (d1, d2) {
      return d3.ascending(that._getYMax(d2.values[d2.values.length - 1]), that._getYMax(d1.values[d1.values.length - 1]));
    });

    // get the global list
    const allData = d3.merge(this.characters.map(function (d) {
      // console.log(d);
      return d.values;
    }));

    // Calculate de date_min
    let dateMin = new Date();
    allData.forEach(function (v: Stats) {
      if ((v.date.getTime() < dateMin.getTime()) && (that._getYMax(v) > Graph.MIN_VALUES[that.graphType])) {
        dateMin = v.date;
      }
    });


    // calculate the scales
    const xScale = d3.scaleTime()
                     .domain([Math.max(dateMin.getTime(), Graph.DATE_MIN[this.graphType].getTime()), new Date()])
                     .range([0, this.width]);
    const yScale = d3.scalePow()
                     .exponent(Graph.POW_VALUES[this.graphType])
                     .domain([Math.max(Graph.MIN_VALUES[this.graphType], d3.min(allData, (d) => this._getYMin(d))), d3.max(allData, (d) => this._getYMax(d))])
                     .range([this.height, 0]);
    const color = d3.scaleOrdinal(this.myD3Category).domain(this.characters.map(function (d) {
      return d.key;
    }));

    // Calculate the x ticks count
    let resultTickValues = xScale.ticks();
    let tempXTickValues = [];

    while (resultTickValues.length > Math.max(2, this.width / 100)) {
      for (let i = (resultTickValues.length + 1) % 2; i <= resultTickValues.length; i += 2) {
        tempXTickValues.push(resultTickValues[i]);
      }
      resultTickValues = tempXTickValues;
      tempXTickValues = [];
    }


    // ---------
    // Draw the axis
    // ---------
    const xAxis = d3.axisBottom(xScale)
                    .tickSizeInner(-this.height)
                    .tickSizeOuter(0)
                    .tickPadding(10)
                    .tickValues(resultTickValues)
                    .tickFormat(ChartComponent._multiFormat);
    const yAxis = d3.axisLeft(yScale)
                    .tickSizeInner(-this.width)
                    .tickSizeOuter(0)
                    .tickPadding(10)
                    .tickValues(Graph.Y_TICK_VALUES[this.graphType]);

    this.svg.selectAll('g.x.axis')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(xAxis);
    this.svg.selectAll('g.y.axis')
        .call(yAxis);

    const yAxisLabel = this.svg.selectAll('.y-axis-label')
                           .attr('transform', 'rotate(-90)')
                           .attr('y', 6)
                           .attr('dy', '.71em')
                           .attr('dx', '-.2em')
                           .style('text-anchor', 'end');

    this._translateService.get(Graph.Y_LABEL[this.graphType])
        .subscribe((text => {
          yAxisLabel.text(text);
        }));

    // ---------
    // create clip path
    // ---------
    this.svg.selectAll('.clip-rect')
        .attr('width', this.width)
        .attr('height', this.height);

    // ---------
    // add path
    // ---------
    const area = d3.area()
                   .curve(d3.curveBasis)
                   .x(function (d) {
                     return xScale(that._getX(d));
                   })
                   .y0(function (d) {
                     return yScale(that._getYMax(d));
                   })
                   .y1(function (d) {
                     return yScale(that._getYMin(d));
                   });

    const areas = this.svg.selectAll('.area')
                      .data(this.characters, function (d) {
                        return d.key;
                      })
                      .attr('d', function (d) {
                        return area(d.values);
                      });
    areas.enter()
         .append('g')
         .attr('clip-path', 'url(#clip)')
         .append('path')
         .attr('class', function (d) {
           // console.log("area K" + d.key + " Char_" + d.charNum);
           return 'area K' + d.key + ' Char_' + d.charNum;
         })
         .attr('d', function (d) {
           return area(d.values);
         })
         .style('stroke', function (d) {
           return color(d.key);
         })
         .style('fill', function (d) {
           return color(d.key);
         })
         .style('opacity', function () {
           return 0.2;
         });

    // ---------
    // add lines
    // ---------
    const line = d3.line()
                   .curve(d3.curveBasis)
                   .x(function (d) {
                     return xScale(that._getX(d));
                   })
                   .y(function (d) {
                     // return (y((getYMax(d)+getYMin(d))/2));
                     return yScale(that._getYMax(d));
                   });

    const lines = this.svg.selectAll('.line')
                      .data(this.characters, function (d) {
                        return d.key;
                      })
                      .attr('d', function (d) {
                        return line(d.values);
                      });
    lines.enter()
         .append('g')
         .attr('clip-path', 'url(#clip)')
         .append('path')
         .attr('class', function (d) {
           return 'line K' + d.key + ' Char_' + d.charNum;
         })
         .attr('d', function (d) {
           return line(d.values);
         })
         .style('stroke', function (d) {
           return color(d.key);
         });

    // ---------
    // add texts
    // ---------
    const textsPositions = [];
    const texts = this.svg.selectAll('.text')
                      .data(this.characters, (d) => {
                        return d.key;
                      })
                      .attr('x', (d) => {
                        return xScale(that._getX(d.values[d.values.length - 1])) + 8;
                      })
                      .attr('y', (d) => {
                        let pos = yScale(Math.max(Graph.MIN_VALUES[that.graphType], that._getYMax(d.values[d.values.length - 1])));

                        if ((that.graphType !== GraphTypeKey.TRIUMPH) || (d.charNum === 1)) {
                          pos = that._checkPosition(pos, textsPositions);
                          textsPositions.push(pos);
                        }

                        return pos;
                      })
                      //                      .attr('transform', (d) => {
                      //                        let pos = yScale(Math.max(Graph.MIN_VALUES[that.graphType], that._getYMax(d.values[d.values.length - 1])));
                      //
                      //                        if ((that.graphType !== GraphTypeKey.TRIUMPH) || (d.charNum === 1)) {
                      //                          pos = that._checkPosition(pos, textsPositions);
                      //                          textsPositions.push(pos);
                      //                        }
                      //                        return 'translate(' + xScale(that._getX(d.values[d.values.length - 1])) + ',' + pos + ')';
                      //                      })
                      //                      .attr('x', 8)
                      .attr('dy', '.35em')
                      .style('font-size', '0.7em')
                      .html((d) => that._getLabel(d));
//    texts.append('svg:title')
//         .text(this._getTitle);

    texts.enter()
         .append('text')
         .attr('class', function (d) {
           // console.log(d);
           return 'text U' + d.userId + ' Char_' + d.charNum;
         })
         .attr('x', (d) => {
           return xScale(that._getX(d.values[d.values.length - 1])) + 8;
         })
         .attr('y', (d) => {
           let pos = yScale(Math.max(Graph.MIN_VALUES[that.graphType], that._getYMax(d.values[d.values.length - 1])));

           if ((that.graphType !== GraphTypeKey.TRIUMPH) || (d.charNum === 1)) {
             pos = that._checkPosition(pos, textsPositions);
             textsPositions.push(pos);
           }

           return pos;
         })
         .attr('dy', '.35em')
         .html((d) => that._getLabel(d))
         .attr('fill', function (d) {
           return color(d.key);
         })
         .on('mouseover', function (d) {
           // console.log('mouseover');
           d3.selectAll('.text.U' + d.userId).classed('mouseover', true);
           d3.selectAll('.line.K' + d.key).classed('mouseover', true);
           d3.selectAll('.area.K' + d.key).classed('mouseover', true);

           that.tooltip.html(that._getTitle(d));
           that.tooltip.transition()
               .duration(50)
               .style('opacity', 0.9)
               .style('z-index', 10);

           let top = (d3.event.srcElement.getBBox().y + d3.event.srcElement.getBBox().height + that.margin.top - 2);
           const maxTop = that.height + that.margin.top + that.margin.bottom - that.tooltip.node().getBoundingClientRect().height;
           if (top > maxTop) {
             top = maxTop;
             // console.log(top);
           }
           that.tooltip.style('top', top + 'px')
               .style('right', (that.margin.right - 6) + 'px');

         })
         .on('mouseout', function (d) {
           // console.log('mouseout');
           d3.selectAll('.text.U' + d.userId).classed('mouseover', false);
           d3.selectAll('.line.K' + d.key).classed('mouseover', false);
           d3.selectAll('.area.K' + d.key).classed('mouseover', false);
           that.tooltip.style('opacity', 0)
               .style('z-index', 0)
               .style('top', (that.height * 2) + 'px');
         });


    // Disable lines
    switch (that.graphType) {
      case GraphTypeKey.TRIUMPH:
        // GraphTypeKey.TIME:
        d3.selectAll('.Char_3').style('display', 'none');
        d3.selectAll('.Char_2').style('display', 'none');
        break;
      default:
        d3.selectAll('.Char_3').style('display', 'inline');
        d3.selectAll('.Char_2').style('display', 'inline');
        break;

    }


  }

  /**
   * Management of the resize event
   * @param $event
   */
  onResize ($event) {
    // console.log('onResize : ' + this.chartContainer.nativeElement.offsetWidth + 'x' + this.chartContainer.nativeElement.offsetHeight);

    this._refreshSize();
  }

  /**
   * Force css size recalculation (ugly lines)
   * @private
   */
  _refreshSize () {

    this.needToUpdate = true;
    setTimeout(() => {
      this.needToUpdate = false;

      this.updateChart();
    });
  }


  // ******************************************
  // Functions to get data
  // ******************************************
  //noinspection JSMethodCanBeStatic
  _getX (d) {
    return d.date;
  }

  _getLabel (d, that = this) {
    switch (that.graphType) {
      case GraphTypeKey.LIGHT:
      case  GraphTypeKey.RATIO:
      default:
        return d.label + ' / ' + this.localLabels[d.class] + d.running;
      // case GraphTypeKey.TIME:
      case GraphTypeKey.TRIUMPH:
        return d.label + d.runningTotal;
    }
  }

  _getYMax (d, that = this) {
    switch (that.graphType) {
      case GraphTypeKey.LIGHT:
      default:
        return d.lightMax;
      case  GraphTypeKey.RATIO:
        return d.allPvPKillsDeathsAssistsRatio;
      // case GraphTypeKey.TIME:
      //      return d.playedRatio;
      case GraphTypeKey.TRIUMPH:
        return d.triumphScore ? d.triumphScore : 0;
    }
  }

  _getYMin (d, that = this) {
    switch (that.graphType) {
      case GraphTypeKey.LIGHT:
      default:
        return d.lightMin;
      case  GraphTypeKey.RATIO:
        return d.allPvPKillsDeathsAssistsRatio;
//    case GraphTypeKey.TIME:
//      return d.playedRatio;
      case GraphTypeKey.TRIUMPH:
        return d.triumphScoreMin ? d.triumphScoreMin : 0;
    }
  }

  _getTitle (d, that = this) {
    // console.log(d.values[d.values.length - 1]);
    let title = '';

    switch (that.graphType) {
      case GraphTypeKey.LIGHT:
      case GraphTypeKey.RATIO:
        title += `<div class="left">`;
        title += `<div class="label">${this.localLabels['name / class']}</div>`;
        title += `<div class="label">${this.localLabels['triumph']}</div>`;
        title += `<div class="label">${this.localLabels['played total']}</div>`;
        title += `<div class="label">${this.localLabels['light']}</div>`;
        title += `<div class="label">${this.localLabels['played']}</div>`;
        title += `<div class="label">${this.localLabels['raid']}</div>`;
        title += `<div class="label">${this.localLabels['nightfall']}</div>`;
        // title += `<div class="label">${this.localLabels['heroic Nightfall']}</div>`;
        title += `<div class="label">${this.localLabels['strike']}</div>`;
        title += `<div class="label">${this.localLabels['black armory']}</div>`;
        // title += `<div class="label">${this.localLabels['Trial of the nine']}</div>`;
        title += `<div class="label">${this.localLabels['PvP']}</div>`;
        title += `<div class="label">${this.localLabels['PvP ratio']}</div>`;
        title += `<div class="label">${this.localLabels['PvP competitive']}</div>`;
        title += `<div class="label">${this.localLabels['gambit']}</div>`;
        title += `</div>`;
        title += `<div class="right">`;
        title += `<div class="value">${d.values[d.values.length - 1].userId + ' / ' + this.localLabels[d.values[d.values.length - 1].class]}</div>`;
        title += `<div class="value">${d3.format('.0f')(d.values[d.values.length - 1].triumphScore)}</div>`;
        title += `<div class="value">${that._niceDate(d.minutePlayedTotalTotal)}</div>`;
        title += `<div class="value">${d3.format('.0f')(d.values[d.values.length - 1].lightMax)}</div>`;
        title += `<div class="value">${that._niceDate(d.values[d.values.length - 1].minutesPlayedTotal)}</div>`;
        title += `<div class="value">${d.values[d.values.length - 1].raidCleared + ' / ' + d.values[d.values.length - 1].raidEntered}</div>`;
        title += `<div class="value">${(d.values[d.values.length - 1].nightfallCleared + d.values[d.values.length - 1].scored_nightfallCleared) + ' / '
        + (d.values[d.values.length - 1].nightfallEntered + d.values[d.values.length - 1].scored_nightfallEntered)}</div>`;
        // title += `<div class="value">${d.values[d.values.length - 1].heroicNightfallCleared + ' / ' + d.values[d.values.length - 1].heroicNightfallEntered}</div>`;
        title += `<div class="value">${d.values[d.values.length - 1].strikeCleared + ' / ' + d.values[d.values.length - 1].strikeEntered}</div>`;
        title += `<div class="value">${d.values[d.values.length - 1].blackArmoryRunCleared + ' / ' + d.values[d.values.length - 1].blackArmoryRunEntered}</div>`;
        // title += `<div class="value">${d.values[d.values.length - 1].trialsOfTheNineWon + ' / ' + d.values[d.values.length - 1].trialsOfTheNineEntered}</div>`;
        title += `<div class="value">${d.values[d.values.length - 1].allPvPWon + ' / ' + d.values[d.values.length - 1].allPvPEntered}</div>`;
        title += `<div class="value">${d.values[d.values.length - 1].allPvPKillsDeathsAssistsRatio.toFixed(2)}</div>`;
        title += `<div class="value">${d.values[d.values.length - 1].pvpCompetitiveWon + ' / ' + d.values[d.values.length - 1].pvpCompetitiveEntered}</div>`;
        title += `<div class="value">${d.values[d.values.length - 1].gambitWon + ' / ' + d.values[d.values.length - 1].gambitEntered}</div>`;
        title += `</div>`;
        break;
//    case GraphTypeKey.TIME:
      case GraphTypeKey.TRIUMPH:
        title += `<div class="left">`;
        title += `<div class="label">${this.localLabels['name']}</div>`;
        title += `<div class="label">${this.localLabels['triumph']}</div>`;
        title += `<div class="label">${this.localLabels['played total']}</div>`;
        title += `</div>`;
        title += `<div class="right">`;
        title += `<div class="value">${d.values[d.values.length - 1].userId}</div>`;
        title += `<div class="value">${d3.format('.0f')(d.values[d.values.length - 1].triumphScore)}</div>`;
        title += `<div class="value">${that._niceDate(d.minutePlayedTotalTotal)}</div>`;
        title += `</div>`;
        break;

    }

    return title;
  }


  /**
   * Function to get nice duration
   */
  _niceDate (minutes) {
    // console.log(minutes);
    if (minutes < 2 * 60) {
      return minutes + ' ' + this.localLabels['minutes'];
    } else if (minutes < 2 * 24 * 60) {
      return d3.format('.2f')(minutes / 60) + ' ' + this.localLabels['hours'];
    } else if (minutes < 2 * 7 * 24 * 60) {
      return d3.format('.2f')(minutes / (24 * 60)) + ' ' + this.localLabels['days'];
    } else if (minutes < 30 * 24 * 60) {
      return d3.format('.2f')(minutes / (7 * 24 * 60)) + ' ' + this.localLabels['weeks'];
    } else {
      return d3.format('.2f')(minutes / (30 * 24 * 60)) + ' ' + this.localLabels['months'];
    }

  }

  /**
   * Function to calculate labels positions
   */
  _checkPosition (pos, textPositions, step?, count?) {
    if (!step) {
      step = 1;
    }
    if (!count) {
      count = 1;
    } else if (count > 800) {
      return 2 * this.height;
    }
    // console.log(count);

    let nextStep = -1 * step;
    if (step < 0) {
      nextStep += 1;
    }
    if (step > 0) {
      nextStep -= 1;
    }
    // console.log(step);
    // console.log(nextStep);

    let ok = true;
    if ((pos > this.height + ChartComponent.TEXT_SPACE) || (pos < -1 * (this.margin.top - ChartComponent.TEXT_SPACE))) {
      ok = false;
    }
    // console.log(pos);
    textPositions.forEach(function (p) {
      if (Math.abs(pos - p) < ChartComponent.TEXT_SPACE) {
        ok = false;
      }
    });

    if (ok) {
      return pos;
    } else {
      return this._checkPosition(pos + step, textPositions, nextStep, count + 1);
    }

  }

  private localLabels = {
    'name': 'name',
    'name / class': 'name / class',
    'triumph': 'triumph',
    'played total': 'played total',
    'light': 'light',
    'played': 'played',
    'raid': 'raid',
    'nightfall': 'nightfall',
    'heroic Nightfall': 'heroic Nightfall',
    'strike': 'strike',
    'black armory': 'black armory',
    'Trial of the nine': 'Trial of the nine',
    'PvP': 'PvP',
    'PvP ratio': 'PvP ratio',
    'PvP competitive': 'PvP competitive',
    'gambit': 'gambit',
    'minutes': 'minutes',
    'hours': 'hours',
    'days': 'days',
    'weeks': 'weeks',
    'months': 'months',
    'T': 'T',
    'H': 'H',
    'W': 'W'
  };

  private _getLocaleLabels () {
    Object.keys(this.localLabels).forEach(key => {
      this._translateService.get(key)
          .subscribe((text => {
            this.localLabels[key] = text;
          }));
    });
  }

  //noinspection TsLint
  private static _getLocaleFormat (loc: string) {
    switch (loc) {
      case 'fr':
        return d3.timeFormatLocale({
          'dateTime': '%a %b %e %X %Y',
          'date': '%m/%d/%Y',
          'time': '%H:%M:%S',
          'periods': ['AM', 'PM'],
          'days': ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
          'shortDays': ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
          'months': ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
          'shortMonths': ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
        });
      case 'en':
      default:
        return d3.timeFormatLocale({
          'dateTime': '%a %b %e %X %Y',
          'date': '%m/%d/%Y',
          'time': '%H:%M:%S',
          'periods': ['AM', 'PM'],
          'days': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          'shortDays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          'months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
          'shortMonths': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        });

    }
  }


  //noinspection TsLint
  private static _defineLocalFormatter (loc: string) {
    const d3Locale = ChartComponent._getLocaleFormat(loc);

    this.formatMillisecond = d3Locale.format('.%L');
    this.formatSecond = d3Locale.format(':%S');
    this.formatMinute = d3Locale.format('%I:%M');
    this.formatHour = d3Locale.format('%I %p');
    this.formatDay = d3Locale.format('%a %d');
    this.formatWeek = d3Locale.format('%b %d');
    this.formatMonth = d3Locale.format('%B');
    this.formatYear = d3Locale.format('%Y');
  }

  //noinspection TsLint
  private static formatMillisecond;
  //noinspection TsLint
  private static formatSecond;
  //noinspection TsLint
  private static formatMinute;
  //noinspection TsLint
  private static formatHour;
  //noinspection TsLint
  private static formatDay;
  //noinspection TsLint
  private static formatWeek;
  //noinspection TsLint
  private static formatMonth;
  //noinspection TsLint
  private static formatYear;


  //noinspection TsLint
  private static _multiFormat (date) {
    return (d3.timeSecond(date) < date ? ChartComponent.formatMillisecond
      : d3.timeMinute(date) < date ? ChartComponent.formatSecond
        : d3.timeHour(date) < date ? ChartComponent.formatMinute
          : d3.timeDay(date) < date ? ChartComponent.formatHour
            : d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? ChartComponent.formatDay : ChartComponent.formatWeek)
              : d3.timeYear(date) < date ? ChartComponent.formatMonth
                : ChartComponent.formatYear)(date);
  }


}



