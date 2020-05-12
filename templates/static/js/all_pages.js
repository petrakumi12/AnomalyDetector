function get_sessionStorage() {
    return JSON.parse(sessionStorage.cur_submission)
}


function init_progress_bar(num) {
    let bar = new ProgressBar.Line("#progress-div", {
        strokeWidth: 1,
        easing: 'easeInOut',
        duration: 1400,
        color: '#1b95b1',
        trailColor: '#eee',
        trailWidth: 1,
        svgStyle: {width: '100%', height: '50%'},
        from: {color: '#56a89f'},
        to: {color: '#307891'},
        step: (state, bar) => {
            bar.path.setAttribute('stroke', state.color);
        }
    });
    bar.set((num / 4.0) - (1.0 / 4.0));
    bar.animate(num / 4.0)
}


function add_navbar() {
    let brand = document.createElement('a');
    brand.setAttribute('id', 'anomaly-detector-name');
    brand.setAttribute('href', '/');
    brand.style.color = '#17A2B8';
    brand.innerText = 'AnomalyDetector';

    "navbar-brand ml-5".split(" ").map(d => brand.classList.add(d));

    let collapse_btn = document.createElement('button');
    collapse_btn.setAttribute('type', 'button');
    collapse_btn.setAttribute('data-toggle', 'collapse');
    collapse_btn.setAttribute('aria-expanded', 'false');
    "navbar-toggler btn-info".split(" ").map(d => collapse_btn.classList.add(d));

    let span = document.createElement('span');
    span.classList.add('navbar-toggler-icon');

    collapse_btn.appendChild(span);

    let links_container = document.createElement('div');
    "collapse navbar-collapse".split(" ").map(d => links_container.classList.add(d));

    let links_list = document.createElement('ul');
    links_list.style.textAlign = 'center';
    "navbar-nav mr-auto".split(" ").map(d => links_list.classList.add(d));

    let new_job_item = document.createElement('li');
    "nav-item dropdown".split(" ").map(d => new_job_item.classList.add(d));
    let new_job_link = document.createElement('a');
    new_job_link.setAttribute('data-toggle', 'dropdown');
    new_job_link.setAttribute('aria-haspopup', 'true');
    new_job_link.style.color = '#0a454e';
    new_job_link.innerText = 'Submit a new job';
    "nav-link dropdown-toggle".split(" ").map(d => new_job_link.classList.add(d));

    let new_job_dropdowns = document.createElement('div');
    new_job_dropdowns.classList.add('dropdown-menu');

    let pairs = {
        'From raw signal': 'raw',
        'From new LSTM model': 'LSTM-new',
        'From previously trained LSTM model': 'LSTM-prev'
    };
    for (let key of Object.keys(pairs)) {
        let el = document.createElement('a');
        el.classList.add('dropdown-item');
        el.onclick = function () {
            save_method_and_next(pairs[key])
        };
        el.innerText = key;
        new_job_dropdowns.appendChild(el);
    }

    let prev_job_item = document.createElement('li');
    prev_job_item.classList.add('nav-item');
    let prev_job_link = document.createElement('a');
    prev_job_link.style.color = '#0a454e';
    prev_job_link.href = '/results';
    prev_job_link.innerText = 'View previous jobs';
    prev_job_link.classList.add('nav-link');


    let navbar = document.getElementById('navbar');
    navbar.appendChild(brand);
    navbar.appendChild(collapse_btn);
    navbar.appendChild(links_container);
    links_container.appendChild(links_list);
    links_list.appendChild(new_job_item);
    new_job_item.appendChild(new_job_link);
    new_job_item.appendChild(new_job_dropdowns);
    links_list.appendChild(prev_job_item);
    prev_job_item.appendChild(prev_job_link);

}

function add_footer() {

    let footer = document.createElement('footer');
    "justify-content-right fixed-bottom px-5 py-2 bg-light".split(" ")
        .map(d => footer.classList.add(d));
    let btn = document.createElement('button');
    btn.setAttribute('type', 'button');
    btn.setAttribute('id', 'next-btn');
    "btn btn-info float-right".split(" ")
        .map(d => btn.classList.add(d));
    btn.disabled = true;
    btn.addEventListener('click', e => {
        e.preventDefault();
        next()
    });
    btn.innerText = 'Next';

    footer.appendChild(btn);
    document.getElementById('footer-here').appendChild(footer);


    // <footer class="justify-content-right fixed-bottom" style="position:absolute; bottom: 0; right: 0; width: 100%;">
    //     <button class="btn btn-info float-right" type="button" id="next-btn" onclick="next(1)" disabled>Next</button>
    // </footer>
}

function save_method_and_next(type) {
    let temp_storage = JSON.parse(sessionStorage.cur_submission);
    temp_storage.signal_type = type;
    sessionStorage.cur_submission = JSON.stringify(temp_storage);
    if (temp_storage.signal_type === 'LSTM-prev') {
        window.location.href = '/new_job_prev';
    } else {
        window.location.href = '/pick_method';
    }
}


function next() {
    let page_title = document.title;
    console.log('next called with page name', page_title);
    switch (page_title) {
        case "Anomaly Detector | Pick New Method":
            go_to_lstm_parameters();
            break;
        case "Anomaly Detector | New Job from Previous":
            window.location.href = '/pick_method';
            break;
        case "Anomaly Detector | Pick Parameters":
            go_to_submitted_success();
            break;

    }

    function go_to_lstm_parameters() {
        let job_name = document.getElementById('job-name-input').value;
        let job_desc = document.getElementById('description-input').value;
        let job_type = document.getElementById('picked-method').innerText;

        let storage = get_sessionStorage();
        storage.job_name = job_name;
        storage.job_desc = job_desc;
        storage.job_type = job_type;
        sessionStorage.cur_submission = JSON.stringify(storage);
        window.location.href = '/lstm_parameters';
    }

    function go_to_submitted_success() {
        //gets parameters inputted by user
        let lstm_params = get_all_lstm_user_params();
        console.log('lstm params', lstm_params);

        storage.params = lstm_params;
        if (storage.user_uploads !== undefined) {
            storage.params.sets = storage.user_uploads;
            delete storage.user_uploads;
        }
        //checking what items need to be uploaded to database permanently
        let to_upload = [];
        for (let type of ['train', 'test']) {
            if (storage.params.sets.types[type] === 'user_upload') {
                for (let el of storage.params.sets[type]) {
                    to_upload.push(el)
                }
            }
        }
        if (to_upload.length !== 0) {
            to_upload = [...new Set(to_upload)]; //removing repeated elements from arr
            let url = '/upload_new_datasets';
            fetch(url, {
                method: "POST",
                headers: {'Content-type': 'application-json'},
                body: JSON.stringify({'to_upload': to_upload})
            }).then(res => console.log('submitted new sets for upload', res))
        }
        sessionStorage.cur_submission = JSON.stringify(storage);

        window.location.href = '/submitted';
    }
}