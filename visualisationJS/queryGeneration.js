
// select object - contains array of variables and triples in where array
var select = {
    variables: [],
    where: []
};

// helpful id to assign to RDF triple objects easily search for them later
var tripleID = 0;

/**
 * Function to generate SELECT query statement from highlighted elements of the graph
 */
function generateQuery() {

    // find a node that only has outcoming paths and no incoming
    var start = findStartingNode();

    if (start == null) {
        // no starting node - can nnot generate query
        document.getElementById("query").innerHTML = "<p class='error'>No starting node found!</p>";
        return;
    }

    // check graph for two problems - unconnected graph and more paths leading to the same node
    if (!checkGraph(start)) {
        return;
    }

    // initialize new select statement
    select.variables = [];
    select.where = [];

    // get id of triples to base zero
    tripleID = 0;

    // initialiuze stacks - why we need support stack ? we save there where we have been last. Example:
    // we are in Study
    // next iteration we are in Series
    // since supportStack whosh latest destination (Study) we can easily find the path which we took there
    var stack = [];
    var supportingStack = [];

    // we are starting in start node
    stack.push(start);
    supportingStack.push(start);

    // DFS
    // continue until there is something in stack
    while (stack.length > 0) {

        // get last node from stacks
        var v = stack.pop();
        var supportV = supportingStack.pop();

        // add where we arrived from (RDF rdf:type triple) - the main purpose of supporting stack
        addSelectedPathToNode(v, supportV);

        // add all highlighted proeprties of our current node
        addSelectedProperties(v);

        // add all neighbouring nodes to stack
        addNeighbouringSelectedNodesToStack(v, stack, supportingStack);

    }

    // finally print the query to HTML
    printSelectQuery();

}

/**
 * function to check validity of graph - it is connected and there are no more than one way to all nodes
 * 
 * it works by simply DFS-ing through graph from the starting node. Additional stack of visited is declared and all already visited nodes are added there. 
 * If we come to a situation whern we pop() from main stack a node that is already in visited stack, we found another way to the same node and it is a problem.
 * 
 * At the end of searching, we check the number of highlighted nodes that are not proeprties (type == 1) and if it is the same as the length of visited stack.
 * If it is not, we did not visit all nodes, thus graph is not connected.
 * 
 * @param {number} start - starting node of the graph 
 * 
 * @returns true if graph is okay, false if there is a problem
 */
function checkGraph(start) {

    // initialize stacks - we do not use supportingStack but we need to fedine it
    var stack = [];
    var supportingStack = [];
    var visited = [];

    // starting in starting node
    stack.push(start);

    // while there are nodes in stack
    while (stack.length > 0) {

        var v = stack.pop();

        // if visited stack contains our node, problem of more ways to one node
        if (visited.includes(v)) {
            document.getElementById("query").innerHTML = "<p class='error'>There are more ways to one node!</p>";
            return false;
        }

        // we visited this node
        visited.push(v);

        // add neighbouring nodes to stack
        addNeighbouringSelectedNodesToStack(v, stack, supportingStack);

    }

    // check the number of highlighted nodes of type == 1 and number of visited nodes
    if (getNumberOfHighlightedNodes() != visited.length) {
        document.getElementById("query").innerHTML = "<p class='error'>Not possible to get to all nodes from starting node!!</p>";
        return false;
    }

    // all is well
    return true;

}

/**
 * functions counts the number of nodes of type 1 and returns it
 * @returns number of nodes of type 1 in highlighted graph
 */
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

/**
 * function adds new where triples to the where statement based on current node and last node
 * 
 * if current and last node are the same (like at the beginning of DFS), function adds rdf:type triple to where
 * 
 * if they are different, function finds the path which was used to get from supportV to v, using link attributes if finds the corresponding triple,
 * then creates firstly triple of the path than rdf:type triple
 * 
 * @param {number} v current node id (we are in)
 * @param {number} supportV latest visited node (we have come from)
 */
