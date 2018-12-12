var selectedMode = '-';

function switchMode(mode) {
    selectedMode = mode;
    document.getElementById("editmode").innerHTML = selectedMode;
}

function clickedElement() {
    if (selectedMode == 'a') {
        //
    } else if (selectedMode == 'b') {
        showInfo(this);
    } else if (selectedMode == 'c') {
        highlight(this);
    } else if (selectedMode == 'd') {
        removeSvgElement(this);
    } else if (selectedMode == 'e') {
        connectedNodes(this);
    } else if (selectedMode == 'fix') {
        this.classList.toggle("fixed-node");

        d3.selectAll('.fixed-node').each(
            function (d) {
                d.fixed = true;
            }
        );
    }
}

function showInfo(obj) {

    d = obj.__data__;
    data = triples[d.id];

    console.log(d);

    console.log(triples[d.id]);
    document.getElementById("value-triples").innerHTML = data.predicateCount;
    document.getElementById("value-distinctSubject").innerHTML = data.subjectCount;
    document.getElementById("value-distinctObject").innerHTML = data.objectCount;

    document.getElementById("value-propertyType").innerHTML = data.predicateTypePrefixed;
    document.getElementById("value-subjectType").innerHTML = data.subjectTypePrefixed;
    document.getElementById("value-objectType").innerHTML = data.objectTypePrefixed;

    //        drawHistogram([1, 1, 1, 1, 3, 5, 3, 14, 1, 9, 11, 1, 1, 0, 10, 1, 1]);
    drawHistogram(data.cardinalities);
}

function highlight(obj) {
    d = obj.__data__;

    if (obj.classList.contains('node')) {
        if (highlightedElements.nodes[d.id] == 1) {
            highlightedElements.nodes[d.id] = 0;
        } else {
            highlightedElements.nodes[d.id] = 1;
        }
    } else if (obj.classList.contains('link-text') || obj.classList.contains('path')) {
        switchOn = highlightedElements.paths[d.id] != 1;

        if (switchOn) {
            highlightedElements.paths[d.id] = 1;
            highlightedElements.nodes[d.source.id] = 1;
            highlightedElements.nodes[d.target.id] = 1;
        } else {
            highlightedElements.paths[d.id] = 0;
            unhighlightNodesIfNoPath();
        }

    }


    nodes.style("opacity", function (o) {
        return highlightedElements.nodes[o.id] == 1 ? 1 : 0.1;
    });

    paths.style("opacity", function (o) {
        return highlightedElements.paths[o.id] == 1 ? 1 : 0.1;
    });

    pathTexts.style("opacity", function (o) {
        return highlightedElements.paths[o.id] == 1 ? 1 : 0.5;
    });
}


/**
 * toggles highlight off from nodes that are isolated (no path exists between them and rest of highlighted nodes)
 */
function unhighlightNodesIfNoPath() {

    for (var node in highlightedElements.nodes) {
        var isolated = true;

        for (var path in highlightedElements.paths) {
            var p = graph.links[path];

            // if the path in highlightedElements is 1 (active) and if the path source or target are our node - it is not isolated
            if (highlightedElements.paths[path] == 1 && (p.source.id == node || p.target.id == node)) {
                isolated = false;
                break;
                // breaking because we found at least one path
            }
        }


        if (isolated) {
            highlightedElements.nodes[node] = 0;
        }

    }

}

var select = {
    variables: [],
    where: [],
    groupBy: []
};

var tripleID = 0;

function generateQuery() {
    console.log(highlightedElements);
    console.log(triples);

    var start = findStartingNode();

    if (start == null) {
        // no starting node
        document.getElementById("query").innerHTML = "<p class='error'>No starting node found!</p>";
        return;
    }

    if (!checkGraph(start)) {
        return;
    }

    select.variables = [];
    select.where = [];

    tripleID = 0;

    var stack = [];
    var supportingStack = [];

    stack.push(start);
    supportingStack.push(start);

    while (stack.length > 0) {

        var v = stack.pop();
        var supportV = supportingStack.pop();

        addSelectedPathToNode(v, supportV);

        addSelectedProperties(v);

        addNeighbouringSelectedNodesToStack(v, stack, supportingStack);

    }

    printSelectQuery();

}

