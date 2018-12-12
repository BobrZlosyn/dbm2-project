var highlightedElements;

var nodes;
var paths;
var pathsInvis;
var nodeTexts;
var pathTexts;

//Toggle stores whether the highlighting is on
var toggle = 0;
//Create an array logging what is connected to what
var linkedByIndex = {};


//load from input file
var triples;

var filtered;

var svg;
var force;
var graph;
var check_value;


var parentElement;


$(document).ready(function() {
  highlightedElements = { nodes: {}, paths: {} };

  //prepare data
  triples = INPUT_DATA.Triples;
  console.log(triples);

  filtered = triples.filter(function (item) {
      return item.objectType != 'Literal' || (item.objectType == 'Literal' && item.subject == 'Patient');
  });
  triples = filtered;

  //create graph
  svg = d3.select("#svg-body").append("svg")
      .attr("width", 500)
      .attr("height", 625)
      ;
  force = d3.layout.force().size([500, 625]);
  graph = triplesToGraph(triples, []);
  check_value = gainTypesFromTriples(triples);
  check_value.sort(function (a, b) {
      if (a == 'Literal' || a == '???') return -1;
      if (b == 'Literal' || b == '???') return +1;
      return a.localeCompare(b);
  });

  console.log(check_value);

  update();

  parentElement = document.getElementById('checkboxes');
  createClassCheckboxes();

  calculateNeighborhoodMatrix();
  applyStyle();

 
});

function createClassCheckboxes() {
  for (var count in check_value) {
      var row = document.createElement('checkbox');
      var row_id = 'row_' + count; // need unique Ids!
      row.id = row_id;
      row.setAttribute("style", "min-width:160px !important;");

      var newCheckBox = document.createElement('input');
      var check_id = 'checkbox_' + count; // need unique Ids!

      newCheckBox.type = 'checkbox';
      newCheckBox.id = check_id
      newCheckBox.value = check_value[count];
      newCheckBox.checked = true;

      newCheckBox.setAttribute("onclick", "var array = checkCheckboxes(); graph = triplesToGraph(triples, array); update(); calculateNeighborhoodMatrix(); applyStyle();");
      newCheckBox.setAttribute("style", "display: inline-block");

      var label = document.createElement('label');
      label.htmlFor = check_id;
      label.setAttribute("style", "min-width:170px !important; cursor: pointer; font-size:small");

      label.appendChild(newCheckBox);
      label.appendChild(document.createTextNode(" " + check_value[count]));

      row.appendChild(label);
      parentElement.appendChild(row);
  }
}

function applyStyle() {

    var color = d3.scale.category20();

    nodes.style("fill", function (d) {
        return color(d.type);
    });

    nodeTexts.style("fill", function (d) {
        return color(d.type);
    });

    nodes.on('click', clickedElement);
    nodes.call(force.drag);
    paths.on('click', clickedElement);
    paths.call(force.drag);
    nodeTexts.on('click', clickedElement);
    nodeTexts.call(force.drag);
    pathTexts.on('click', clickedElement);
    pathTexts.call(force.drag);

}