function addSelectedPathToNode(v, supportV) {

    // if they are the same, add rdf:type
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

        // create new varible
        var variable = {
            name: triple.subject
        };

        // add only if variable not present
        if (!select.variables.includes(variable)) {
            select.variables.push(variable);
        }

        select.where.push(rdfType);
    }
    // more commonly, add triple for the path and then rdf:type
    else {

        // we need to find the path which got us to v
        for (var path in highlightedElements.paths) {
            if (highlightedElements.paths[path] == 0) {
                continue;
            }

            var link = graph.links[path];


            if (link.source.id == supportV // from last visited
                && link.target.id == v // to our node
            ) {
                // we got the path, now find the corresponding triple
                var triple = getTripleBySubjectAndPredicate(link.source.label, link.predicate);

                // create the path triple
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

                // new variable from object -> we came from subject, that is why we are adding object
                var variable = {
                    name: triple.object
                };

                // check for cardinalityMin - if it is zero, we add the ability to switch OPTIONAL wrap
                if (triple.cardinalityMin == 0) {
                    rdfTriple.optional = true; // mark as optional
                    rdfTriple.switched = 0; // switched default value starts as 0
                }

                // check for cardinalityMax - if it is not 1, we add the ability to switch between agregate and group by
                if (triple.cardinalityMax != 1) {
                    variable.agregate = true; // mark as agregate
                    variable.switched = 0; // switched default value starts as 0
                }

                // add rdf:type triple
                var rdfType = {
                    subject: triple.object, // in this object is our subject -> we want to rdf:type where we come to!
                    predicate: "a",
                    object: triple.objectTypePrefixed, // again object
                    property: false,
                    optional: false,
                    id: tripleID++
                };

                // add the rdf:type triple as a child of previous triple
                rdfTriple.children.push(rdfType);

                // add only if not already in variables
                if (!select.variables.includes(variable)) {
                    select.variables.push(variable);
                }

                // now find the parent triple - by using supportV, we can get to where we came from and add a new child
                var rdf = getWhereByNode(supportV, select.where);

                // here we add the child and keep the tree structure
                rdf.children.push(rdfTriple);

                return;
            }
        }
    }
}

/**
 * function adds all highlighted neighbouring nodes of node v to man stack and the node itself to supportingStack ( so we know where we came from later)
 * @param {number} v  
 * @param {Array.<number>} stack 
 * @param {Array.<number>} supportingStack 
 */
function addNeighbouringSelectedNodesToStack(v, stack, supportingStack) {

    for (var path in highlightedElements.paths) {

        if (highlightedElements.paths[path] == 0) {
            continue;
        }

        var link = graph.links[path];

        if (link.source.id == v // starting in our node
            && link.target.type == 1 // non literal
        ) {
            // target is where we go next
            stack.push(link.target.id);
            // here we save where we came from
            supportingStack.push(v);
        }

    }
}

/**
 * function creates triples for highlighted properties of given node
 * @param {number} v node id
 */
function addSelectedProperties(v) {

    // firs find all highlighted properties of this node
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

        // predicate is our new variable - object is "literal"
        var variable = {
            name: property.predicate
        };

        // if cardinalityMin == 0, add switch for OPTIONAL wrapper
        if (property.cardinalityMin == 0) {
            rdfProperty.optional = true; // mark as optional
            rdfProperty.switched = 0; // switched default zero
        }

        // if cardinalityMax != 1, add switch for AGREGATE and group by 
        if (property.cardinalityMax != 1) {
            variable.agregate = true; // mark as agregate
            variable.switched = 0; // switched default 0

        }

        // add only if not present in variables
        if (!select.variables.includes(variable)) {
            select.variables.push(variable);
        }

        // here we get whose children we are (so we know where to add this new triple)
        var rdf = getWhereByNode(v, select.where);
        rdf.children.push(rdfProperty);
    });

}

/**
 * function finds all triples that are selected of a given node
 * @param {number} v node id whose properties we're looking for
 * @returns {Array.<Object>} array of found propreties
 */
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

/**
 * function returns graph triple based on subject and predicate
 * @param {string} subject 
 * @param {string} predicate
 * @returns {Object} found triple 
 */
function getTripleBySubjectAndPredicate(subject, predicate) {
    for (var i = 0; i < triples.length; i++) {
        if (triples[i].subject == subject && triples[i].predicate == predicate) {
            return triples[i];
        }
    }
}