function checkGraph(start) {

    var stack = [];
    var supportingStack = [];
    var visited = [];

    stack.push(start);

    while (stack.length > 0) {

        var v = stack.pop();

        if (visited.includes(v)) {
            document.getElementById("query").innerHTML = "<p class='error'>There are more ways to one node!</p>";
            return false;
        }

        visited.push(v);

        addNeighbouringSelectedNodesToStack(v, stack, supportingStack);

    }

    if (getNumberOfHighlightedNodes() != visited.length) {
        document.getElementById("query").innerHTML = "<p class='error'>Not possible to get to all nodes from starting node!!</p>";
        return false;
    }

    return true;

}

function getNumberOfHighlightedNodes() {

    var i = 0;

    for (var node in highlightedElements.nodes) {

        if (highlightedElements.nodes[node] == 0) {
            continue;
        }

        var n = graph.nodes[node];

        if (n.type == 1) {
            i++;
        }

    }

    return i;

}


function addSelectedPathToNode(v, supportV) {

    if (v == supportV) {
        var triple = getTripleBySubject(graph.nodes[v].label);

        var rdfType = {
            node: v,
            subject: triple.subject,
            predicate: "a",
            object: triple.subjectTypePrefixed,
            property: false,
            id: tripleID++,
            children: []
        };

        select.variables.push(triple.subject);
        select.groupBy.push(triple.subject);

        select.where.push(rdfType);

        return rdfType.optional;
    }
    else {

        for (var path in highlightedElements.paths) {
            if (highlightedElements.paths[path] == 0) {
                continue;
            }

            var link = graph.links[path];

            if (link.source.id == supportV // from last visited
                && link.target.id == v // to our node
            ) {
                var triple = getTripleBySubjectAndPredicate(link.source.label, link.predicate);

                var rdfTriple = {
                    node: v,
                    subject: triple.subject,
                    predicate: triple.predicateTypePrefixed,
                    object: "?" + triple.object,
                    property: false,
                    optional: false,
                    id: tripleID++,
                    children: []
                };

                if (triple.cardinalityMin == 0) {
                    rdfTriple.optional = true;
                    rdfTriple.switched = 0;
                }

                var rdfType = {
                    subject: triple.object,
                    predicate: "a",
                    object: triple.objectTypePrefixed,
                    property: false,
                    optional: false,
                    id: tripleID++
                };

                rdfTriple.children.push(rdfType);

                select.variables.push(triple.object);
                select.groupBy.push(triple.object);

                var rdf = getWhereByNode(supportV, select.where);

                rdf.children.push(rdfTriple);


                return rdfTriple.optional;
            }
        }
    }
}

function getWhereByNode(v, children) {

    for (var i = 0; i < children.length; i++) {
        var rdf = children[i];

        if (rdf.node == v) {
            return rdf;
        }

        if (rdf.children != undefined) {

            var rdfChild = getWhereByNode(v, rdf.children);
            if (rdfChild) {
                return rdfChild;
            }
        }

    }

    return null;
}

function getWhereById(id, children) {

    for (var i = 0; i < children.length; i++) {
        var rdf = children[i];

        if (rdf.id == id) {
            return rdf;
        }

        if (rdf.children != undefined) {

            var rdfChild = getWhereById(id, rdf.children);
            if (rdfChild) {
                return rdfChild;
            }
        }

    }

    return null;
}

function addNeighbouringSelectedNodesToStack(v, stack, supportingStack) {

    for (var path in highlightedElements.paths) {

        if (highlightedElements.paths[path] == 0) {
            continue;
        }

        var link = graph.links[path];

        if (link.source.id == v // starting in our node
            && link.target.type == 1 // non literal
        ) {
            stack.push(link.target.id);
            supportingStack.push(v);
        }

    }
}

function addSelectedProperties(v) {

    var properties = findSelectedProperties(v);

    properties.forEach(property => {
        var rdfProperty = {
            subject: property.subject,
            predicate: property.predicateTypePrefixed,
            object: "?" + property.predicate,
            optional: false,
            property: true,
            id: tripleID++,
        };

        if (property.cardinalityMin == 0) {
            rdfProperty.optional = true;
            rdfProperty.switched = 0;
        }

        select.variables.push(property.predicate);
        select.groupBy.push(property.predicate);

        var rdf = getWhereByNode(v, select.where);
        rdf.children.push(rdfProperty);
    });

}

