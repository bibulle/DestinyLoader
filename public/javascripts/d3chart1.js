// the data
var data = {};
var svg;

var graphType_LIGHT = "LIGHT";
var graphType_RATIO = "RATIO";

// const
var MIN_LIGHT = 0;
var DATE_MIN = new Date(2017, 1, 1);
var Y_TICK_VALUES_LIGHT = [260, 280, 290, 300, 310, 320 , 330 , 340, 350, 360, 370, 380, 385];
//var Y_TICK_VALUES_RATIO = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
var Y_TICK_VALUES_RATIO = null;
var POW_LIGHT = 3;
var POW_RATIO = 1;

var pow = POW_LIGHT;
var YTickValues = Y_TICK_VALUES_LIGHT;
var graphType = graphType_LIGHT;

//var RELOAD_EVERY = 20 * 1000;
var RELOAD_EVERY = 10 * 60 * 1000;
var TEXT_SPACE = 9;

var loadData = function () {
  createChart();
  d3.json("api1", function (d) {

    var dateMin = new Date();

    d.forEach(function (v) {
      v.date = new Date(v.date);
      v.userId = v.userId.replace(/#[0-9]*$/,"");

      if ((v.date.getTime() < dateMin.getTime()) && (v.lightMax > MIN_LIGHT - 10)) {
        dateMin = v.date;
      }
    });
    DATE_MIN = dateMin;

    data = d3.nest()
      .key(function (v) {
        return v.id;
      })
      //.sortKeys(d3.ascending)
      .entries(d);

    //data.sort(function (d1, d2) {
    //  return d3.ascending(getYMax(d2.values[d2.values.length - 1]), getYMax(d1.values[d1.values.length - 1]));
    //});

    data.forEach(function (d) {
      d.label = d.values[d.values.length - 1].userId + " / " + d.values[d.values.length - 1].class + "";

      if (d.values[d.values.length - 1].isOnLine == null) {
        try {
          if (d.values[d.values.length - 2].minutesPlayedTotal != d.values[d.values.length - 1].minutesPlayedTotal) {
            d.values[d.values.length - 1].isOnLine = true;
          }
        } catch(e) {}
      }
      if (d.values[d.values.length - 1].isOnLine) {
        d.label = d.label + " &bull;";
      }
      d.userId = d.values[d.values.length - 1].userId;
    });

    updateChart();

    setTimeout(loadData, RELOAD_EVERY);

  })
};

var w = window,
  d = document,
  e = d.documentElement,
  g = d.getElementsByTagName('body')[0],
  x = w.innerWidth || e.clientWidth || g.clientWidth,
  y = w.innerHeight || e.clientHeight || g.clientHeight;

var BODY_PADDING = 0.02 * x;
x = x - 2 * BODY_PADDING;
//y = y - 2 * BODY_PADDING - 5;

//Chart dimensions
var margin = {top: 40, right: 150, bottom: 40, left: 70};
//var width = 960 - margin.right;
//var height = 500 - margin.top - margin.bottom;
var width = x - margin.right - margin.left;
var height = y - margin.top - margin.bottom;

// define the colors
var myD3Category = [
  //"#1b70fc", "#faff16", "#d50527", "#158940", "#f898fd", "#24c9d7", "#cb9b64", "#866888", "#22e67a", "#e509ae", "#9dabfa", "#437e8a", "#b21bff", "#ff7b91", "#94aa05", "#ac5906", "#82a68d", "#fe6616", "#7a7352", "#f9bc0f",
  "#1b70fc", "#d50527", "#158940", "#f898fd", "#24c9d7", "#cb9b64", "#866888", "#22e67a", "#e509ae", "#9dabfa", "#437e8a", "#b21bff", "#ff7b91", "#94aa05", "#ac5906", "#82a68d", "#fe6616", "#7a7352", "#f9bc0f",
  //"#b65d66", "#07a2e6", "#c091ae", "#8a91a7", "#88fc07", "#ea42fe", "#9e8010", "#10b437", "#c281fe", "#f92b75", "#07c99d", "#a946aa", "#bfd544", "#16977e", "#ff6ac8", "#a88178", "#5776a9", "#678007", "#fa9316", "#85c070",
  "#b65d66", "#07a2e6", "#c091ae", "#8a91a7", "#ea42fe", "#9e8010", "#10b437", "#c281fe", "#f92b75", "#07c99d", "#a946aa", "#bfd544", "#16977e", "#ff6ac8", "#a88178", "#5776a9", "#678007", "#fa9316", "#85c070",
  "#6aa2a9", "#989e5d", "#fe9169", "#cd714a", "#6ed014", "#c5639c", "#c23271", "#698ffc", "#678275", "#c5a121", "#a978ba", "#ee534e", "#d24506", "#59c3fa", "#ca7b0a", "#6f7385", "#9a634a", "#48aa6f", "#ad9ad0", "#d7908c",
  "#6a8a53", "#8c46fc", "#8f5ab8", "#fd1105", "#7ea7cf", "#d77cd1", "#a9804b", "#0688b4", "#6a9f3e", "#ee8fba", "#a67389", "#9e8cfe", "#bd443c", "#6d63ff", "#d110d5", "#798cc3", "#df5f83", "#b1b853", "#bb59d8", "#1d960c",
  "#867ba8", "#18acc9", "#25b3a7", "#f3db1d", "#938c6d", "#936a24", "#a964fb", "#92e460", "#a05787", "#9c87a0", "#20c773", "#8b696d", "#78762d", "#e154c6", "#40835f", "#d73656", "#1afd5c", "#c4f546", "#3d88d8", "#bd3896",
  "#1397a3", "#f940a5", "#66aeff", "#d097e7", "#fe6ef9", "#d86507", "#8b900a", "#d47270", "#e8ac48", "#cf7c97", "#cebb11", "#718a90", "#e78139", "#ff7463", "#bea1fd"
];

//console.log(width + margin.left + margin.right);
//console.log("height:"+height);
//console.log("TEXT_SPACE:"+TEXT_SPACE);


//Functions to get data
function getX(d) {
  return d.date;
}

function getYMax(d) {
  if (graphType == graphType_LIGHT) {
    return d.lightMax;
  } else {
    return d.allPvPKillsDeathsAssistsRatio;
  }
}

function getYMin(d) {
  if (graphType == graphType_LIGHT) {
    return d.lightMin;
  } else {
    return d.allPvPKillsDeathsAssistsRatio;
  }
}

function getTitle(d) {
  var title = "name / class : " + d.values[d.values.length - 1].userId + " / " + d.values[d.values.length - 1].class;
  title += "\nlight : " + d3.format(".0f")(getYMax(d.values[d.values.length - 1]));

  var minutes = d.values[d.values.length - 1].minutesPlayedTotal;

  if (minutes < 2 * 60) {
    title += "\nplayed : " + minutes + " minutes";
  } else if (minutes < 2 * 24 * 60) {
    title += "\nplayed : " + d3.format(".2f")(minutes / 60) + " hours";
  } else if (minutes < 2 * 7 * 24 * 60) {
    title += "\nplayed : " + d3.format(".2f")(minutes / (24 * 60)) + " days";
  } else if (minutes < 1 * 30 * 24 * 60) {
    title += "\nplayed : " + d3.format(".2f")(minutes / (7 * 24 * 60)) + " weeks";
  } else {
    title += "\nplayed : " + d3.format(".2f")(minutes / (30 * 24 * 60)) + " months";
  }

  title += "\nraid : " + d.values[d.values.length - 1].raidCleared + " / " + d.values[d.values.length - 1].raidEntered;
  title += "\nnightfall : " + d.values[d.values.length - 1].nightfallCleared + " / " + d.values[d.values.length - 1].nightfallEntered;
  title += "\nheroic Nightfall : " + d.values[d.values.length - 1].heroicNightfallCleared + " / " + d.values[d.values.length - 1].heroicNightfallEntered;
  title += "\nstrike : " + d.values[d.values.length - 1].strikeCleared + " / " + d.values[d.values.length - 1].strikeEntered;
  title += "\nTrial of the nine : " + d.values[d.values.length - 1].trialsofthenineWon + " / " + d.values[d.values.length - 1].trialsofthenineEntered;
  title += "\nPvP : " + d.values[d.values.length - 1].allPvPWon + " / " + d.values[d.values.length - 1].allPvPEntered;
  title += "\nPvP ratio : " + d.values[d.values.length - 1].allPvPKillsDeathsAssistsRatio.toFixed(2);

  return title;
}

var alreadyCreated = false;

function updateWindow() {
  x = w.innerWidth || e.clientWidth || g.clientWidth;
  y = w.innerHeight || e.clientHeight || g.clientHeight;

  width = x - margin.right - margin.left;
  height = y - margin.top - margin.bottom;

  //(width + margin.left + margin.right);
  //console.log(height + margin.top + margin.bottom);

  svg
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)

  updateChart();
}

