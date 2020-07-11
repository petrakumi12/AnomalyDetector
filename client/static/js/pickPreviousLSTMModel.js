// let savedLSTMModels;
window.onload = function () {
    updateSessionStorage('job_type', 'LSTM-prev', 'add'); //update session storage with LSTM-prev selection
    addNavBar();
    updateProgressBar(1.0);
    getSavedLSTMModels()
        .then(savedLSTMModels => {
            loadAccordion(savedLSTMModels)
        })
};

/**
 * Receives all saved LSTM models from database
 * @returns {Promise<void>}
 */
async function getSavedLSTMModels() {
    let savedLSTMModels = [];
    await fetch('/getSavedModels', {
        method: 'GET',
    })
        .then(response => response.json())
        .then(response => savedLSTMModels = response);
    return savedLSTMModels
}

/**
 * Loads the accordion elements containing all info on previously trained LSTMs
 */
function loadAccordion(savedLSTMModels) {
    //iterate through all lstm models
    for (let i = 0; i < savedLSTMModels.length; i++) {
        //group contained in one accordion
        let oneAccordionGroup = document.createElement('div');
        //title container
        let titleContainer = document.createElement('h2');
        titleContainer.setAttribute('id', savedLSTMModels[i]['_id']);
        'mb-0 mx-2 mb-1'.split(' ').map(d => titleContainer.classList.add(d));
        //button that also contains title
        let titleButton = document.createElement('button');
        titleButton.innerText = savedLSTMModels[i].job_name;
        titleButton.setAttribute('type', 'button');
        titleButton.setAttribute('data-toggle', 'collapse');
        'btn btn-block btn-info collapsed'.split(' ').map(d => titleButton.classList.add(d));
        //element containing content of an LSTM model that also collapses
        let collapsibleContent = document.createElement('div');
        collapsibleContent.setAttribute('id', 'collapse' + String(i));
        collapsibleContent.setAttribute('data-parent', '#accordionExample');
        collapsibleContent.setAttribute('aria-labelledby', savedLSTMModels[i]['_id']);
        'collapse mx-3 pt-2'.split(' ').map(d => collapsibleContent.classList.add(d));
        //populating collapsibleContent with all parameters

        //the training params
        let allTrainingParams = "";
        for (let atrain of savedLSTMModels[i].params.sets.train) {
            allTrainingParams += atrain.name[0] + " (" + atrain.sig_vals.length + "), "
        }
        allTrainingParams.slice(0, allTrainingParams.length - 2);
        //all the params
        let allParameters = "";
        for (let aparam of Object.keys(savedLSTMModels[i].params.alg_params)) {
            allParameters += '<i>' + aparam + ':</i> ' + savedLSTMModels[i].params.alg_params[aparam] + ", "
        }
        allParameters.slice(0, allParameters.length - 2);
        //appending them all to collapsibleContent
        collapsibleContent.innerHTML += "<p><b>Description: </b>" + savedLSTMModels[i].job_desc + "<br/>" +
            "<b>Trained on: </b>" + allTrainingParams + "<br/>" +
            "<b>Parameters: </b>" + allParameters + "</p><br/>";
        //appending all elements
        oneAccordionGroup.appendChild(titleContainer);
        titleContainer.appendChild(titleButton);
        oneAccordionGroup.appendChild(collapsibleContent);
        document.getElementById('accordionExample').appendChild(oneAccordionGroup);
        //add listener to title button
        addTitleButtonListener(titleButton, collapsibleContent, titleContainer, i);
    }

    /**
     * Adds listener to button that contains title of previously trained LSTM
     * @param titleButton button element
     * @param collapsibleContent div that contains all content for one collapsible element
     */
    function addTitleButtonListener(titleButton, collapsibleContent, titleContainer, number) {
        titleButton.addEventListener('click', _ => {
            enableNextButton();
            updateSessionStorage('prev_model_id', titleContainer.id, 'add');
            var classList = collapsibleContent.classList;
            classList.contains('show') ? $(`#collapse${String(number)}`).collapse('hide') : $(`#collapse${String(number)}`).collapse('show')
        });
    }
}


