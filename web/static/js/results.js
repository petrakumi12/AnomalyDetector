//Some parts of the functionality in this page were created by Kit Zellerbach (github: kitzeller)

// Modal
let modal, btn, span;
// Table
let indexedTable, indexedTBody, searchInput;
//Listeners
let updateSubmissionCount, removeElement, showElement = "";
// Search function
let search, results, allSubmissions = [];
// Checkboxes
let indexOnIdCheckbox, indexOnNameCheckbox, indexOnSignalCheckbox, indexOnJobTypeCheckbox,
    indexOnJobProgressCheckbox = "";


window.onload = function () {
    updateGlobals(); //update global variables
    addNavBar();
    //load all jobs in the database
    loadSubmissions().then(() => {
        updateSubmissionCount(allSubmissions.length);
        removeElement(document.getElementById('loadingProgressBar'));
        showElement(indexedTable);
        rebuildSearchIndex();
        updateTable(allSubmissions);
    })
};

/**
 * Rebuilds search index searches for all projects again. To be called whenever the table is updated with new elements.
 */
let rebuildAndRerunSearch = function () {
    rebuildSearchIndex();
    searchSubmissions();
};

/**
 * Rebuild search functionality with selected checkboxes
 */
let rebuildSearchIndex = function () {
    //setup search
    search = new JsSearch.Search('_id');
    search.indexStrategy = new JsSearch.PrefixIndexStrategy();
    search.sanitizer = new JsSearch.LowerCaseSanitizer();
    search.searchIndex = new JsSearch.TfIdfSearchIndex('_id');

    //add job_desc index
    search.addIndex('job_desc');

    //add all other indices depending on the checked checkboxes
    (indexOnNameCheckbox.checked) ? search.addIndex('job_name') : {};
    (indexOnIdCheckbox.checked) ? search.addIndex('_id') : {};
    (indexOnSignalCheckbox.checked) ? search.addIndex('signal_type') : {};
    (indexOnJobTypeCheckbox.checked) ? search.addIndex('job_type') : {};
    (indexOnJobProgressCheckbox.checked) ? search.addIndex('job_progress') : {};

    //add data of all submissions to search table
    search.addDocuments(allSubmissions);
};


/**
 * Update table with search results
 * @param submissions All projects that will be added to the updated table
 */
let updateTable = function (submissions) {
    indexedTBody.innerHTML = '';

    //iterate through all projects
    for (let i = 0, length = submissions.length; i < length; i++) {
        const submission = submissions[i];

        //add content to table
        let idColumn = document.createElement('td');
        idColumn.innerHTML = submission._id;

        let nameColumn = document.createElement('td');
        nameColumn.innerHTML = submission.job_name;

        let descriptionColumn = document.createElement('td');
        descriptionColumn.innerText = submission.job_desc === '' ? 'No description' : submission.job_desc;

        let signalTypeColumn = document.createElement('td');
        signalTypeColumn.innerText = submission.signal_type;

        let jobTypeColumn = document.createElement('td');
        jobTypeColumn.innerText = submission.job_type;

        let jobProgressColumn = document.createElement('td');
        jobProgressColumn.innerText = submission.progress;

        let datasetsColumn = document.createElement('td');
        datasetsColumn.innerText = reduceListOfDatasets(submission.params.sets.test);

        let tableRow = document.createElement('tr');
        //append all content to table row
        tableRow.appendChild(nameColumn);
        tableRow.appendChild(descriptionColumn);
        tableRow.appendChild(signalTypeColumn);
        tableRow.appendChild(jobTypeColumn);
        tableRow.appendChild(datasetsColumn);
        tableRow.appendChild(jobProgressColumn);
        tableRow.appendChild(idColumn);
        indexedTBody.appendChild(tableRow);

        //add listener for row to show modal popup
        tableRow.onclick = function () {
            populateModal(project);
            modal.style.display = "block";
        };

    }
};

