'use strict';
let allDbDatasets, parametersToLoad = [], defaultParamDict = {};

let typeArray = ['test']; //array of types of datasets - can contain test and train

//dictionary of inputted datasets
// and whether they are selected from Mongo or newly uploaded
let userUploadsDict = {
    'types': {
        'train': "",
        'test': ""
    },
    'train': [],
    'test': []
};

window.onload = function () {
    populateWithDefaultParameters('all').then(_ => { //populate all parameter inputs with default params
        getUploadedDatasets().then(_ => { //get names of datasets that have been uploaded to mongodb previously
            updateSessionStorage('user_uploads', userUploadsDict, 'add'); //add user_uploads section to sessionStorage
            addNavBar(); //add navbar
            updateProgressBar(3.0); //update progress bar to third step
            //if signal is from new LSTM model add train to typeArray else hide the inputs relating to training sets
            signalIsLSTMNew() ? typeArray.push('train') : hideTtrainingSetInputs();
            getAlgorithmsForParamTable(); //get the algorithms whose parameters we want shown in the table
            updateParameterTable(); //update the parameters table with just params for necessary algorithms
            addFooter(); //add footer
            addListeners(); //add listeners to buttons and inputs
            populateSetSelectors(); //add all previously uploaded datasets to multiselect input
        })
    });
};

/**
 * Gets default parameters of all algorithms as a dictionary
 * and stores them on the defaultParamDict variable.
 * @returns {Promise<void>}
 */
async function getDefaultParameters() {
    await fetch('/getDefaultParameters', {
        method: 'GET',
    })
        .then(response => response.json())
        .then(response => defaultParamDict = response)
}

/**
 * Populates HTML element of given ID with default parameter.
 * @param objectId ID of HTML element. If 'all' then all algorithm parameter
 * inputs are populated with defaults.
 */
async function populateWithDefaultParameters(objectId) {
    getDefaultParameters().then(response => {
        if (objectId !== 'all') {
            document.getElementById(objectId).value = response[objectId];
        }
        else {
            for (let el of parametersToLoad) {
                for (let aParameterDictionary of Object.values(defaultParamDict[el].params)) {
                    let objectId = aParameterDictionary.config_name;
                    let element = document.getElementById(objectId);
                    //element can have an input tag or select
                    if (element.tagName === 'input') {
                        element.value = response[objectId]
                    } else {
                        //if not input then need to make sure we can both see and retrieve its value later
                        element.options[0].text = response[objectId];
                        element.options[0].value = response[objectId];
                        element.options[0].selected = true;
                    }
                }
            }
        }
    })
}

/**
 * Gets all datasets that were previously uploaded to MongoDb and saves to allDbDatasets variable.
 * @returns {Promise<void>}
 */
async function getUploadedDatasets() {
    await fetch('/getUploadedDatasets', {
        method: 'GET',
    })
        .then(response => response.json())
        .then(response => allDbDatasets = response);
}


/**
 * Populates multiselect elements of training and testing sets
 * with datasets that were previously uploaded to Mongo.
 */
function populateSetSelectors() {
    let testSetDbInput = document.getElementById('test-set-db-input');
    for (let fileName of Object.keys(allDbDatasets)) {
        let option = document.createElement('option');
        option.innerText = fileName;
        testSetDbInput.appendChild(option);
    }
    if (signalIsLSTMNew()) {
        document.getElementById('train-set-db-input').innerHTML = testSetDbInput.innerHTML;
    }

}

/**
 * Retrieves the data from files uploaded from user's local storage.
 * @param fileList a fileList object containing information about uploaded files.
 * @returns {Promise<void>}
 */
