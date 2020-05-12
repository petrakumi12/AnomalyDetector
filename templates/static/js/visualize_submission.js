let resultsJSON = JSON.parse(sessionStorage.viz_submission);
let channelArrays = {};
let graphLines = [];
let plot;
let colorCategoryDict = {};
let allTraces = {};
let toKeep = ['real_sig_array', 'anom_array'];


window.onload = function () {
    console.log(resultsJSON);
    add_navbar();
    add_title(); // not sure if i want this yet
    populateDropdown();
    getArraysFromData(); //gets arrays of real signal, pred signal and pred anomalies from results json
    updateColorDictionary();  //updates the color gradients to be used in the plot
    addToggleButtons(document.getElementById('channel-toggle'), Object.keys(channelArrays));
    addToggleButtons(document.getElementById('signal-type-toggle'), toKeep); //add buttons for channels
    addToggleListeners(); //add listeners to toggles to update the plot accordingly
    updatePlotContent(); //adds all the necessary lines to plot
    window.onresize = function () {
        plotData();
    }
};

function add_title() {
    document.getElementById("page-title").innerText = "Results for job " + resultsJSON.job_name
}

function getArraysFromData() {
    let jobResults = resultsJSON.results;
    let datasetNames = Object.keys(jobResults).map(d => d.replace('csv', '.csv'));
    for (let aName of datasetNames) {
        channelArrays[aName] = {};
        let realSignal = findRealSignalArray(aName);
        channelArrays[aName].real_sig_array = realSignal;

        let allSignalTypes = ['smoothed_signal', 'anom_array', 'variation_arr', 'variation_variation_arr'];
        for (let aSignalType of allSignalTypes) {
            let signalArray = jobResults[aName.replace(".csv", "csv")][aSignalType];
            if (signalArray !== undefined) {
                if (!toKeep.includes(aSignalType)) {
                    toKeep.push(aSignalType);
                }
                //make length of smoothed signal = that of real signal by appending zeros in the front
                signalArray = equalizeLengths(signalArray, realSignal);

                console.log('equalizing', aSignalType);
                channelArrays[aName][aSignalType] = signalArray;
            }

        }
    }
    console.log('channel arrays', channelArrays);
}


function updateColorDictionary() {
    let extra = 2;
    let opacity = 0.8;
    let totalChannels = Object.keys(channelArrays).length;


    for (let i = 0; i < totalChannels; i++) {

        let tempAnomaliesGradient = {
            'fill': makeScale("#fff4e8", "#d8dede"),
            'lines': makeScale("#fffed7", "#b7b1ad")
        };

        let tempLineGradients = [
            makeScale("#b3d4ff", "#0b8bff"),
            makeScale("#ffc3c5", "#a40003"),
            makeScale("#bbd9b7", "#2e8e00"),
            makeScale("#ffb568", "#de9b05")
        ];

        let key = Object.keys(channelArrays)[i];
        //going through all lines
        for (let j = 0; j < tempLineGradients.length; j++) {
            console.log('temp line gradient', tempLineGradients[j]);
            tempLineGradients[j] = add_opacity(tempLineGradients[j](5), opacity);
        }
        //going through all anomalies
        for (let item of Object.keys(tempAnomaliesGradient)) {
            tempAnomaliesGradient[item] = add_opacity(tempAnomaliesGradient[item](5), 0.6)
        }
        //creating dictionary with colors for all lines and anoms
        colorCategoryDict[key] = {'lines': tempLineGradients, 'anoms': tempAnomaliesGradient};
    }

    function makeScale(first, second) {
        return d3.scaleLinear().domain([1, 8]).range([first, second])
    }

    function add_opacity(rgbValue, alpha) {
        rgbValue = rgbValue.replace(")", ", " + alpha + ")");
        return rgbValue.replace("rgb", "rgba")
    }

}

function updatePlotContent() {

    for (let channel of Object.keys(channelArrays)) {

        let predictedAnomaliesTrace = {};

        predictedAnomaliesTrace = {
            x: [...Array(channelArrays[channel].real_sig_array.length).keys()],
            y: channelArrays[channel].anom_array,
            type: 'line',
            fill: 'tozeroy',
            fillcolor: colorCategoryDict[channel]['anoms']['fill'],
            line: {
                color: colorCategoryDict[channel]['anoms']['lines'],
                // color: 'rgba(0,0,0,0)',
                width: 1.5
            },
            name: channel + ': anom_array'
        };
        allTraces['anom_array'] === undefined ? allTraces['anom_array'] = [predictedAnomaliesTrace] : allTraces['anom_array'].push(predictedAnomaliesTrace);

        let iterator = 0;
        for (let aSignalType of Object.keys(channelArrays[channel])) {
            if (aSignalType !== 'anom_array') {
                let aTrace = {
                    x: [...Array(channelArrays[channel].real_sig_array.length).keys()],
                    y: channelArrays[channel][aSignalType],
                    type: 'line',
                    name: channel + ': ' + aSignalType,
                    line: {
                        color: colorCategoryDict[channel]['lines'][iterator],
                        width: 1.5
                    }
                };
                allTraces[aSignalType] === undefined ? allTraces[aSignalType] = [aTrace] : allTraces[aSignalType].push(aTrace)
            }
            iterator += 1
        }
    }
    for (let e of Object.keys(allTraces)) {
        allTraces[e].map(d => graphLines.push(d));
    }
    plotData();
}

