let parameterDict = {
    'sets': {
        'train': [],
        'test': []
    },
    'times': {
        'type': "",
        'param_1': "",
        'param_2': ""
    },
    'alg_params': {}
}; //dictionary of algorithm parameters to be filled in when user selects anomaly detector

/**
 * Checks if the user wants to run anomaly detector on signal smoothed using newly trained LSTM model.
 * @returns {boolean}
 */
function signalIsLSTMNew() {
    return parseSessionStorage().signal_type === "LSTM-new"
}

/**
 * Checks if the user wants to run anomaly detector on signal smoothed using a previously trained LSTM model.
 * @returns {boolean}
 */
function signalIsLSTMPrev() {
    return parseSessionStorage().signal_type === "LSTM-prev"
}

/**
 * Checks if the user wants to run anomaly detector on raw signal values.
 * @returns {boolean}
 */
function signalIsRaw() {
    return parseSessionStorage().signal_type === "raw"
}

/**
 * Updates progress bar shown on the top of the page.
 * @param num A float between 1.0 and 4.0 since there are up to 4 steps in submitting a new anomaly detection job
 */
function updateProgressBar(num) {
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
        step: (state, bar) => bar.path.setAttribute('stroke', state.color)
    });
    bar.set((num / 4.0) - (1.0 / 4.0));
    bar.animate(num / 4.0)
}

/**
 * Adds navbar to the top of the page.
 * The navbar contains the logo which links to the homepage,
 * a dropdown menu to start new anomaly detection job,
 * and a link to view previously submitted jobs.
 */
function addNavBar() {
    //anomalydetector logo link
    let brand = document.createElement('a');
    brand.setAttribute('id', 'anomaly-detector-name');
    brand.setAttribute('href', '/');
    brand.innerText = 'AnomalyDetector';
    "navbar-brand ml-5".split(" ").map(d => brand.classList.add(d));

    //dropdown button to start a new anomaly detection job
    let btnCollapse = document.createElement('button');
    btnCollapse.setAttribute('type', 'button');
    btnCollapse.setAttribute('data-toggle', 'collapse');
    btnCollapse.setAttribute('aria-expanded', 'false');
    "navbar-toggler btn-info".split(" ").map(d => btnCollapse.classList.add(d));

    let span = document.createElement('span');
    span.classList.add('navbar-toggler-icon');

    btnCollapse.appendChild(span);

    let linksContainerDiv = document.createElement('div');
    "collapse navbar-collapse".split(" ").map(d => linksContainerDiv.classList.add(d));

    let linksList = document.createElement('ul');
    linksList.style.textAlign = 'center';
    "navbar-nav mr-auto".split(" ").map(d => linksList.classList.add(d));

    let newJobListItem = document.createElement('li');
    "nav-item dropdown".split(" ").map(d => newJobListItem.classList.add(d));
    let newJobItemLink = document.createElement('a');
    newJobItemLink.setAttribute('data-toggle', 'dropdown');
    newJobItemLink.setAttribute('aria-haspopup', 'true');
    newJobItemLink.style.color = '#0a454e';
    newJobItemLink.innerText = 'Submit a new job';
    "nav-link dropdown-toggle".split(" ").map(d => newJobItemLink.classList.add(d));

    let newJobDropdowns = document.createElement('div');
    newJobDropdowns.classList.add('dropdown-menu');

    let pairs = {
        'From raw signal': 'raw',
        'From new LSTM model': 'LSTM-new',
        'From previously trained LSTM model': 'LSTM-prev'
    };

    for (let key of Object.keys(pairs)) {
        let el = document.createElement('a');
        el.classList.add('dropdown-item');
        el.onclick = function () {
            updateSessionStorage('signal_type', pairs[key], 'add');
            startAnomalyDetectionJob(pairs[key])
        };
        el.innerText = key;
        newJobDropdowns.appendChild(el);
    }

    //link to view previously submitted jobs
    let submittedJobsListItem = document.createElement('li');
    submittedJobsListItem.classList.add('nav-item');
    let submittedJobsListItemLink = document.createElement('a');
    submittedJobsListItemLink.style.color = '#0a454e';
    submittedJobsListItemLink.href = '/results';
    submittedJobsListItemLink.innerText = 'View previous jobs';
    submittedJobsListItemLink.classList.add('nav-link');

    //appending all elements to navbar
    let navbar = document.getElementById('navbar');
    navbar.appendChild(brand);
    navbar.appendChild(btnCollapse);
    navbar.appendChild(linksContainerDiv);
    linksContainerDiv.appendChild(linksList);
    linksList.appendChild(newJobListItem);
    newJobListItem.appendChild(newJobItemLink);
    newJobListItem.appendChild(newJobDropdowns);
    linksList.appendChild(submittedJobsListItem);
    submittedJobsListItem.appendChild(submittedJobsListItemLink);

}

/**
 * Adds footer containing the Next button.
 * Next button has an onclick listener to the next() function.
 */
function addFooter() {

    //create footer element and add classes
    let aFooter = document.createElement('footer');
    "justify-content-right fixed-bottom px-5 py-2 bg-light".split(" ")
        .map(d => aFooter.classList.add(d));

    //create next button element and add classes/attributes
    let nextBtn = document.createElement('button');
    nextBtn.setAttribute('type', 'button');
    nextBtn.setAttribute('id', 'next-btn');
    nextBtn.disabled = true;
    nextBtn.innerText = 'Next';
    "btn btn-info float-right".split(" ")
        .map(d => nextBtn.classList.add(d));

    //add listener of the Next button
    addNextBtnListener();

    //append all elements
    let footerContainer = document.getElementById('footer-here');
    footerContainer.appendChild(aFooter);
    aFooter.appendChild(nextBtn);

    /**
     * Adds listener of Next button
     */
    function addNextBtnListener() {
        nextBtn.addEventListener('click', e => {
            e.preventDefault();
            next()
        });
    }

}


/**
 * Progresses to the next stage of job submission.
 * When user is in the parameter picking page, the user_uploads parameter is removed
 * and a small timeout is added to ensure sessionStorage is fully updated before moving on to the next page.
 */
function next() {
    let pageTitle = document.title;
    switch (pageTitle) {
        case "Anomaly Detector | Pick New Method":
            window.location.href = '/pickJobParameters';
            break;
        case "Anomaly Detector | New Job from Previous":
            window.location.href = '/pickAnomalyDetector';
            break;
        case "Anomaly Detector | Pick Parameters":
            console.log('BEFORE FINAL');
            logSessionStorage();
            paramsToUserUploads();
            console.log('FINAL SESS STORE');
            logSessionStorage();
            window.location.href = '/submitJob';
            break;
    }
}

/**
 * Enables the Next button that is located in the footer
 */
function enableNextButton() {
    document.getElementById('next-btn').disabled = false;
}

/**
 * Disables the Next button that is located in the footer
 */
function disableNextButton() {
    document.getElementById('next-btn').disabled = true;
}