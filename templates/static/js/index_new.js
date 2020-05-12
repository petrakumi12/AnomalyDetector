window.onload = function () {
    // let session_storage =  JSON.parse(sessionStorage.cur_submission);
    // session_storage = {};
    let cur_submission = {};
    cur_submission.job_name = '';
    cur_submission.job_desc = '';
    cur_submission.job_type = '';
    sessionStorage.cur_submission = JSON.stringify(cur_submission);
    console.log('session storage', JSON.parse(sessionStorage.cur_submission));

    add_navbar();
    type_logo();
};


function type_logo() {
    new Typed('.typed', {
        strings: ["Anomaly Detector"],
        typeSpeed: 100,
        startDelay: 50,
        showCursor: false

    })
}