function findSelectedProperties(v) {

    var properties = [];

    for (var path in highlightedElements.paths) {
        if (highlightedElements.paths[path] == 0) {
            continue;
        }

        var link = graph.links[path];

        if (link.source.id == v // starting in our node
            && link.target.type == 2 // type is literal
        ) {
            properties.push(getTripleByPredicate(link.predicate));
        }


    }

    return properties;

}

function getTripleBySubjectAndPredicate(subject, predicate) {
    for (var i = 0; i < triples.length; i++) {
        if (triples[i].subject == subject && triples[i].predicate == predicate) {
            return triples[i];
        }
    }
}

function getTripleByPredicate(predicate) {
    for (var i = 0; i < triples.length; i++) {
        if (triples[i].predicate == predicate) {
            return triples[i];
        }
    }

}

function getTripleBySubject(subject) {
    for (var i = 0; i < triples.length; i++) {
        if (triples[i].subject == subject) {
            return triples[i];
        }
    }
}

function createPopUpWindowCardinality(id, switched) {

    var rdf = getWhereById(id, select.where);

    var object = rdf.object;
    if (object.includes("?")) {
        object = object.replace("?", "");
    }

    var title = "<strong>" + rdf.predicate + "</strong> - min. cardinality 0";

    var firstChecked = switched == 0 ? true : false;

    if (firstChecked) {
        var content = "<div class='radio'><label><input type='radio' name='cardinalRadio' checked='checked' value='" + id + "&0'>Select every <strong>" + rdf.subject + "</strong>, regardless of the property.</label></div><div class='radio'><label><input type='radio' name='cardinalRadio' value='" + id + "&1'>Select only <strong>" + rdf.subject + "</strong>s that are linked to some <strong>" + object + "</strong>.</label></div>";
    } else {
        var content = "<div class='radio'><label><input type='radio' name='cardinalRadio' value='" + id + "&0'>Select every <strong>" + rdf.subject + "</strong>, regardless of the property.</label></div><div class='radio'><label><input type='radio' name='cardinalRadio' checked='checked' value='" + id + "&1'>Select only <strong>" + rdf.subject + "</strong>s that are linked to some <strong>" + object + "</strong>.</label></div>";
    }


    $('[data-toggle="popover"]').popover("hide");

    $("#" + id).popover({
        title: title,
        content: content,
        html: true,
        placement: "right"
    });

    $("#" + id).popover('show');

    $("input[type='radio']").click(function () {
        var radioValue = $("input[name='cardinalRadio']:checked").val();
        if (radioValue) {
            radioCardinality(radioValue);
        }
    });


}

function radioCardinality(radioValue) {

    var splitted = radioValue.split("&");
    var id = splitted[0];
    var radio = splitted[1];

    var rdf = getWhereById(id, select.where);

    if (rdf.switched == radio) {
        return;
    }

    rdf.switched = radio;

    printSelectQuery();

}

function printSelectQuery() {

    var print = "SELECT <br>";

    console.log(select);

    select.variables.forEach(variable => {
        print += " ?" + variable + "<br>";
    });

    print += "WHERE {<br>";

    select.where.forEach(where => {

        print += printRDFTriple(where);

        for (var i = 0; i < where.children.length; i++) {

            print += printChild(where.children[i], where.optional);

        }
    });

    print += "} <br>";

    print += "GROUP BY ";

    select.groupBy.forEach(variable => {
        print += "?" + variable + " ";
    });

    document.getElementById("query").innerHTML = print;

}

function printRDFTriple(child) {
    return " ?" + child.subject + " " + child.predicate + " " + child.object + "<br>";
}

function printRDFTripleOptional(child, wrapped) {
    if (wrapped) {
        return " OPTIONAL { " + "?" + child.subject + " " + "<span class='choice' id='" + child.id + "' onClick='" + "createPopUpWindowCardinality(" + child.id + ", " + child.switched + ")' data-toggle='popover' >" + child.predicate + "</span>" + " " + child.object + " } <br>";
    } else {
        return " ?" + child.subject + " " + "<span class='choice' id='" + child.id + "' onClick='" + "createPopUpWindowCardinality(" + child.id + ", " + child.switched + ")' data-toggle='popover' >" + child.predicate + "</span>" + " " + child.object + "<br>";
    }


}