/**
 * function returns graph triple based on predicate
 * @param {string} predicate 
 * @returns {Object} found triple
 */
function getTripleByPredicate(predicate) {
    for (var i = 0; i < triples.length; i++) {
        if (triples[i].predicate == predicate) {
            return triples[i];
        }
    }

}

/**
 * function returns graph triple based on subject
 * @param {string} subject 
 * @returns {Object} found triple
 */
function getTripleBySubject(subject) {
    for (var i = 0; i < triples.length; i++) {
        if (triples[i].subject == subject) {
            return triples[i];
        }
    }
}



/**
 *  function returns triple based its node id. It searches the where tree recursively. Starting point should be invoked using select.where
 * 
 * @param {number} v the node id we are looking for
 * @param {Object} children current triples
 * 
 * @returns found triple object or null 
 */
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

/**
 * function returns triple based on triple id. It searches the where tree recursively. Starting point should be invoked using select.where
 * @param {number} id triple id we are looking for 
 * @param {Object} children  current triples
 * @returns found triple object or null
 */
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

/**
 * function creates a popover window over <span> choice element of AGREGATE. Function needs variable index to get which variable was clicked by user. Switched is the current 
 * value of switched value, either 0, if the <span> choice belongs to AGREGATE in select, or 1 if it belongs to GROUP BY.
 * @param {number} i variable index in select.variables array
 * @param {number} switched current value of switched
 */
function createPopUpWindowAgregate(i, switched) {

    // get the variable by its index
    var variable = select.variables[i];

    var variableName = variable.name;

    var title = "<strong>" + variableName + "</strong> - max. cardinality != 1";

    var firstChecked = switched == 0 ? true : false;

    // there is probably a better way to do this
    if (firstChecked) {
        var content = "<div class='radio'><label><input type='radio' id='" + variableName + "' name='agregateRadio' checked='checked' value='" + variableName + "&0'>Agregate <strong>" + variableName + "</strong> variable.</label></div><div class='radio'><label><input type='radio' name='agregateRadio' value='" + variableName + "&1'>Group <strong>" + variableName + "</strong> variable.</label></div>";
    } else {
        var content = "<div class='radio'><label><input type='radio' id='" + variableName + "' name='agregateRadio' value='" + variableName + "&0'>Agregate <strong>" + variableName + "</strong> variable.</label></div><div class='radio'><label><input type='radio' name='agregateRadio' checked='checked' value='" + variableName + "&1'>Group <strong>" + variableName + "</strong> variable.</label></div>";
    }

    // hide all other potentiallly open popovers
    $('[data-toggle="popover"]').popover("hide");

    // add the popover to clicked element
    $("#" + variableName).popover({
        title: title,
        content: content,
        html: true,
        placement: "right"
    });

    // and show it
    $("#" + variableName).popover('show');

    // assign click function to radio buttons so we can get which value user clicked
    $("input[type='radio']").click(function () {
        var radioValue = $("input[name='agregateRadio']:checked").val();
        if (radioValue) {
            radioAgregate(radioValue);
        }
    });

}

/**
 * function handles the click on one of the radio buttons in popup windows for agregate
 * @param {String} radioValue value of radio input in format [variable_name]&[radio], where radio is either 0 or 1 
 */
function radioAgregate(radioValue) {

    var splitted = radioValue.split("&");
    var variableName = splitted[0];
    var radio = splitted[1];

    // get the variable in question by its name
    var variable = getVariableByName(variableName);

    // this means user clicked on already selected radio
    if (variable.switched == radio) {
        return;
    }

    // switch to new radio value and then print query
    variable.switched = radio;

    printSelectQuery();

}

/**
 * function returns variable based on its name
 * @param {string} variableName name of the variable
 * @returns {Object} found variable
 */
function getVariableByName(variableName) {

    for (var i = 0; i < select.variables.length; i++) {
        if (select.variables[i].name == variableName) {
            return select.variables[i];
        }
    }

}

