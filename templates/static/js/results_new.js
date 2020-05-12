//Some parts of the functionality in this page were created by Kit Zellerbach (github: kitzeller)

// Modal
let modal, btn, span;
// Table
let indexedProjectsTable, indexedProjectsTBody, searchInput, bookCountBadge = "";
//Listeners
let updateProjectCount, removeElement, showElement = "";
// Search function
let search, results, allProjects = [];
// Checkboxes
let indexOnIdCheckbox, indexOnNameCheckbox, indexOnSignalCheckbox, indexOnJobTypeCheckbox,
    indexOnJobProgressCheckbox = "";


window.onload = function () {
    updateGlobals();
    add_navbar();
    loadSubmissions().then(() => {
        console.log('all projects', allProjects);
        updateProjectCount(allProjects.length);
        removeElement(document.getElementById('loadingProgressBar'));
        showElement(indexedProjectsTable);
        rebuildSearchIndex();
        updateProjectTable(allProjects);
    })
};


let rebuildAndRerunSearch = function () {
    rebuildSearchIndex();
    searchProjects();
};

/**
 * Rebuild search functionality with selected parameters
 */
let rebuildSearchIndex = function () {
    search = new JsSearch.Search('_id');

    search.indexStrategy = new JsSearch.PrefixIndexStrategy();
    search.sanitizer = new JsSearch.LowerCaseSanitizer();
    search.searchIndex = new JsSearch.TfIdfSearchIndex('_id');
    // search.searchIndex = new JsSearch.UnorderedSearchIndex();
    search.addIndex('job_desc');

    if (indexOnNameCheckbox.checked) {
        search.addIndex('job_name');
    }
    if (indexOnIdCheckbox.checked) {
        search.addIndex('_id');
    }
    if (indexOnSignalCheckbox.checked) {
        search.addIndex('signal_type');
    }
    if (indexOnJobTypeCheckbox.checked) {
        search.addIndex('job_type');
    }
    if (indexOnJobProgressCheckbox.checked) {
        search.addIndex('job_progress');
    }

    search.addDocuments(allProjects);
};


/**
 * Update table with search results
 * @param projects
 */
let updateProjectTable = function (projects) {
    indexedProjectsTBody.innerHTML = '';

    let tokens = search.tokenizer.tokenize(searchInput.value);

    for (let i = 0, length = projects.length; i < length; i++) {
        const project = projects[i];

        let idColumn = document.createElement('td');
        idColumn.innerHTML = project._id;

        let nameColumn = document.createElement('td');
        nameColumn.innerHTML = project.job_name;

        let descriptionColumn = document.createElement('td');
        descriptionColumn.innerText = project.job_desc === '' ? 'No description' : project.job_desc;

        let signalTypeColumn = document.createElement('td');
        signalTypeColumn.innerText = project.signal_type;

        let jobTypeColumn = document.createElement('td');
        jobTypeColumn.innerText = project.job_type;

        let jobProgressColumn = document.createElement('td');
        jobProgressColumn.innerText = project.progress;

        let datasetsColumn = document.createElement('td');
        datasetsColumn.innerText = reduceListOfSets(project.params.sets.test);

        let tableRow = document.createElement('tr');
        tableRow.appendChild(nameColumn);
        tableRow.appendChild(descriptionColumn);
        tableRow.appendChild(signalTypeColumn);
        tableRow.appendChild(jobTypeColumn);
        tableRow.appendChild(datasetsColumn);
        tableRow.appendChild(jobProgressColumn);
        tableRow.appendChild(idColumn);


        tableRow.onclick = function () {
            populateModal(project);
            modal.style.display = "block";
        };

        indexedProjectsTBody.appendChild(tableRow);
    }
};

/**
 * Update number of search results and table
 */
let updateProjectCountAndTable = function () {
    updateProjectCount(results.length);

    if (results.length > 0) {
        updateProjectTable(results);
    } else if (!!searchInput.value) {
        updateProjectTable([]);
    }
    else {
        updateProjectCount(allProjects.length);
    }
};

let searchProjects = function () {
    results = search.search(searchInput.value);
    updateProjectCountAndTable();
};


