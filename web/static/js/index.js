window.onload = function () {
    initializeSessionStorage();
    addNavBar();
    typeLogo();
};

/**
 * Uses the Typed library to type AnomalyDetector name.
 */
function typeLogo() {
    new Typed('.typed', {
        strings: ["Anomaly Detector"],
        typeSpeed: 100,
        startDelay: 50,
        showCursor: false

    })
}

/**
 * Initializes a new anomaly detection job submission
 * by updating sessionStorage signal_type parameter
 * to the signal type selected by the user, then moving to next page of submission.
 * @param signalType type of signal selected by user to be used in the anomaly detection job
 */
function startNewAnomalyDetectionJob(signalType){
     updateSessionStorage('signal_type', signalType, 'add');
     signalIsLSTMPrev() ? window.location.href = '/pickPreviousLSTMModel' : window.location.href = '/pickAnomalyDetector';
}