async function uploadNewDataset(fileList) {

    // FileList object
    let files = fileList.files;
    let fileNameList = [];

    //for each file set what happens when it loads successfully and unsuccessfully
    for (let i = 0, f; f = files[i]; i++) {
        let reader = new FileReader();
        reader.onload = await (e => processCsv(e, f.name, fileList.id));
        reader.onerror = errorHandler;
        reader.readAsText(f);
        fileNameList.push(f.name);
    }

    //if there are no elements in the list of file names, then replace with preset statement
    fileNameList[0] === "" ? fileNameList = 'Or upload new set' : {};

    //update text of fileList elements
    let nextSibling = fileList.nextElementSibling;
    nextSibling.innerText = fileNameList;

    setTimeout(_ => {
        // disable multiselect and assign values to start end time
        enableOrDisableMultiSelect(fileList.id.split("-")[0], true);
        setTrainingSetSectionPoints();
    }, 500);


    /**
     * Loads and processes csv files that are inputted by the user
     * @param event
     * @param name
     * @param id
     * @returns {Promise<void>}
     */
    function processCsv(event, name, id) {
        let csv = event.target.result; //the content of the csv file
        let allTextLines = csv.split(/\r\n|\n/); //formatted content
        let signalValuesCol = [];
        let eventValuesCol = [];
        for (let i = 0; i < allTextLines.length; i++) {
            let data = allTextLines[i].split(','); //array of row elements
            if (data[0] !== '') {
                signalValuesCol.push(parseFloat(data[0]));
                //check if the second column does not exist, if so push 0 else push the element
                (data[1] === null || data[1] === undefined) ? eventValuesCol.push(0) : eventValuesCol.push(parseFloat(data[1]))
            }
        }
        //dictionary of data to be added to sessionStorage and mongo
        let formattedData = formatDataForUserUploadsArray(name, signalValuesCol, eventValuesCol);
        //add to user_uploads in sessionStorage
        console.log('entry data', formattedData);
        updateSessionStorageUserUploads(formattedData, 'user_upload', id.split('-')[0])
    }

    /**
     * Handles what happens if file handling outputs an error.
     * @param event the file handling event
     */
    function errorHandler(event) {
        if (event.target.error.name === "NotReadableError") {
            alert("Cannot read file !");
        }
    }
}


/**
 * Handles clearing of the user-uploaded csv files when the Clear button is pressed
 * Removes all uploaded files and re-enables the multiselect box of previously uploaded datasets
 * @param type train or test to denote which upload box to disable and which multiselect to enable
 */
function clearUserUploads(type) {
    let uploadInputId = type + 'set-upload-input';
    //remove the previously uploaded file
    document.getElementById(uploadInputId).parentElement.innerHTML = '<input type="file" data-height="500" class="custom-file-input white" id=' + uploadInputId + ' ' +
        'aria-describedby="test-set-upload-input" accept=".csv" onchange="uploadNewDataset(this)">' +
        '<label class="custom-file-label text-muted"  style="height:100%"  for=' + uploadInputId + '>Or upload new set</label>';
    // enable multiselect
    enableOrDisableMultiSelect(type, false);
}

/**
 * Adds listeners to HTML elements in the page:
 * clear buttons
 * multiselect menus
 * the form containing all elements to be filled in by user
 */