/**
 * function creates a popover window over <span> choice element of OPTIONAL. Function needs triple id to get which triple was clicked by user. Switched is the current
 * value of switched value, either 0, if the <span> choice is of element in OPTIONAL wrap or 1 if it is outside OPTIONAL wrap
 * @param {number} id triple id
 * @param {number} switched switched value
 */
function createPopUpWindowCardinality(id, switched) {

    // we get the triple by the triple id
    var rdf = getWhereById(id, select.where);

    var object = rdf.object;

    // properties have object with the beginning symbol "?", so we just get rid of it
    if (object.includes("?")) {
        object = object.replace("?", "");
    }

    var title = "<strong>" + rdf.predicate + "</strong> - min. cardinality 0";

    var firstChecked = switched == 0 ? true : false;

    // probably better way to do this
    if (firstChecked) {
        var content = "<div class='radio'><label><input type='radio' name='cardinalRadio' checked='checked' value='" + id + "&0'>Select every <strong>" + rdf.subject + "</strong>, regardless of the property.</label></div><div class='radio'><label><input type='radio' name='cardinalRadio' value='" + id + "&1'>Select only <strong>" + rdf.subject + "</strong> that are linked to some <strong>" + object + "</strong>.</label></div>";
    } else {
        var content = "<div class='radio'><label><input type='radio' name='cardinalRadio' value='" + id + "&0'>Select every <strong>" + rdf.subject + "</strong>, regardless of the property.</label></div><div class='radio'><label><input type='radio' name='cardinalRadio' checked='checked' value='" + id + "&1'>Select only <strong>" + rdf.subject + "</strong> that are linked to some <strong>" + object + "</strong>.</label></div>";
    }

    // hide all other popovers
    $('[data-toggle="popover"]').popover("hide");

    // create a new one to our clicked element
    $("#" + id).popover({
        title: title,
        content: content,
        html: true,
        placement: "right"
    });

    // and show it
    $("#" + id).popover('show');

    // handle user clicking on the radio buttons
    $("input[type='radio']").click(function () {
        var radioValue = $("input[name='cardinalRadio']:checked").val();
        if (radioValue) {
            radioCardinality(radioValue);
        }
    });


}

/**
 * function handles the click on one of the radio buttons in popup windows for cadinality
 * @param {String} radioValue value of radio input in format [triple_id]&[radio], where radio is either 0 or 1 
 */
function radioCardinality(radioValue) {

    var splitted = radioValue.split("&");
    var id = splitted[0];
    var radio = splitted[1];

    var rdf = getWhereById(id, select.where);

    // user clicked the already active radio - return
    if (rdf.switched == radio) {
        return;
    }

    // switch to new radio value
    rdf.switched = radio;

    // update select statement
    printSelectQuery();

}

/**
 * function prints select statement to document
 */
function printSelectQuery() {

    // SELECT starting point
    var print = "<p> SELECT <br>";

    console.log(select);

    // variables
    for (var i = 0; i < select.variables.length; i++) {

        var variable = select.variables[i];

        if (variable.agregate) {
            // variable is AGREGATE

            if (variable.switched == 0) {
                // variable is not switched - print AGREGATE version with <span> choice
                print += " (count(<span class='choice' id='" + variable.name + "' onClick='createPopUpWindowAgregate(" + i + ", " + variable.switched + ")\' data-toggle='popover'>" + "?" + variable.name + ")</span> as ?count" + variable.name + ")<br>";

            } else {
                // variable is switched - print normal version
                print += " ?" + variable.name + "<br>";
            }


        } else {
            // variable is not AGREGATE, print normal version
            print += " ?" + variable.name + "<br>";
        }

    }

    // start of WHERE
    print += "WHERE {<br>";

    for (var i = 0; i < select.where.length; i++) {
        var where = select.where[i];

        // print the starting triple
        print += printRDFTriple(where);

        // print the rest
        for (var i = 0; i < where.children.length; i++) {

            print += printChild(where.children[i], where.optional);

        }
    }

    // end of WHERE
    print += "} <br>";

    // start of GROUP BY
    print += "GROUP BY ";

    for (var i = 0; i < select.variables.length; i++) {

        var variable = select.variables[i];

        if (variable.agregate) {
            // variable is AGREGATE

            if (variable.switched == 1) {
                // we are switched, print variable with <span> choice
                print += "<span class='choice' id='" + variable.name + "' onClick='createPopUpWindowAgregate(" + i + ", " + variable.switched + ")' data-toggle='popover'>" + "?" + variable.name + "</span>" + " ";

            } else if (variable.switched == 0) {
                // nothing - variable is AGREGATE in select variables
            } else {
                // print normal
                print += "?" + variable.name + " ";
            }

        } else {
            // not AGREGATE - print normal
            print += "?" + variable.name + " ";
        }

    }

    // end

    print += "</p>";

    document.getElementById("query").innerHTML = print;

}