/**
 * Update number of search results and table
 */
let updateSubmissionCountAndTable = function () {
    updateSubmissionCount(results.length);

    if (results.length > 0) {
        updateTable(results);
    } else if (!!searchInput.value) {
        updateTable([]);
    } else {
        updateSubmissionCount(allSubmissions.length);
    }
};

/**
 * Search all projects for results and update table with the new results
 */
let searchSubmissions = function () {
    results = search.search(searchInput.value);
    updateSubmissionCountAndTable();
};


/**
 * Updates global variables
 */
function updateGlobals() {

    emptySessionStorage();
    updateModal();
    updateTableVariables();
    updateCheckboxes();
    addListeners();

    /**
     * Empties session storage
     */
    function emptySessionStorage() {
        sessionStorage.curSubmission = "";
        sessionStorage.viz_submission = "";
    }

    /**
     * Updates modal variables
     */
    function updateModal() {
        modal = document.getElementById("myModal");
        btn = document.getElementById("myBtn");
        span = document.getElementsByClassName("close")[0];
    }


    /**
     * Updates the variables of the table
     */
    function updateTableVariables() {
        indexedTable = document.getElementById('indexedTable');
        indexedTBody = indexedTable.tBodies[0];
        searchInput = document.getElementById('searchInput');
        countBadge = document.getElementById('countBadge');
    }


    /**
     * Sets checkbox variable values
     */
    function updateCheckboxes() {
        indexOnIdCheckbox = document.getElementById('indexOnIdCheckbox');
        indexOnNameCheckbox = document.getElementById('indexOnNameCheckbox');
        indexOnSignalCheckbox = document.getElementById('indexOnSignalCheckbox');
        indexOnJobTypeCheckbox = document.getElementById('indexOnJobTypeCheckbox');
        indexOnJobProgressCheckbox = document.getElementById('indexOnJobProgressCheckbox');

    }

    /**
     * Listeners
     */
    function addListeners() {
        //to rerun search on change 
        indexOnIdCheckbox.onchange = rebuildAndRerunSearch;
        indexOnNameCheckbox.onchange = rebuildAndRerunSearch;
        indexOnSignalCheckbox.onchange = rebuildAndRerunSearch;
        indexOnJobTypeCheckbox.onchange = rebuildAndRerunSearch;
        indexOnJobProgressCheckbox.onchange = rebuildAndRerunSearch;

        //remove modal when clicked x button
        span.onclick = function () {
            modal.style.display = "none";
        };

        //remove modal when background clicked
        window.onclick = function (event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        };

        //if enter is pressed then prevent re-searching
        $("form").keypress(function (e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                return false;
            }
        });

        //search projects when user inputs
        searchInput.oninput = searchSubmissions;

    }

    //update number of projects found
    updateSubmissionCount = function (numSubmissions) {
        countBadge.innerText = numSubmissions + ' submissions';
    };
    //remove an element from the project table
    removeElement = function (element) {
        element.parentNode.removeChild(element)
    };
    showElement = function (element) {
        element.className = element.className.replace(/\s*hidden/, '');
    };
}

/**
 * Gets all submitted jobs from MongoDB and assigns them to allSubmissions
 * @returns {Promise<void>}
 */
async function loadSubmissions() {
    await fetch('/getJobs', {
        method: 'GET',
    })
        .then(response => response.json())
        .then(response => allSubmissions = response['jobs'].reverse())
}

/**
 * Populates the modal popup with content from the submission variable
 * @param submission one job submission
 */