function addListeners() {

    for (let type of typeArray) {
        console.log('type', type);
        addClearButtonListeners(type);
        addMultiselectListeners(type);
    }
    addFormListener();

    /**
     * Adds listeners to the Clear buttons to remove all user-uploaded datasets when clicked
     * @param type train or test
     */
    function addClearButtonListeners(type) {
        document.getElementById(`clear-${type}-upload`).onclick = e => {
            e.preventDefault();
            clearUserUploads(type)
        };
    }

    /**
     * Adds listeners to multiselect inputs used to select previously uploaded datasets.
     * @param type train or test
     */
    function addMultiselectListeners(type) {

        let multiSelectInput = document.getElementById(`${type}-set-db-input`);
        multiSelectInput.onclick = _ => processSelectedDataset(type);

        /**
         * Processes the datasets selected by user on a multiselect input.
         * This entails getting signal values and events of the given dataset as arrays, formatting as dictionary,
         * adding to user_uploads key in sessionStorage, then calling function to disable upload button and set datapoints
         * for training set section.
         */
        function processSelectedDataset(type) {
            $(`#${type}-set-db-input`)
                .val()
                .map(datasetName => {
                    let signalValuesArray = allDbDatasets[datasetName]; //array of dataset's raw signal values
                    let emptyEventsArray = new Array(allDbDatasets[datasetName].length).fill(0); //empty array that will be populated with events if any
                    //dataset info formatted as dictionary
                    let formattedData = formatDataForUserUploadsArray(datasetName, signalValuesArray, emptyEventsArray);
                    updateSessionStorageUserUploads(formattedData, 'prev_datasets', type).then(_ => {
                        checkToDisableDatasetUpload(); // if user uploaded new set from local storage then need to disable multiselect
                        setTrainingSetSectionPoints(); // set datapoints for starting and ending section from which LSTM will train
                    })
                });
        }

        /**
         * Disables the button to upload new datasets if user has selected one through the multiselect input
         */
        function checkToDisableDatasetUpload() {
            let condition = $(`#${type}-set-db-input`).val().length > 0;
            condition ? enableOrDisableDatasetUpload(type, true) : enableOrDisableDatasetUpload(type, false);
        }
    }

    /**
     * Adds to form an onchange listener that when activated calls the function that checks whether the next button should be enabled
     */
    function addFormListener() {
        for (let aMultiSelect of document.getElementsByTagName('form')) {
            aMultiSelect.onchange = _ => enableOrDisableNextBtn();
        }


        /**
         * Enables or disables the Next button in the footer depending on whether all fields have been fulfilled:
         * Checks for all fields fulfilled by checking if all necessary parameters in sessionStorage have been added.
         * If not then keep button disabled otherwise enable it.
         */
        function enableOrDisableNextBtn() {

            getAllUserParameterInputs().then(parameterDict => { //get all parameters inputted by user
                let arrayToCheck = parameterDict;
                //delete parts of the array that are only significant for new LSTM Model
                if (!signalIsLSTMNew()) {
                    delete arrayToCheck.sets.train;
                    delete arrayToCheck.times;
                }

                let willDisable = false; //determines whether to disable Next button

                for (let key of Object.keys(arrayToCheck)) {
                    for (let dictElement of Object.values(arrayToCheck[key])) { //check all values in array and all the elements in each value
                        //trigger willDisable if the current element is empty or null, else continue checking
                        (dictElement === undefined || dictElement === "" || dictElement.length === 0) ? willDisable = true : {}
                    }
                }

                //if Next button will be enabled then call the function, convert content from user_uploads
                // in sessionStorage to params, then call fcn to upload datasets to Mongo if necessary.
                if (!willDisable) {
                    enableNextButton();
                    userUploadsToParams();
                    uploadDatasetsToDatabase();
                }
            });
        }
    }
}


/**
 * Gets all user-inputted parameters to add to the parameterDict variable:
 * - train and test datasets,
 * - section start and end datapoints for the training set,
 * - values for all algorithm parameters
 * @returns {{sets: {train: Array, test: Array}, times: {type: string, param_1: string, param_2: string}, alg_params: {}}}
 */
async function getAllUserParameterInputs() {
    // train and test sets
    console.log('param dict here', parameterDict);
    let datasetNameArray = await getSelectedDatasets();
    for (let type of Object.keys(datasetNameArray)) {
        parameterDict.sets[type] = datasetNameArray[type];
    }
    // training section start and end datapoints
    parameterDict.times = getTrainingSetSectionPoints();

    // all other algorithm parameters
    parameterDict.alg_params = getInputtedAlgorithmParameters();
    return parameterDict;
}

/**
 * Uploads to MongoDb datasets uploaded to page by user, for both training and testing.
 * Function checks if the dataset already exists in Mongo;
 * if it does not, it saves it to the database.
 */