window.onresize = updateWindow;

var createChart = function () {

  if (alreadyCreated) {
    return;
  }
  alreadyCreated = true;

  //Create the SVG container
  svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("class", "all group")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // define the axis
  var x = d3.time.scale().domain([DATE_MIN, new Date()]).range([0, width]);
  //var y = d3.scale.linear().domain([MIN_LIGHT, 335]).range([height, 0]);
  var y = d3.scale.pow().exponent(pow).domain([MIN_LIGHT, 600]).range([height, 0]);
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .innerTickSize(-height)
    .outerTickSize(0)
    .tickPadding(10);
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .innerTickSize(-width)
    .outerTickSize(0)
    .tickPadding(10)
    //.tickValues(YTickValues)
  ;

  //console.log(x.domain());


  // define the axis
  var context = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  var ax = svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);
  ax.append("text")
    .attr("class", "y-axis-label-light")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .attr("dx", "-.2em")
    .style("text-anchor", "end")
    .text("Light");
  ax.append("text")
    .attr("class", "y-axis-label-ratio")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .attr("dx", "-.2em")
    .style("text-anchor", "end")
    .style("opacity", 0)
    .text("Ratio");

  // add the button
  var buttonsGroup = svg.append("g")
    .attr("class", "buttons")
    .attr("transform", "translate(0,-20)")
  ;
  buttonsGroup
    .append("text")
    .attr("class", "ratio")
    .text("-> Ratio");
  buttonsGroup
    .append("text")
    .attr("class", "light")
    .style("opacity", 0)
    .on("click", function () {
      if (graphType == graphType_LIGHT) {
        graphType = graphType_RATIO
        d3.select(".buttons .ratio").style("opacity", 0);
        d3.select(".buttons .light").style("opacity", 1);
        d3.select(".y-axis-label-ratio").style("opacity", 1);
        d3.select(".y-axis-label-light").style("opacity", 0);
      } else {
        graphType = graphType_LIGHT
        d3.select(".buttons .ratio").style("opacity", 1);
        d3.select(".buttons .light").style("opacity", 0);
        d3.select(".y-axis-label-ratio").style("opacity", 0);
        d3.select(".y-axis-label-light").style("opacity", 1);
      }
      ;
      updateChart();
    })
    .text("-> Lights");


};

