//dictionary of all algorithm names and descriptions
let algorithmDescriptions = {
    'Telemanom': 'Telemanom is a method created by scientists at NASA that uses the difference between real and predicted signal values in an interval to automatically generate an error threshold. All points with errors above the threshold are marked as anomalies.',
    'Variation with Percentile-based Threshold': 'This method finds the variation of the signal values (either raw or LSTM-smoothed based on user preference), and marks as anomalous all points above a given percentile threshold. This percentile threshold is decided by the user.',
    'Variation with Standard Deviation-based Threshold': 'This method finds the variation of the signal values (either raw or LSTM-smoothed based on user preference), finds the mean and standard deviation of the variation array, then creates a threshold equal to mean + coefficient * standard deviation. The coefficient is decided by the user. All points whose variation is above the threshold is marked as anomalous.',
    'Variation of Variation with Standard Deviation-based Threshold': 'This method finds the variation of the signal values (either raw or LSTM-smoothed based on user preference), then takes the variation of the variation array. Then the mean and standard deviation of the variation of variation array are calculated, and a threshold is decided equal to mean + coefficient * standard deviation. The coefficient is decided by the user. All points whose variation of variation is above the threshold is marked as anomalous.'
};

window.onload = function () {
    addNavBar();
    addFooter();
    updateProgressBar(2.0);
    generateAlgorithmBtns();
};


/**
 * Generates buttons for selecting an anomaly detection algorithm.
 * If selected signal is raw then the button with the option "Telemanom" is not generated.
 */
function generateAlgorithmBtns() {

    if (signalIsRaw()) {
        delete algorithmDescriptions['Telemanom'];
    }

    algorithmNames = Object.keys(algorithmDescriptions);
    let allBtnsContainer = document.getElementById('options_here');
    for (let algorithmName of algorithmNames) {
        let algorithmBtn = generateOneAlgorithmBtn(algorithmName);
        addBtnListener(algorithmBtn, algorithmName);
    }

    /**
     * Generates a single button for selecting an anomaly detection algorithm with the inputted name.
     * @param algorithmName Name of an anomaly detection algorithm
     * @returns {HTMLElement} the generated button
     */
    function generateOneAlgorithmBtn(algorithmName) {
        let aBtnContainer = document.createElement('div');
        "form-group row-md-4 mx-auto".split(" ")
            .map(d => aBtnContainer.classList.add(d));

        let algorithmBtn = document.createElement('button');
        algorithmBtn.setAttribute('type', 'button');
        algorithmBtn.innerText = algorithmName;
        "btn btn-info center w-100".split(" ")
            .map(d => algorithmBtn.classList.add(d));

        aBtnContainer.appendChild(algorithmBtn);
        allBtnsContainer.appendChild(aBtnContainer);
        return algorithmBtn
    }

    /**
     * Adds listener to given button that updates
     * the algorithm description and name of currently selected algorithm on screen,
     * and updates sessionStorage with the selected job type and description.
     * Then it checks if the Next button should be enabled.
     * @param algorithmBtn HTML element of the algorithm button
     * @param algorithmName name of the algorithm
     */
    function addBtnListener(algorithmBtn, algorithmName) {
        algorithmBtn.onclick = function () {
            //update description and currently picked method on screen
            updateAlgorithmDescription(algorithmName);
            updateCurrentlyPickedMethod(algorithmName);
            //update sessionStorage parameters
            updateSessionStorage('job_type', algorithmName, 'add');
            updateSessionStorage('job_desc', $('#description-input').val(), 'add');
            //check if next button should be enabled
            checkToEnableNextButton();
        };
    }
}

/**
 * Updates description of algorithm shown on screen.
 * @param algorithmName name of currently selected algorithm
 */
function updateAlgorithmDescription(algorithmName) {
    document.getElementById('help-div').innerText = algorithmDescriptions[algorithmName];
}

/**
 * Updates name of currently selected algorithm shown on screen.
 * @param algorithmName name of currently selected algorithm
 */
function updateCurrentlyPickedMethod(algorithmName) {
    document.getElementById('picked-method').innerText = algorithmName;
}

/**
 * Function called when user inputs a job name.
 * It updates job_name in sessionStorage and checks if the Next button should be enabled.
 */
function jobNameInputted() {
    let jobNameInput = document.getElementById('job-name-input').value;
    updateSessionStorage('job_name', jobNameInput, 'add');
    checkToEnableNextButton()
}

/**
 * Checks to see if the Next button should be enabled.
 * The button is enabled when the user has selected an algorithm and has inputted a job name.
 */
function checkToEnableNextButton() {
    let jobNameImput = document.getElementById('job-name-input').value;
    let pickedAnomalyDetector = document.getElementById('picked-method').innerText;
    (jobNameImput !== "" && pickedAnomalyDetector !== 'None') ? enableNextButton() : disableNextButton()
}

/**
 * Checks if the date-as-name checkbox is selected,
 * and if yes then put as job name the current datetime.
 * Then check if the Next button should be enabled.
 */
function useDateAsName() {
    let dateAsNameIsChecked = document.getElementById('date-as-name').checked;
    if (dateAsNameIsChecked) {
        document.getElementById("job-name-input").value = getCurDateTime();
        checkToEnableNextButton()
    } else {
        document.getElementById("job-name-input").value = "";
        checkToEnableNextButton()
    }
}

/**
 * Gets and formats current date time
 * @returns {string} formatted date time
 */
function getCurDateTime() {
    let currentDate = new Date();
    let date = currentDate.getDate();
    let month = currentDate.getMonth();
    let year = currentDate.getFullYear();
    let time = currentDate.getHours() + "." + currentDate.getMinutes() + "." + currentDate.getSeconds();
    return year + "-" + (month + 1) + "-" + date + '_' + time
}