function uploadDatasetsToDatabase() {
    //checking what items need to be uploaded to database permanently
    let toUpload = []; //array with items that will be uploaded to Mongo
    logSessionStorage();
    //TODO start from here
    for (let type of ['train', 'test']) {
        let storageByType = parseSessionStorage().params.sets[type];
        if (storageByType === 'user_upload') {
            for (let el of parseSessionStorage().params.sets[type]) {
                toUpload.push(el)
            }
        }
    }
    if (toUpload.length !== 0) {
        toUpload = [...new Set(toUpload)]; //removing repeated elements from array
        fetch('/uploadNewDatasets', {
            method: 'POST',
            headers: {'Content-type': 'application-json'},
            body: JSON.stringify({'to_upload': toUpload})
        })
    }
}


/**
 * Gets the inputted start and end data points for section that will be used fo train the model on.
 * @returns {{param_1: string, param_2: string}}
 */
function getTrainingSetSectionPoints() {
    let trainingSetSections = {param_1: "", param_2: ""};
    if (signalIsLSTMNew()) {
        trainingSetSections.type = 'times';
        trainingSetSections.param_1 = document.getElementById('start-time-input').value;
        trainingSetSections.param_2 = document.getElementById('end-time-input').value;
    }
    return trainingSetSections
}


/**
 * Updates the value of input box for datapoint that defines the end of the section of data to be used for training LSTM.
 * Called when new training sets are picked, and updates the input value to the sum of lengths of all selected arrays.
 */
function setTrainingSetSectionPoints() {
    //only have the training set inputs if new LSTM model is picked
    if (signalIsLSTMNew()) {
        let intervalArray = [];
        document.getElementById('start-time-input').value = 0;
        parseSessionStorage().user_uploads['train'].map(d => {
            (intervalArray !== undefined) ? intervalArray.push(d.sig_vals.length) : {}
        });
        document.getElementById('end-time-input').value = intervalArray.reduce((a, b) => (a + b), 0);
    }
}

/**
 * Gets the names of the datasets that the user selected for training and testing
 */
function getSelectedDatasets() {
    let nameDictionary = {};

    for (let type of ['train', 'test']) {
        // check if multiselect is disabled
        let inputMultiSelect = document.getElementById(type + '-set-db-input');
        if (inputMultiSelect !== null) {
            // if yes then update nameDictionary with 'upload'
            if (inputMultiSelect.disabled === true) {
                nameDictionary[type] = ['upload']
            } else {
                // if no then get all selected names from multiselect inputs
                let selectedArray = [];
                for (let selected of inputMultiSelect.selectedOptions) {
                    selectedArray.push(selected.value)
                }
                nameDictionary[type] = selectedArray
            }
        }
    }
    return nameDictionary
}

/**
 * Check if the user wants to train and test on the same datasets.
 * If checkbox is checked then the datasets selected for testing are updated to be the same as the ones selected for training inputs.
 * @param checkBox the checkbox asking for training and testing on the same sets
 */
function checkSameTrainTestSets(checkBox) {
    // if checkbox checked then update testing to be the same as training
    if (checkBox.checked) {
        if (parseSessionStorage().params.sets.types.train === "prev_datasets") {
            document.getElementById('test-set-db-input').value = document.getElementById('train-set-db-input').value;
        } else {
            console.log(document.getElementById('train-set-upload-input').files);
            let btnUpload = document.getElementById('test-set-upload-input');
            btnUpload.files = document.getElementById('train-set-upload-input').files;
            uploadNewDataset(btnUpload)
        }
    // if checkbox not checked then empty the training and testing set inputs
    } else {
        for(let element of ['train', 'test']){
            document.getElementById(`${element}-set-db-input`).value = '';
        clearUserUploads(element);
        }
    }
}

