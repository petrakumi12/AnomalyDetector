let resultsJSON, // json of job results
    channelArrays = {}, // dictionary of channel arrays
    colorCategoryDict = {}, //creating dictionary with colors for all lines and anomalies
    allTraces = {}; //dictionary of all traces that go in the plot
let graphLines = []; //array of graph lines
let plot; //the line plot

//array of types of arrays to keep
let toKeep = ['real_sig_array', 'anom_array'];


window.onload = function () {
    resultsJSON = JSON.parse(sessionStorage.viz_submission);
    console.log(resultsJSON);
    addNavBar();
    addPageTitle(); // not sure if i want this yet
    populateDropdown();
    getArraysFromData(); //gets arrays of real signal, pred signal and pred anomalies from results json
    updateColorDictionary();  //updates the color gradients to be used in the plot
    addToggleButtons(document.getElementById('channel-toggle'), Object.keys(channelArrays));
    addToggleButtons(document.getElementById('signal-type-toggle'), toKeep); //add buttons for channels
    addToggleListeners(); //add listeners to toggles to update the plot accordingly
    updatePlotContent(); //adds all the necessary lines to plot
    //replot when window is resized
    window.onresize = function () {
        plotData();
    }
};

/**
 * Makes title of page
 */
function addPageTitle() {
    document.getElementById("page-title").innerText = "Results for job " + resultsJSON.job_name
}

/**
 * Retreives real signal arrays, smoothed signal arrays, and prediction arrays from the loaded data,
 * formatting them if necessary to add to plot
 */
function getArraysFromData() {
    //job results dictionary
    let jobResults = resultsJSON.results;

    //names of the testing datasets
    let datasetNames = Object.keys(jobResults).map(d => d.replace('csv', '.csv'));

    //iterate through each dataset name
    for (let aName of datasetNames) {

        //initialize dictionary of arrays of data for results of one channel
        channelArrays[aName] = {};

        //get real signal values and add to dictionary
        let realSignal = findRealSignalArray(aName);
        channelArrays[aName].real_sig_array = realSignal;

        //array of all signal types (arrays) for each channel
        let allSignalTypes = ['smoothed_signal', 'anom_array', 'variation_arr', 'variation_variation_arr'];

        //iterate through array
        for (let aSignalType of allSignalTypes) {

            //get the array for that type of signal
            let signalArray = jobResults[aName.replace(".csv", "csv")][aSignalType];

            //check if given channel has an array of this signal type and if yes then keep signal type
            if (signalArray !== undefined) {
                if (!toKeep.includes(aSignalType)) {
                    toKeep.push(aSignalType);
                }
                //make length of smoothed signal = that of real signal by appending zeros in the front
                signalArray = equalizeLengths(signalArray, realSignal);

                //add signal array to channelArrays variable
                channelArrays[aName][aSignalType] = signalArray;
            }
        }
    }
}

/**
 * Adds colors in dictionary making sure that there is a color for each array
 */
function updateColorDictionary() {
    let opacity = 0.8;
    let totalChannels = Object.keys(channelArrays).length;

    //iterate through number of channels
    for (let i = 0; i < totalChannels; i++) {

        //dict with gradient scales for filling and outline of anomalies sections
        let tempAnomaliesGradient = {
            'fill': makeScale("#fff4e8", "#d8dede"),
            'lines': makeScale("#fffed7", "#b7b1ad")
        };

        //temporary array of gradients for plot lines
        let tempLineGradients = [
            makeScale("#b3d4ff", "#0b8bff"),
            makeScale("#ffc3c5", "#a40003"),
            makeScale("#bbd9b7", "#2e8e00"),
            makeScale("#ffb568", "#de9b05")
        ];

        //name of channel
        let key = Object.keys(channelArrays)[i];

        //going through all lines to add opacity to the line gradient elements
        for (let j = 0; j < tempLineGradients.length; j++) {
            console.log('temp line gradient', tempLineGradients[j]);
            tempLineGradients[j] = addOpacity(tempLineGradients[j](5), opacity);
        }

        //going through all anomalies to add opacity to each element
        for (let item of Object.keys(tempAnomaliesGradient)) {
            tempAnomaliesGradient[item] = addOpacity(tempAnomaliesGradient[item](5), 0.6)
        }

        //adding  dictionary with colors for all lines and anoms
        colorCategoryDict[key] = {'lines': tempLineGradients, 'anoms': tempAnomaliesGradient};
    }

    /**
     * Makes gradient scale from first color to second color
     * @param first First color
     * @param second Second color
     */
    function makeScale(first, second) {
        return d3.scaleLinear().domain([1, 8]).range([first, second])
    }

    /**
     * Adds opacity value to rgb color, by converting to RGBa and adding an alpha value
     * @param rgbValue RGB value that will be converted to RGBa
     * @param alpha the alpha value
     * @returns {*}
     */
    function addOpacity(rgbValue, alpha) {
        rgbValue = rgbValue.replace(")", ", " + alpha + ")");
        return rgbValue.replace("rgb", "rgba")
    }

}

/**
 * Adds or removes plotted lines depending on checked boxes
 */
