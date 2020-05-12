'use strict';

window.onload = function () {
    add_navbar();
    init_progress_bar(4.0);
    let args = get_sessionStorage();
    console.log(args);
    console.log('submitting');

    let text_container = document.getElementById('index-title');
    let h3_row = document.createElement('div');
    h3_row.style.width = '100%';
    "row justify-content-center".split(" ").map(d => h3_row.classList.add(d));
    let h5_row = document.createElement('div');
    h5_row.style.width = '100%';
    "row justify-content-center".split(" ").map(d => h5_row.classList.add(d));

    h3_row.innerText = 'Submitting job ' + args.job_name;
    h5_row.innerText = 'Job type: ' + args.job_type;

    let url = "/submit_request";
    if (args.job_name !== '') {
        fetch(url, {
            method: 'POST',
            headers: {'Content-type': 'application-json'},
            body: JSON.stringify(args)
        }).then(res =>  {
            console.log('res before json', res);
             if (res.status === 200) {
            res.json().then(res => {
                console.log('res', res);
                h3_row.innerHTML = '<h3>Submission Successful! ID: ' + res.id + '</h3>';
                h5_row.innerHTML = '<h5>What do you want to do now?</h5>';
            })
        } else {
                 h3_row.innerHTML = '<h3>Submission Failed!</h3>';
                h5_row.innerHTML = '<h5>Please make a new submission</h5>';
             }
        });
    } else {
        if (args.job_name === '') {
            h3_row.innerHTML = '<h3>Cannot submit the same job twice!</h3>';
            h5_row.innerHTML = '<h5>Please make a new submission</h5>';

        }
    }
    text_container.appendChild(h3_row);
    text_container.appendChild(h5_row);


    let cur_submission = {};
    cur_submission.job_name = '';
    cur_submission.job_desc = '';
    cur_submission.job_type = '';
    sessionStorage.cur_submission = JSON.stringify(cur_submission);
    console.log('session storage', JSON.parse(sessionStorage.cur_submission));
};
