// the data
var data = {};
var svg;

// const
var MIN_LIGHT = 330;
var Y_TICK_VALUES = [330, 332, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345];
var POW=40;
//var RELOAD_EVERY = 20 * 1000;
var RELOAD_EVERY = 15 * 60 * 1000;

var loadData = function () {
  createChart();
  d3.json("api", function (d) {

    d.forEach(function (v) {
      v.date = new Date(v.date);
    });

    data = d3.nest()
      .key(function (v) {
        return v.name;
      })
      .sortKeys(d3.ascending)
      .entries(d);

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
y = y - 2 * BODY_PADDING - 5;

//Chart dimensions
var margin = {top: 40, right: 100, bottom: 40, left: 70};
//var width = 960 - margin.right;
//var height = 500 - margin.top - margin.bottom;
var width = x - margin.right - margin.left;
var height = y - margin.top - margin.bottom;

console.log(width + margin.left + margin.right);
console.log(height + margin.top + margin.bottom);


//Functions to get data
function getX(d) {
  return d.date;
}
function getY(d) {
  return d.light;
}

var alreadyCreated = false;

function updateWindow() {
  x = w.innerWidth || e.clientWidth || g.clientWidth;
  y = w.innerHeight || e.clientHeight || g.clientHeight;

  width = x - margin.right - margin.left;
  height = y - margin.top - margin.bottom;

  console.log(width + margin.left + margin.right);
  console.log(height + margin.top + margin.bottom);

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
  var x = d3.time.scale().domain([new Date(2015, 9, 30), new Date(2015, 10, 9)]).range([0, width]);
  //var y = d3.scale.linear().domain([MIN_LIGHT, 335]).range([height, 0]);
  var y = d3.scale.pow().exponent(POW).domain([MIN_LIGHT, 335]).range([height, 0]);
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
      .tickValues(Y_TICK_VALUES);

  //console.log(x.domain());

  // define the colors
  var colorScale = d3.scale.category10();

  // define the axis
  var context = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .attr("dx", "-.2em")
    .style("text-anchor", "end")
    .text("Light");

};

var updateChart = function () {
  //console.log(data);

  // get the global list
  var allData = d3.merge(data.map(function (d) {
    //console.log(d);
    return d.values;
  }));

  // calculate the scales
  var x = d3.time.scale().range([0, width]);
  //var y = d3.scale.linear().range([height, 0]);
  var y = d3.scale.pow().exponent(POW).range([height, 0]);
  x.domain(d3.extent(allData, getX));
  y.domain([Math.max(MIN_LIGHT, d3.min(allData, getY)), d3.max(allData, getY)]);
  var color = d3.scale.category10().domain(data.map(function (d) {
    return d.key;
  }));

  console.log(x.domain());
  //console.log(y.domain());
  //console.log(color.domain());
  //console.log(color("bibullus"));
  //console.log(color("tarrade"));


  // the axis
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
    .tickValues(Y_TICK_VALUES);

  // add axis
  d3.select(".x.axis")
    .transition().duration(1000)
    .call(xAxis);

  d3.select(".y.axis")
    .transition().duration(1000)
    .call(yAxis);
  d3.select(".y1.axis text.axisLabel")
    .text("Light");


  // add lines
  var line = d3.svg.line()
    .interpolate("basis")
    .x(function (d) {
      //console.log(d);
      return x(getX(d));
    })
    .y(function (d) {
      return y(getY(d));
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
      return "line " + d.key
    })
    .attr("d", function (d) {
      return line(d.values);
    })
    .style("stroke", function (d) {
      return color(d.key);
    });

  var texts = svg.selectAll(".text")
    .data(data, function (d) {
      return d.key;
    })
    .attr("transform", function (d) {
      return "translate(" + x(getX(d.values[d.values.length - 1])) + "," + y(Math.max(MIN_LIGHT, getY(d.values[d.values.length - 1]))) + ")";
    })
    .attr("x", 3)
    .attr("dy", ".35em")
    .text(function (d) {
      return d.key;
    });

  texts.enter()
    .append("text")
    .attr("class", "text")
    .attr("transform", function (d) {
      return "translate(" + x(getX(d.values[d.values.length - 1])) + "," + y(Math.max(MIN_LIGHT, getY(d.values[d.values.length - 1]))) + ")";
    })
    .attr("x", 3)
    .attr("dy", ".35em")
    .text(function (d) {
      return d.key;
    })
    .attr("fill", function (d) {
      return color(d.key);
    });

  /*  var lights = svg.selectAll(".light")
   .data(data, function (d) {
   //console.log('==');
   //console.log(d);
   return d.key;
   })

   lights.enter().append("g")
   .attr("class", function (d) {
   return "light " + d.key;
   })
   .append("path")
   .attr("class", "line")
   .attr("d", function (d) {
   //console.log(d);
   return line(d.values);
   })
   .style("stroke", function (d) {
   return color(d.key);
   });

   //var path = lights.selectAll("path");

   //path.enter().append("path");

   svg.selectAll(".light path")
   .transition().duration(1000)
   .attr("class", "line")
   .attr("d", function (d) {
   console.log(d);
   return line(d.values);
   })
   .style("stroke", function (d) {
   return color(d.key);
   });

   var t = lights.selectAll(".name")
   .attr("d", function (d) {
   console.log(d);
   })
   .text(function (d) {
   return d.name + " " + getY(d.value);
   });
   */

  /*  lights.append("text")
   .datum(function (d) {
   console.log(d);
   return {name: d.key, value: d.values[d.values.length - 1]};
   })
   .attr("class", "name")
   .attr("transform", function (d) {
   return "translate(" + x(getX(d.value)) + "," + y(Math.max(MIN_LIGHT, getY(d.value))) + ")";
   })
   .attr("x", 3)
   .attr("dy", ".35em")
   .text(function (d) {
   return d.name + " " + getY(d.value);
   })
   .attr("fill", function (d) {
   return color(d.name);
   });
   */

}
