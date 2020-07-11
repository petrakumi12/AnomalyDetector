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