/**
 * Get all the algorithm parameters after they have been changed by the user
 * and return them as a dictionary with parameter id as key and its input as a value.
 * @returns {{paramId: inputValue}}
 */
function getInputtedAlgorithmParameters() {
    let updatedParameters = {};

    // iterate through all parameters
    for (let el of getParametersToLoad()) {
        for (let dictOfOneParam of Object.values(defaultParamDict[el].params)) {
            // id of parameter html element
            let nodeId = dictOfOneParam.config_name;
            // html element of the parameter
            let paramNode = document.getElementById(nodeId);
            // get the input accordingly
            if (paramNode.tagName.toLowerCase() === 'input') {
                updatedParameters[nodeId] = paramNode.value
            } else {
                updatedParameters[nodeId] = paramNode.options[paramNode.selectedIndex].text;
            }
        }
    }
    return updatedParameters
}

/**
 * Adds algorithm parameter in the algorithmsToLoad array
 * @param algorithmType
 */
function addParameterToLoad(algorithmType) {
    parametersToLoad.push(algorithmType)
}

/**
 * Retreives the parametersToLoad variable
 * @returns {Array}
 */
function getParametersToLoad() {
    return parametersToLoad
}

/**
 * Looks at the signal type to find what algorithm parameters will be added to the parameter table.
 * Every algorithm to be added is appended to the parametersToLoad array.
 */
function getAlgorithmsForParamTable() {
    if (parseSessionStorage().signal_type.includes('LSTM')) {
        if (signalIsLSTMNew()) {
            addParameterToLoad('LSTM-new');
        }
        addParameterToLoad('LSTM-prev');
    } else {
        let trainInputNode = document.getElementById('train-sets-here');
        trainInputNode.parentNode.removeChild(trainInputNode)
    }
    addParameterToLoad(parseSessionStorage().job_type);
}

/**
 * Updates the table of parameters to contain inputs on all relevant ones
 */
function updateParameterTable() {
    let parameterTable = document.getElementById('parameter-table');
    //iterate through all parameters to load
    for (let aParameterType of getParametersToLoad()) {

        //make container and header elements
        let columnContainer = document.createElement('div');
        "col h-100".split(" ").map(d => columnContainer.classList.add(d));

        let columnHeader = document.createElement('div');
        columnHeader.innerText = defaultParamDict[aParameterType].display_name;
        "card-header row-lg-4 w-100 bg-white d-flex justify-content-center".split(" ")
            .map(d => columnHeader.classList.add(d));

        columnContainer.appendChild(columnHeader);

        let parametersByType = defaultParamDict[aParameterType].params;
        for (let aParameterName of Object.keys(parametersByType)) {
            //add one parameter to the column
            addOneParamToTable(aParameterName, aParameterType, columnContainer)
        }
        //append one column with parameters
        parameterTable.appendChild(columnContainer);
    }
}

/**
 * Adds one parameter to the parameter table
 * @param aParameterName the parameter
 * @param aParameterType the type of parameter
 * @param columnContainer the container where the param element will be added
 */
function addOneParamToTable(aParameterName, aParameterType, columnContainer) {
    let parametersByType = defaultParamDict[aParameterType].params;
    let configName = parametersByType[aParameterName].config_name;
    let defaultValue = parametersByType[aParameterName].default;
    let type = parametersByType[aParameterName].type;

    let rowContainer = document.createElement('div');
    rowContainer.style.width = '100%';
    "row w-100 mx-4 my-2".split(" ").map(d => rowContainer.classList.add(d));

    let label = document.createElement('label');
    label.setAttribute('for', configName);
    label.onclick = _ => populateWithDefaultParameters(configName);
    label.innerText = aParameterName;
    "col-sm-6 col-form-label".split(" ").map(d => label.classList.add(d));

    let input;
    if (type === undefined) {
        input = document.createElement('input');
        input.setAttribute('type', 'text');
    } else {
        input = document.createElement('select');
        input.setAttribute('size', '1');
        input.searchable = true;
        let option = document.createElement('option');
        option.selected = true;
        option.innerText = defaultValue;
        input.appendChild(option)
    }
    input.setAttribute('id', configName);
    input.setAttribute('value', defaultValue);
    "col-sm-4 form-control".split(" ").map(d => input.classList.add(d));

    rowContainer.appendChild(label);
    rowContainer.appendChild(input);
    columnContainer.appendChild(rowContainer);

}

