var highlightedElements;

var nodes;
var paths;
var pathsInvis;
var nodeTexts;
var pathTexts;

//Toggle stores whether the highlighting is on
var toggle = 0;
var toggleTry = 0;
//Create an array logging what is connected to what
var linkedByIndex = {};


//load from input file
var triples;

var filtered;

var svg;
var force;
var graph;
var check_value;

/*povoluje klikat na uzly pri funkci B*/
var enableClickableNodeB;

/*zmeni pouzivanou funkci na odstraneni uzlu
 false -> odstraneni,
 true -> zneviditelneni
  */
var removePathEnable;


var hidden = [];
var parentElement;


$(document).ready(function() {
  enableClickableNodeB = false;
  removePathEnable = false;

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

  $(function () {
      $('[data-toggle="popover"]').popover();
      $('.choice1').popover({
          title: "<strong>dcm:has_study</strong> - min. cardinality 0", content: `
    <div class='radio'>
      <label><input type='radio' name='optradio' checked='checked'>Select every <strong>Patient</strong>, regardless of the property.</label>
    </div>
    <div class='radio'>
      <label><input type='radio' name='optradio'>Select only <strong>Patient</strong>s that are linked to some <strong>Study</strong>.</label>
    </div>
      `, html: true, placement: "right"
        });

    })
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

      if (removePathEnable == true) {
        newCheckBox.setAttribute("onclick", "removePath('" + newCheckBox.id + "')");
      }else {
        newCheckBox.setAttribute("onclick", "hidePaths('" + newCheckBox.id + "')");
      }

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

/*zneviditelneni vybrane hrany a uzly podle checkboxu*/
function hidePaths(checkboxId) {
  var info = $("#" + checkboxId).val().split(":");
  var labelBox;
  if (info.length > 1) {
    labelBox = info[1];
  }else {
    labelBox = info[0];
  }
  for (var i = 0; i < graph.nodes.length; i++) {
       nodeLabel = graph.nodes[i].label;
       if (nodeLabel == labelBox) {
         hideSelectedPaths(graph.nodes[i], $("#" + checkboxId).is(":checked"));
         return;
       }
   }
}

/*odstrani vybrane hrany a uzly podle checkboxu*/
function removePath(checkboxId) {
      if($("#" + checkboxId).is(":checked")) {
         var array = checkCheckboxes();
         graph = triplesToGraph(triples, array);
         update();
         calculateNeighborhoodMatrix();
         applyStyle();

      } else {

         var info = $("#" + checkboxId).val().split(":");
         var labelBox;
         if (info.length > 1) {
           labelBox = info[1];
         }else {
           labelBox = info[0];
         }

         for (var i = 0; i < graph.nodes.length; i++) {
              nodeLabel = graph.nodes[i].label;
              if (nodeLabel == labelBox) {
                removeSvgElement(graph.nodes[i]);
                return;
              }
          }
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

    nodes.call(force.drag);
    paths.call(force.drag);
    nodes.on('click', clickedElement);
    nodeTexts.on('click', clickedElement);
    paths.on('click', clickedElement);
    pathTexts.on('click', clickedElement);
    nodeTexts.call(force.drag);
    pathTexts.call(force.drag);

}