function updateGlobals() {
    //SessionStorage
    sessionStorage.cur_submission = "";
    sessionStorage.viz_submission = "";

    //Modal
    modal = document.getElementById("myModal");
    btn = document.getElementById("myBtn");
    span = document.getElementsByClassName("close")[0];

    //Table
    indexedProjectsTable = document.getElementById('indexedProjectsTable');
    indexedProjectsTBody = indexedProjectsTable.tBodies[0];
    searchInput = document.getElementById('searchInput');
    countBadge = document.getElementById('countBadge');

    // Checkboxes
    indexOnIdCheckbox = document.getElementById('indexOnIdCheckbox');
    indexOnNameCheckbox = document.getElementById('indexOnNameCheckbox');
    indexOnSignalCheckbox = document.getElementById('indexOnSignalCheckbox');
    indexOnJobTypeCheckbox = document.getElementById('indexOnJobTypeCheckbox');
    indexOnJobProgressCheckbox = document.getElementById('indexOnJobProgressCheckbox');


    // Rerun on filter parameter change
    indexOnIdCheckbox.onchange = rebuildAndRerunSearch;
    indexOnNameCheckbox.onchange = rebuildAndRerunSearch;
    indexOnSignalCheckbox.onchange = rebuildAndRerunSearch;
    indexOnJobTypeCheckbox.onchange = rebuildAndRerunSearch;
    indexOnJobProgressCheckbox.onchange = rebuildAndRerunSearch;


    updateProjectCount = function (numSubmissions) {
        countBadge.innerText = numSubmissions + ' submissions';
    };
    removeElement = function (element) {
        element.parentNode.removeChild(element)
    };
    showElement = function (element) {
        element.className = element.className.replace(/\s*hidden/, '');
    };

    span.onclick = function () {
        modal.style.display = "none";
    };

    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };

    $("form").keypress(function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            return false;
        }
    });

    searchInput.oninput = searchProjects;
}

async function loadSubmissions() {
    await fetch('/get_jobs', {
        method: 'GET',
    })
        .then(response => response.json())
        .then(response => allProjects = response['jobs'].reverse())
}


function populateModal(datum) {

    let modalContent = [
        '<b>ID: </b>' + datum._id,
        '<b>Description: </b>' + datum.job_desc,
        '<b>Signal Type: </b>' + datum.signal_type,
        '<b>Job Type: </b>' + datum.job_type,
        '<b>Testing Sets (analyzed sets): </b>' + reduceListOfSets(datum.params.sets.test, true),
        '<b>Job Progress: </b>' + datum.progress,
        '<b>Parameters: </b><br/>' + generateParamList(datum.params.alg_params),
    ];

    if (datum.params.sets.train.length !== 0) {
        let trainText = '<b>Training Sets: </b>' + reduceListOfSets(datum.params.sets.train, false) +
            " (Total length: " + calculateTrainTotalLen(datum.params.sets.train) + ", " +
            "Trained on " + datum.params.times.param_1 + " to " + datum.params.times.param_2 + ") ";
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
    headerText.innerHTML = '<h5><b>Job ' + datum.job_name + '</b></h5>';
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

    //make viz button and delete button
    let vizResultsButton = document.createElement('button');
    vizResultsButton.innerText = "Visualize Results";
    vizResultsButton.onclick = function () {
        sessionStorage.viz_submission = JSON.stringify(datum);
        window.location.href = '/visualize';
    };
    "button btn btn-info m-3".split(" ").map(d => vizResultsButton.classList.add(d));

    let deleteButton = document.createElement('button');
    deleteButton.innerText = "Delete Submission";
    deleteButton.onclick = function () {
        fetch('/delete_entry', {
            method: 'POST',
            headers: {'Content-type': 'application-json'},
            body: JSON.stringify({'id': datum._id})
        }).then(() => window.location.href = '/results')
    };
    "button btn btn-danger m-3".split(" ").map(d => deleteButton.classList.add(d));

    let buttonRow = document.createElement('div');
    buttonRow.appendChild(vizResultsButton);
    buttonRow.appendChild(deleteButton);
    "row no-gutters w-100 align-items-center justify-content-center".split(" ").map(d => buttonRow.classList.add(d));

    infoContainer.appendChild(buttonRow)
}

function generateParamList(datum) {
    let text = "";
    for (let key of Object.keys(datum)) {
        text += '<b>' + key + ': </b>' + datum[key] + ', ';
    }
    text = text.slice(0, text.length - 2);
    return text;
}

function reduceListOfSets(data, with_len) {
    let temp = "";
    for (let el of data) {
        temp += el.name;
        if (with_len) {
            temp += " (length: " + el.sig_vals.length + ")";
        }
        temp += ", ";
    }
    temp = temp.slice(0, temp.length - 2);
    return temp
}

function calculateTrainTotalLen(data) {
    let len = 0;
    for (let el of data) {
        len += el.sig_vals.length
    }
    return len;
}