function updatePlotContent() {

    //iterate through all channels
    for (let channel of Object.keys(channelArrays)) {

        //create plot trace for predicted anomalies for a channel
        let predictedAnomaliesTrace = {
            x: [...Array(channelArrays[channel].real_sig_array.length).keys()],
            y: channelArrays[channel].anom_array,
            type: 'line',
            fill: 'tozeroy',
            fillcolor: colorCategoryDict[channel]['anoms']['fill'],
            line: {
                color: colorCategoryDict[channel]['anoms']['lines'],
                width: 1.5
            },
            name: channel + ': anom_array'
        };

        //if anom_array key does not exist then assign predictedAnomaliesTrace to it otherwise push to the existing array
        allTraces['anom_array'] === undefined ? allTraces['anom_array'] = [predictedAnomaliesTrace] : allTraces['anom_array'].push(predictedAnomaliesTrace);

        let iterator = 0;
        //iterate through all signal types for a channel
        for (let aSignalType of Object.keys(channelArrays[channel])) {
            //create trace for plot for all signal types except anomalies since those are filled in sections
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
                //add trace to allTraces assigning to given signal type
                allTraces[aSignalType] === undefined ? allTraces[aSignalType] = [aTrace] : allTraces[aSignalType].push(aTrace)
            }
            iterator += 1
        }
    }

    //add all traces to graphLines
    for (let e of Object.keys(allTraces)) {
        allTraces[e].map(d => graphLines.push(d));
    }
    //plot all the data
    plotData();
}

/**
 * Show or hide plot line
 * @param toggle Toggle button
 * @param isShow Boolean on whether the trace will show
 */
function showHideGraphLine(toggle, isShow) {

    //iterate through all graph lines
    for (let i = 0; i < graphLines.length; i++) {
        let el = graphLines[i];
        let elChan = el.name.split(": ")[0].replace('.csv', 'csv');
        let elSigType = el.name.split(": ")[1];
        let id = toggle.id.replace('toggle', '');
        //if id is all_vals then show or hide all of them
        if (id === 'all_vals') {
            console.log('id all vals');
            elChan = id;
            elSigType = id;
        }
        //otherwise show or hide only if the id matches that of the HTML element name of signal type
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

/**
 * Plots all the lines on graphLines
 */
function plotData() {
    document.getElementById('plot').innerHTML = "";
    let dict = {
        title: {text: "Results for job " + resultsJSON.job_name},
        xaxis: {title: {text: 'Data points'}},
        yaxis: {title: {text: 'Signal values'}}
    };
    plot = Plotly.newPlot('plot', graphLines, dict);
}


/**
 * Gets array of real signal for given channel
 * @param aName channel name
 */
function findRealSignalArray(aName) {
    for (let el of resultsJSON.params.sets.test) {
        if (el.name === aName) {
            return el.sig_vals
        }
    }
}

/**
 * Makes length of shorter array equal to that of longer array by adding 0s to the beginning of the shorter array
 * @param shorter the shorter array
 * @param longer the longer array
 * @returns {number[]} shorter array with the appended 0s
 */
function equalizeLengths(shorter, longer) {
    console.log('shorter len', shorter.length, 'longer len', longer.length);
    let lengthDifference = longer.length - shorter.length;
    let differenceArray = new Array(lengthDifference).map(d => 0);
    return differenceArray.concat(shorter);
}

/**
 * Adds toggle buttons for different types of signal
 * @param parentContainer Parent element to the checkboxes
 * @param iterator Array to iterate through
 */
function addToggleButtons(parentContainer, iterator) {

    //iterating through all elements of the iterator
    for (let element of iterator) {

        //container for toggle box
        let listItem = document.createElement('div');
        "col text-left".split(" ").map(d => listItem.classList.add(d));

        //toggle box input
        let toggleInput = document.createElement('input');
        toggleInput.setAttribute('type', 'checkbox');
        toggleInput.setAttribute('id', 'toggle' + element.replace('.csv', 'csv'));
        toggleInput.classList.add('toggleInput');
        listItem.appendChild(toggleInput);

        //label to toggle box input
        let label = document.createElement('label');
        label.setAttribute('for', 'toggle' + element.replace('.csv', 'csv'));
        label.innerText = element;
        label.classList.add('mx-2');
        listItem.appendChild(label);

        parentContainer.appendChild(listItem);
    }
}

/**
 * Adds listener to toggle button to update plot lines when unchecked
 */
function addToggleListeners() {
    let allToggleInputs = document.getElementsByClassName('toggleInput');
    for (let aToggle of allToggleInputs) {
        aToggle.onchange = function () {

            //if id is toggleall_vals then add listener to toggle all lines on or off
            if (aToggle.id === "toggleall_vals") {
                toggleAllListener()
            }
            //if checked show graph lines
            if (aToggle.checked) {
                showHideGraphLine(aToggle, true)
            } else {
                //if not then hide graphlines
                showHideGraphLine(aToggle, false)
            }
            //replot data
            plotData()
        };
    }
}

/**
 * Listener to show or hide all lines
 * @param el
 */
function toggleAllListener(el) {
    let allToggleInputs = document.getElementsByClassName('toggleInput');
    for (let aToggle of allToggleInputs) {

        if (el.checked) {
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


/**
 * Adds content to dropdown container with all the info about job
 */
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

/**
 * Formats channels and their lengths to strings
 * @param data Info on channels and their lengths
 * @param withLength Boolean whether formatted with length or without
 * @returns {string}
 */
function reduceListOfSets(data, withLength) {
    let temp = "";
    for (let el of data) {
        temp += el.name;
        if (withLength) {
            temp += " (length: " + el.sig_vals.length + ")";
        }
        temp += ", ";
    }
    temp = temp.slice(0, temp.length - 2);
    return temp
}

/**
 * Finds length of training set and returns it
 * @param data Information on the channel
 * @returns {number}
 */
function calculateTrainTotalLen(data) {
    let len = 0;
    for (let el of data) {
        len += el.sig_vals.length
    }
    return len;
}

/**
 * Creates a formatted list of parameters for given job
 * @param datum Information about given job
 * @returns {string}
 */
function generateParamList(datum) {
    let text = "";
    for (let key of Object.keys(datum)) {
        text += '<b>' + key + ': </b>' + datum[key] + ', ';
    }
    text = text.slice(0, text.length - 2);
    return text;
}