function populateModal(submission) {

    let modalContent = [
        '<b>ID: </b>' + submission._id,
        '<b>Description: </b>' + submission.job_desc,
        '<b>Signal Type: </b>' + submission.signal_type,
        '<b>Job Type: </b>' + submission.job_type,
        '<b>Testing Sets (analyzed sets): </b>' + reduceListOfSets(submission.params.sets.test, true),
        '<b>Job Progress: </b>' + submission.progress,
        '<b>Parameters: </b><br/>' + generateParamList(submission.params.alg_params),
    ];

    if (submission.params.sets.train.length !== 0) {
        let trainText = '<b>Training Sets: </b>' + reduceListOfSets(submission.params.sets.train, false) +
            " (Total length: " + calculateTrainTotalLen(submission.params.sets.train) + ", " +
            "Trained on " + datum.params.times.param_1 + " to " + submission.params.times.param_2 + ") ";
        modalContent.splice(4, 0, trainText)
    }

    //make table, table header and body
    let table = document.createElement('table');
    "table table-striped table-condensed m-4".split(" ").map(d => table.classList.add(d));
    let tableHeader = document.createElement('thead');
    let tableBody = document.createElement('tbody');
    table.appendChild(tableHeader);
    table.appendChild(tableBody);

    //add header row and text
    let headerRow = document.createElement('tr');
    let headerText = document.createElement('td');
    headerText.innerHTML = '<h5><b>Job ' + submission.job_name + '</b></h5>';
    tableHeader.appendChild(headerRow);
    headerRow.appendChild(headerText);

    //add all data rows
    for (let el of modalContent) {
        let container = document.createElement('tr');
        // "no-gutters w-100".split(" ").map(d => container.classList.add(d));
        let text = document.createElement('td');
        text.innerHTML = el;
        tableBody.appendChild(container);
        container.appendChild(text);
    }

    //append to parent element
    let infoContainer = document.getElementById('project-info');
    infoContainer.innerHTML = "";
    infoContainer.appendChild(table);

    //make viz and delete button
    let vizResultsButton = document.createElement('button');
    vizResultsButton.innerText = "Visualize Results";
    vizResultsButton.onclick = d => {
        sessionStorage.viz_submission = JSON.stringify(submission);
        window.location.href = '/visualize';
    };
    "button btn btn-info m-3".split(" ").map(d => vizResultsButton.classList.add(d));

    let deleteButton = document.createElement('button');
    deleteButton.innerText = "Delete Submission";
    deleteButton.onclick = function () {
        fetch('/delete_entry', {
            method: 'POST',
            headers: {'Content-type': 'application-json'},
            body: JSON.stringify({'id': submission._id})
        }).then(() => window.location.href = '/results')
    };
    "button btn btn-danger m-3".split(" ").map(d => deleteButton.classList.add(d));

    //row that will contain visualize and delete buttons
    let buttonRow = document.createElement('div');
    "row no-gutters w-100 align-items-center justify-content-center".split(" ").map(d => buttonRow.classList.add(d));

    //append all elements to their parents
    buttonRow.appendChild(vizResultsButton);
    buttonRow.appendChild(deleteButton);
    infoContainer.appendChild(buttonRow)
}

/**
 * Formats the job data so all job parameters are listed
 * @param submission one job submission
 * @returns {string} the formatted parameters
 */
function generateParamList(submission) {
    let text = "";
    for (let key of Object.keys(submission)) {
        text += '<b>' + key + ': </b>' + submission[key] + ', ';
    }
    text = text.slice(0, text.length - 2);
    return text;
}

/**
 * Makes list of dataset names and lengths
 * @param submission one job submission
 * @param with_len whether the dataset has a length
 * @returns {string} formatted list of names and lengths
 */
function reduceListOfDatasets(submission, with_len) {
    let temp = "";
    for (let el of submission) {
        temp += el.name;
        if (with_len) {
            temp += " (length: " + el.sig_vals.length + ")";
        }
        temp += ", ";
    }
    temp = temp.slice(0, temp.length - 2);
    return temp
}

/**
 * Calculates total length of training set
 * @param data
 * @returns {number} the length of the dataset
 */
function calculateTrainTotalLen(data) {
    let len = 0;
    for (let el of data) {
        len += el.sig_vals.length
    }
    return len;
}