var updateChart = function () {

  if (graphType == graphType_LIGHT) {
    pow = POW_LIGHT;
    YTickValues = Y_TICK_VALUES_LIGHT;
  } else {
    pow = POW_RATIO;
    YTickValues = Y_TICK_VALUES_RATIO;
  }

  data.sort(function (d1, d2) {
    return d3.ascending(getYMax(d2.values[d2.values.length - 1]), getYMax(d1.values[d1.values.length - 1]));
  });




  //console.log(data);

  // get the global list
  var allData = d3.merge(data.map(function (d) {
    //console.log(d);
    return d.values;
  }));

  // calculate the scales
  var x = d3.time.scale().range([0, width]);
  //var y = d3.scale.linear().range([height, 0]);
  var y = d3.scale.pow().exponent(pow).range([height, 0]);
  //x.domain(d3.extent(allData, getX));
  x.domain([DATE_MIN, new Date()])
  y.domain([Math.max(MIN_LIGHT, d3.min(allData, getYMin)), d3.max(allData, getYMax)]);
  var color = d3.scale.ordinal().range(myD3Category).domain(data.map(function (d) {
    return d.key;
  }));

  //console.log(x.domain());
  //console.log(y.domain());
  //console.log(color.domain());
  //console.log(color("bibullus"));
  //console.log(color("tarrade"));


  // ---------
  // the axis
  // ---------
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .innerTickSize(-height)
    .outerTickSize(0)
    .tickPadding(10);

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .innerTickSize(-width)
    .outerTickSize(0)
    .tickPadding(10)
    //.tickValues(YTickValues)
  ;

  // ---------
  // add axis
  // ---------
  d3.select(".x.axis")
    .transition().duration(1000)
    .call(xAxis);

  d3.select(".y.axis")
    .transition().duration(1000)
    .call(yAxis);
  d3.select(".y1.axis text.axisLabel")
  //.text("Light")
  ;

  // ---------
  // add path
  // ---------
  var area = d3.svg.area()
    .interpolate("basis")
    .x(function (d) {
      return x(getX(d));
    })
    .y0(function (d) {
      return y(getYMax(d));
    })
    .y1(function (d) {
      return y(getYMin(d));
    });

  var areas = svg.selectAll(".area")
    .data(data, function (d) {
      return d.key;
    })
    .attr("d", function (d) {
      return area(d.values);
    });
  areas.enter()
    .append("path")
    .attr("class", function (d) {
      //console.log(d.key);
      return "area K" + d.key
    })
    .attr("d", function (d) {
      return area(d.values);
    })
    .style("stroke", function (d) {
      return color(d.key);
    })
    .style("fill", function (d) {
      return color(d.key);
    })
    .style("opacity", function (d) {
      return 0.2;
    });

  // ---------
  // add lines
  // ---------
  var line = d3.svg.line()
    .interpolate("basis")
    .x(function (d) {
      return x(getX(d));
    })
    .y(function (d) {
      //return (y((getYMax(d)+getYMin(d))/2));
      return (y(getYMax(d)));
    });

  var lines = svg.selectAll(".line")
    .data(data, function (d) {
      return d.key;
    })
    .attr("d", function (d) {
      return line(d.values);
    });
  lines.enter()
    .append("path")
    .attr("class", function (d) {
      return "line K" + d.key
    })
    .attr("d", function (d) {
      return line(d.values);
    })
    .style("stroke", function (d) {
      return color(d.key);
    });

  // ---------
  // add texts
  // ---------
  var textsPositions = [];
  var texts = svg.selectAll(".text")
    .data(data, function (d) {
      return d.key;
    })
    .attr("transform", function (d) {
      var pos = y(Math.max(MIN_LIGHT, getYMax(d.values[d.values.length - 1])));
      //console.log(d.key+" "+pos);
      pos = checkPosition(pos, textsPositions);
      textsPositions.push(pos);
      //console.log(d.key + " " + pos + " " + getYMax(d.values[d.values.length - 1]));
      return "translate(" + x(getX(d.values[d.values.length - 1])) + "," + pos + ")";
    })
    .attr("x", 8)
    .attr("dy", ".35em")
    .style("font-size", "0.7em")
    .html(function (d) {
      return d.label;
    });
  texts.append("svg:title")
    .text(getTitle);

  texts.enter()
    .append("text")
    .attr("class", function (d) {
      //console.log(d);
      return "text U" + d.userId
    })
    .attr("transform", function (d) {
      var pos = y(Math.max(MIN_LIGHT, getYMax(d.values[d.values.length - 1])));
      //console.log(d.key+" "+pos);
      pos = checkPosition(pos, textsPositions);
      textsPositions.push(pos);
      //console.log(d.key + " " + pos + " " + getYMax(d.values[d.values.length - 1]));
      return "translate(" + x(getX(d.values[d.values.length - 1])) + "," + pos + ")";
    })
    .attr("x", 8)
    .attr("dy", ".35em")
    .style("font-size", "0.7em")
    .html(function (d) {
      //return d.key+" "+getYMax(d.values[d.values.length - 1]);
      return d.label;
    })
    .attr("fill", function (d) {
      return color(d.key);
    })
    .on("mouseover", function (d) {
      d3.selectAll(".text.U" + d.userId).style("font-weight", "bolder");
      d3.selectAll(".line.K" + d.key).style("stroke-width", "5px");
      d3.selectAll(".area.K" + d.key).style("opacity", "0.9");
    })
    .on("mouseout", function (d) {
      d3.selectAll(".text.U" + d.userId).style("font-weight", "normal");
      d3.selectAll(".line.K" + d.key).style("stroke-width", "1.5px")
      d3.selectAll(".area.K" + d.key).style("opacity", "0.2");
    })
    .append("svg:title")
    .text(getTitle);

  // ---------
  // Add the points
  // ---------
  //   data.forEach(function(dataset, i) {
  //     var key = dataset.key;
  //     var values = dataset.values;
  //     var size = values.length;
  //
  //     svg.selectAll(".point.dataset")
  //       .data(values)
  //       .enter().append("path")
  //       .attr("class", function (d) {
  //         return "point " + key
  //       })
  //       .style("fill", function (d) {
  //         return color(key);
  //       })
  //       .style("stroke", function (d) {
  //         return color(key);
  //       })
  //       .style("opacity", function(d, i) {
  //         if (i == size -1) {
  //           return 0.8;
  //         } else {
  //           return 0;
  //         }
  //       })
  //       .attr("d", symbol())
  //       .attr("transform", function(d) {
  //         return "translate(" + x(getX(d)) +
  //           "," + y(getYMax(d)) + ")";
  //       })
  //       .append("svg:title")
  //       .text(function(d) {
  //         return d3.format(".2f")(getYMax(d));
  //       });
  //   });


  function symbol() {
    return d3.svg.symbol()
      .size(30)
      .type('circle');
  }

  function checkPosition(pos, textPositions, step, count) {
    if (!step) {
      step = 1;
    }
    if (!count) {
      count = 1;
    } else if (count > 800) {
      return 2 * height;
    }
    //console.log(count);

    nextStep = -1 * step;
    if (step < 0) {
      nextStep += 1;
    }
    if (step > 0) {
      nextStep -= 1;
    }
    //console.log(step);
    //console.log(nextStep);

    var ok = true;
    if ((pos > height+TEXT_SPACE) || (pos < -1 * (margin.top - TEXT_SPACE))) {
      ok = false;
    }
    //console.log(pos);
    textPositions.forEach(function (p) {
      if (Math.abs(pos - p) < TEXT_SPACE) {
        ok = false;
      }
    });

    if (ok) {
      return pos;
    } else {
      return checkPosition(pos + step, textPositions, nextStep, count + 1);
    }

  }

}