function printChild(child, optional) {

    var returnString = "";

    if (child.property) {

        if (!optional && child.optional) {

            if (child.switched == 0) {
                return printRDFTripleOptional(child, true);
            } else {
                return printRDFTripleOptional(child, false);
            }


        } else {
            return printRDFTriple(child);
        }

    } else {

        if (!optional && child.optional) {

            if (child.switched == 0) {
                returnString += printRDFTripleOptional(child, true);

                if (child.children != undefined) {
                    for (var i = 0; i < child.children.length; i++) {
                        returnString += printChild(child.children[i], child.optional);
                    }

                }

                returnString += " } <br>";

                return returnString;
            } else {
                returnString += printRDFTripleOptional(child, false);

                if (child.children != undefined) {
                    for (var i = 0; i < child.children.length; i++) {
                        returnString += printChild(child.children[i], optional);
                    }

                }
                return returnString;
            }

        } else {
            returnString += printRDFTriple(child);
            if (child.children != undefined) {
                for (var i = 0; i < child.children.length; i++) {
                    returnString += printChild(child.children[i], optional);
                }

            }
            return returnString;
        }

    }

}


/**
 * finds a starting node which has no incoming paths
 * returns first starting node found
 */
function findStartingNode() {

    for (var node in highlightedElements.nodes) {

        var incoming = false;

        if (highlightedElements.nodes[node] == 0) {
            continue;
        }

        for (var path in highlightedElements.paths) {
            var p = graph.links[path];

            if (highlightedElements.paths[path] == 1 && p.target.id == node) {
                incoming = true;
                break;
            }

        }

        if (incoming == false) {
            // starting node
            return parseInt(node);
        }

    }

    return null;

}

function removeSvgElement(obj) {
    d = obj.__data__;


    if (obj.classList.contains('node')) {
        graph.nodes.splice(d.index, 1);
        graph.links = graph.links.filter(function (el) { return el.source.id != d.id && el.target.id != d.id; });


        for (i = nodes[0].length - 1; i >= 0; i--) {
            el = nodes[0][i];
            if (el.__data__.id == d.id) {
                el.parentElement.removeChild(el);
                nodes[0].splice(i, 1);
            }
        }

        for (i = nodeTexts[0].length - 1; i >= 0; i--) {
            el = nodeTexts[0][i];
            if (el.__data__.id == d.id) {
                el.parentElement.removeChild(el);
                nodeTexts[0].splice(i, 1);
            }
        }

        for (i = paths[0].length - 1; i >= 0; i--) {
            el = paths[0][i];
            if (el.__data__.source.id == d.id || el.__data__.target.id == d.id) {
                el.parentElement.removeChild(el);
                paths[0].splice(i, 1);
            }
        }
        for (i = pathsInvis[0].length - 1; i >= 0; i--) {
            el = pathsInvis[0][i];
            if (el.__data__.source.id == d.id || el.__data__.target.id == d.id) {
                el.parentElement.removeChild(el);
                pathsInvis[0].splice(i, 1);
            }
        }
        for (i = pathTexts[0].length - 1; i >= 0; i--) {
            el = pathTexts[0][i];
            if (el.__data__.source.id == d.id || el.__data__.target.id == d.id) {
                el.parentElement.removeChild(el);
                pathTexts[0].splice(i, 1);
            }
        }

        nodes.data(graph.nodes)
            .exit().remove();

        nodeTexts.data(graph.nodes)
            .exit().remove();

        paths.data(graph.links)
            .exit().remove();

        pathsInvis.data(graph.links)
            .exit().remove();

        pathTexts.data(graph.links)
            .exit().remove();


        force.nodes(graph.nodes);
        force.links(graph.links);
        force.start();

        applyStyle();

        console.log(graph);


    }
}

function connectedNodes(obj) {
    if (toggle == 0) {
        //Reduce the opacity of all but the neighbouring nodes
        d = d3.select(obj).node().__data__;
        nodes.style("opacity", function (o) {
            return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
        });
        paths.style("opacity", function (o) {
            return d.id == o.source.id | d.id == o.target.id ? 1 : 0.1;
        });
        nodeTexts.style("opacity", function (o) {
            return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
        });
        pathTexts.style("opacity", function (o) {
            return d.id == o.source.id | d.id == o.target.id ? 1 : 0.1;
        });

        //Reduce the op
        toggle = 1;
    } else {
        //Put them back to opacity=1
        nodes.style("opacity", 1);
        /*	link.style("opacity", 1);*/
        paths.style("opacity", 1);
        nodeTexts.style("opacity", 1);
        pathTexts.style("opacity", 1);
        toggle = 0;
    }
}