/**
 * prints triple's where statement. No optional wrap and no <span>
 * @param {Object} child
 * @returns string of triple's where statement 
 */
function printRDFTriple(child) {
    return " ?" + child.subject + " " + child.predicate + " " + child.object + " .<br>";
}

/**
 * prints triple's where statement with optional wrap. The statement is supported by <span> choice for switching the OPTIONAL wrap.
 * @param {Object} child RDF triple to print statement of
 * @param {boolean} wrapped whether to wrap the statement in OPTIONAL
 * @returns child's where statement with or without OPTIONAL wrap and with <span> choice
 */
function printRDFTripleOptional(child, wrapped) {
    if (wrapped) {
        return " OPTIONAL { " + "?" + child.subject + " " + "<span class='choice' id='" + child.id + "' onClick='" + "createPopUpWindowCardinality(" + child.id + ", " + child.switched + ")' data-toggle='popover' >" + child.predicate + "</span>" + " " + child.object + " . } <br>";
    } else {
        return " ?" + child.subject + " " + "<span class='choice' id='" + child.id + "' onClick='" + "createPopUpWindowCardinality(" + child.id + ", " + child.switched + ")' data-toggle='popover' >" + child.predicate + "</span>" + " " + child.object + " .<br>";
    }


}

/**
 *  prints a child's where statement, then recursively all its childs
 * @param {Object} child rdf triple where statement
 * @param {boolean} optional whether parent was OPTIONAL 
 * @returns string of the child's where statement (and its children)
 */
function printChild(child, optional) {

    var returnString = "";

    if (child.property) {

        // parent was not OPTIONAL but we are
        if (!optional && child.optional) {

            if (child.switched == 0) {
                // if we are switched to OPTIONAL, print the wrapper around the statement
                return printRDFTripleOptional(child, true);
            } else {
                // no wrapper, since we are switched, but allow <span> for switch
                return printRDFTripleOptional(child, false);
            }


            // no <span> otherwise
        } else {
            return printRDFTriple(child);
        }

    } else {

        // our parent was not OPTIONAL but we are
        if (!optional && child.optional) {

            if (child.switched == 0) {
                // we are switched to OPTIONAL, we need to wrap ourselves and our children
                returnString += "OPTIONAL { <br>";
                returnString += printRDFTripleOptional(child, false);

                if (child.children != undefined) {
                    for (var i = 0; i < child.children.length; i++) {
                        returnString += printChild(child.children[i], child.optional);
                    }

                }

                returnString += " } <br>";

                return returnString;
            } else {
                // no need to wrap, but allow <span> for switch
                returnString += printRDFTripleOptional(child, false);

                if (child.children != undefined) {
                    for (var i = 0; i < child.children.length; i++) {
                        returnString += printChild(child.children[i], optional);
                    }

                }
                return returnString;
            }

        } else {
            // no <span>
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
 * @returns first starting node found
 */
function findStartingNode() {

    for (var node in highlightedElements.nodes) {

        var incoming = false;

        if (highlightedElements.nodes[node] == 0) {
            continue;
        }

        for (var path in highlightedElements.paths) {
            var p = graph.links[path];

            if (highlightedElements.paths[path] == 1 // selected path
                && p.target.id == node) { // path leads to our node
                incoming = true;
                break;
            }

        }

        if (incoming == false) {
            // starting node
            return parseInt(node); // parse int makes sure it is a simple integer and not object
        }

    }

    return null;

}