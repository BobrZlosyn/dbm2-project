function filterNodesById(nodes, id) {
    return nodes.filter(function (n) { return n.id === id; });
}

function filterNodesByLabel(nodes, label) {
    return nodes.filter(function (n) { return n.label === label; });
}

function checkCheckboxes() {

    var arr = new Array();
    var children = document.getElementById("checkboxes").childNodes;
    var count = 0;

    for (div of children) { //divs
        var chld = div.childNodes;

        for (lab of chld) {
            if (lab.nodeName === 'LABEL') {	//labels
                var lab_child = lab.childNodes;

                for (check of lab_child) {
                    if (check.nodeName === 'INPUT') { //checkbox
                        if (check.checked === false) {
                            arr[count] = check.value;
                            count++;
                        }
                    }
                }
            }
        }
    }

    return arr;
}

function isNotRequiredType(myStringArray, type) {

    var s;
    for (s of myStringArray) {
        if (s === type) {
            return true;
        }
    }
    return false;
}
