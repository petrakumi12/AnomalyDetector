'use strict';
let titleContainer, subtitleContainer, submissionResponse;


window.onload = function () {
    addNavBar();
    updateProgressBar(4.0);
    updateGlobals(); //update global variables
    updateTitleText('new', ''); //update text shown on screen for submission
    //if sessionStorage has a job name then it's a first time submission for this particular job, else it's repeated
    (parseSessionStorage().job_name === '') ? repeatSubmission() : firstTimeSubmission();
    initializeSessionStorage(); //empty out sessionStorage
};

/**
 * Submits new job and updates screen text depending on whether submission succeeds or fails
 */
function firstTimeSubmission() {
    //submit job details from sessionStorage
    submitNewJob().then(_ => {
        //if successfully submitted then update title shown on screen to success
        if (submissionResponse.status === 200) {
            submissionResponse.json()
                .then(res => updateTitleText('success', res))
        } else {
            //if failed then reflect that on screen
            updateTitleText('fail', '')
        }
    });
}

/**
 * Update screen to show an attempt at repeat submission
 */
function repeatSubmission() {
    updateTitleText('repeat', '')
}

/**
 * Update global variables
 */
function updateGlobals() {
    titleContainer = document.getElementById('submission-text-1');
    subtitleContainer = document.getElementById('submission-text-2');
}

/**
 * Submit sessionStorage content as new job and record the response on the submissionResponse object
 * @returns {Promise<void>}
 */
async function submitNewJob() {
    await fetch("/submitRequest", {
        method: 'POST',
        headers: {'Content-type': 'application-json'},
        body: JSON.stringify(parseSessionStorage())
    }).then(response => submissionResponse = response)
}

/**
 * Update title on screen depending on result of submission
 * @param type A string saying success, fail , or repeat
 * @param res Result of submission
 */
function updateTitleText(type, res) {
    switch (type) {
        case 'new':
            newUpdateTitles();
            break;
        case 'success':
            successUpdateTitles(res);
            break;
        case 'fail':
            failUpdateTitles();
            break;
        case 'repeat':
            multiSubmitUpdateTitles();
            break;
    }

    /**
     * Change title text to submitting new job
     */
    function newUpdateTitles() {
        titleContainer.innerText = 'Submitting job ' + parseSessionStorage().job_name;
        subtitleContainer.innerText = 'Job type: ' + parseSessionStorage().job_type;
    }

    /**
     * Change title text to successful submission
     * @param res Submission response
     */
    function successUpdateTitles(res) {
        titleContainer.innerHTML = '<h3>Submission Successful! ID: ' + res.id + '</h3>';
        subtitleContainer.innerHTML = '<h5>What do you want to do now?</h5>';
    }

    /**
     * Change title text to failed submission
     */
    function failUpdateTitles() {
        titleContainer.innerHTML = '<h3>Submission Failed!</h3>';
        subtitleContainer.innerHTML = '<h5>Please make a new submission</h5>';
    }

    /**
     * Change title text to repeat submission
     */
    function multiSubmitUpdateTitles() {
        titleContainer.innerHTML = '<h3>Cannot submit the same job twice!</h3>';
        subtitleContainer.innerHTML = '<h5>Please make a new submission</h5>';
    }
}