/**
 * Hides inputs that relate to training sets.
 */
function hideTtrainingSetInputs() {
    //hide the inputs to select or upload datasets for training, and inputs to set training set sections
    var trainingSetNode = document.getElementById('train-sets-here');
    trainingSetNode.innerHTML = "";
    //hide checkbox for training and testing on same files
    var trainTestSameCheck = document.getElementById('same-set-check');
    trainTestSameCheck.parentNode.removeChild(trainTestSameCheck);
    //hide label for that checkbox
    var trainTestSameCheckLabel = document.getElementById('same-set-check-label');
    trainTestSameCheckLabel.parentNode.removeChild(trainTestSameCheckLabel);
}

/**
 * Will enable or disable the dataset upload input box for the train or test set
 * @param type train or test
 * @param willDisable boolean true if the input will be disabled
 */
function enableOrDisableDatasetUpload(type, willDisable) {
    document.getElementById(type + '-set-upload-input').disabled = willDisable;
    document.getElementById('clear-' + type + '-upload').disabled = willDisable;
}

/**
 * Will enable or disable the dataset multiselect input box for the train or test set
 * @param type train or test
 * @param willDisable boolean true if the input will be disabled
 */
function enableOrDisableMultiSelect(type, willDisable) {
    let multiSelectInputId = type + 'set-db-input';
    let multi = document.getElementById(multiSelectInputId);
    !willDisable ? multi.value = '' : {};
    multi.disabled = willDisable;
}

/**
 * Formats data into a dictionary to be added to user_uploads in sessionStorage
 * @param setName name of dataset
 * @param setSignalVals array of signal values for dataset
 * @param setEvents array of events for dataset
 * @returns {{name: *, sig_vals: *, events: *}}
 */
function formatDataForUserUploadsArray(setName, setSignalVals, setEvents) {
    return {
        'name': setName,
        'sig_vals': setSignalVals,
        'events': setEvents
    }
}

/**
 * Updates the user_uploads parameter of sessionStorage
 * @param data the data to add to user_uploads
 * @param selectionType whether the data added is through upload or multiselect
 * @param trainOrTest train or test
 * @returns {Promise<void>}
 */
async function updateSessionStorageUserUploads(data, selectionType, trainOrTest) {
    logSessionStorage();
    let userUploads = parseSessionStorage().user_uploads;
    await userUploads[trainOrTest].push(data);
    userUploads.types[trainOrTest] = selectionType;
    updateSessionStorage('user_uploads', userUploads, 'add');
    logSessionStorage()
}

/**
 * Adds data located in user_uploads key to params key in sessionStorage
 */
function userUploadsToParams() {
    getAllUserParameterInputs().then(allAlgorithmParameters => {
        console.log('all alg params', allAlgorithmParameters);
        allAlgorithmParameters.sets = parseSessionStorage().user_uploads;
        updateSessionStorage('params', allAlgorithmParameters, 'add');
    })
}

/**
 * Adds data located in params key to user_uploads key in sessionStorage
 * Removes the user_uploads parameter after updating
 */
function paramsToUserUploads() {
    let newParams = {};
    newParams.sets = parseSessionStorage().user_uploads;
    newParams.times = parseSessionStorage().params.times;
    newParams.alg_params = parseSessionStorage().params.alg_params;
    updateSessionStorage('params', newParams, 'add');
    updateSessionStorage('user_uploads', '', 'remove');
}