function showHideGraphLine(toggle, isShow) {

    for (let i = 0; i < graphLines.length; i++) {
        let el = graphLines[i];
        let elChan = el.name.split(": ")[0].replace('.csv', 'csv');
        let elSigType = el.name.split(": ")[1];
        let id = toggle.id.replace('toggle', '');
        if (id === 'all_vals') {
            console.log('id all vals');
            elChan = id;
            elSigType = id;
        }
        if (elChan === id || elSigType === id) {
            if (isShow) {
                delete el.visible;
                graphLines[i] = el;
            } else {
                el.visible = 'legendonly';
                graphLines[i] = el;
            }
        }
    }
}


function plotData() {
    document.getElementById('plot').innerHTML = "";
    let dict = {
        title: {text: "Results for job " + resultsJSON.job_name},
        xaxis: {title: {text: 'Data points'}},
        yaxis: {title: {text: 'Signal values'}}
    };
    plot = Plotly.newPlot('plot', graphLines, dict);
}


function findRealSignalArray(aName) {
    for (let el of resultsJSON.params.sets.test) {
        if (el.name === aName) {
            return el.sig_vals
        }
    }
}

function equalizeLengths(shorter, longer) {
    console.log('shorter len', shorter.length, 'longer len', longer.length);
    let lengthDifference = longer.length - shorter.length;
    let differenceArray = new Array(lengthDifference).map(d => 0);
    return differenceArray.concat(shorter);
}


function addToggleButtons(parentContainer, iterator) {
    for (let element of iterator) {
        let listItem = document.createElement('div');
        "col text-left".split(" ").map(d => listItem.classList.add(d));

        let toggleInput = document.createElement('input');
        toggleInput.setAttribute('type', 'checkbox');
        // toggleInput.setAttribute('checked', '');
        toggleInput.setAttribute('id', 'toggle' + element.replace('.csv', 'csv'));
        toggleInput.classList.add('toggleInput');
        listItem.appendChild(toggleInput);

        let label = document.createElement('label');
        label.setAttribute('for', 'toggle' + element.replace('.csv', 'csv'));
        label.innerText = element;
        label.classList.add('mx-2');
        listItem.appendChild(label);

        parentContainer.appendChild(listItem);
        console.log('toggleinput is', toggleInput)
    }
}


function addToggleListeners() {
    let allToggleInputs = document.getElementsByClassName('toggleInput');
    for (let aToggle of allToggleInputs) {
        aToggle.onchange = function () {
            if (aToggle.id === "toggleall_vals") {
                toggleAllListener()
            }
            console.log('here for toggle', aToggle.checked);
            if (aToggle.checked) {
                showHideGraphLine(aToggle, true)
            } else {
                console.log('calling toggle false');
                showHideGraphLine(aToggle, false)
            }
            plotData()
        };
    }
}

function toggleAllListener(el) {
    let allToggleInputs = document.getElementsByClassName('toggleInput');
    for (let aToggle of allToggleInputs) {
        console.log('atoggle', aToggle);
        if(el.checked){
            aToggle.checked = !el.checked;
        }
        if (aToggle.checked) {
            showHideGraphLine(aToggle, true)
        }
        else {
            console.log('calling toggle false');
            showHideGraphLine(aToggle, false)
        }
        plotData()
    }
}


    function populateDropdown() {
        let modalContent = [
            '<b>ID: </b>' + resultsJSON._id,
            '<b>Description: </b>' + resultsJSON.job_desc,
            '<b>Signal Type: </b>' + resultsJSON.signal_type,
            '<b>Job Type: </b>' + resultsJSON.job_type,
            '<b>Testing Sets (analyzed sets): </b>' + reduceListOfSets(resultsJSON.params.sets.test, true),
            '<b>Job Progress: </b>' + resultsJSON.progress,
            '<b>Parameters: </b><br/>' + generateParamList(resultsJSON.params.alg_params),
        ];

        if (resultsJSON.params.sets.train.length !== 0) {
            let trainText = '<b>Training Sets: </b>' + reduceListOfSets(resultsJSON.params.sets.train, false) +
                " (Total length: " + calculateTrainTotalLen(resultsJSON.params.sets.train) + ", " +
                "Trained on " + resultsJSON.params.times.param_1 + " to " + resultsJSON.params.times.param_2 + ") ";
            modalContent.splice(4, 0, trainText)
        }

        //make table, table header and body
        let table = document.createElement('table');
        "table table-striped table-condensed mx-1".split(" ").map(d => table.classList.add(d));
        let tableHeader = document.createElement('thead');
        let tableBody = document.createElement('tbody');
        table.appendChild(tableHeader);
        table.appendChild(tableBody);

        //add header row and text
        let headerRow = document.createElement('tr');
        let headerText = document.createElement('td');
        headerText.innerHTML = '<h5><b>Job ' + resultsJSON.job_name + '</b></h5>';
        tableHeader.appendChild(headerRow);
        headerRow.appendChild(headerText);

        //add all data rows
        for (let el of modalContent) {
            let container = document.createElement('tr');
            let text = document.createElement('td');
            text.innerHTML = el;
            tableBody.appendChild(container);
            container.appendChild(text);
        }

        //append to parent element
        let infoContainer = document.getElementById('param-content');
        infoContainer.appendChild(table);
    }

    function reduceListOfSets(data, with_len) {
        let temp = "";
        for (let el of data) {
            temp += el.name;
            if (with_len) {
                temp += " (length: " + el.sig_vals.length + ")";
            }
            temp += ", ";
        }
        temp = temp.slice(0, temp.length - 2);
        return temp
    }

    function calculateTrainTotalLen(data) {
        let len = 0;
        for (let el of data) {
            len += el.sig_vals.length
        }
        return len;
    }


    function generateParamList(datum) {
        let text = "";
        for (let key of Object.keys(datum)) {
            text += '<b>' + key + ': </b>' + datum[key] + ', ';
        }
        text = text.slice(0, text.length - 2);
        return text;
    }

