'use strict';
let allDbDatasets = {};
let storage;
let toLoad = [];
let typeArray = ['test'];
let willTrain = false;
let defaultParamDict = {};

window.onload = function () {
    set_default_param('all').then(res => {
            console.log('default param dict', defaultParamDict);
            storage = get_sessionStorage();
            console.log('storage', storage);
            storage.user_uploads = {
                'types': {
                    'train': "",
                    'test': ""
                },
                'train': [],
                'test': []
            };
            add_navbar();
            init_progress_bar(3.0);
            generate_parameters();
            add_footer();
            add_train_time_pickers();
            add_listeners();

            get_uploaded_datasets();
        }
    );
};


async function set_default_param(obj_id) {
    console.log('set defaults called with id', obj_id);
    let url = '/get_default_params';
    await fetch(url, {
        method: 'GET',
    })
        .then(response => response.json())
        .then(res => {
            console.log('res', res);
            defaultParamDict = res;
            if (obj_id !== 'all') {
                document.getElementById(obj_id).value = res[obj_id];
            }
            else {
                for (let el of toLoad) {
                    for (let a_param_dict of Object.values(defaultParamDict[el].params)) {
                        let obj_id = a_param_dict.config_name;
                        console.log('obj id', obj_id);
                        let element = document.getElementById(obj_id);
                        if (element.tagName === 'INPUT') {
                            element.value = res[obj_id]
                        } else {
                            element.options[0].text = res[obj_id];
                            element.options[0].value = res[obj_id];
                            element.options[0].selected = true;
                            console.log('element', element)
                        }
                    }
                }
            }
        })
}

function get_uploaded_datasets() {
    console.log('started get uploaded datasets');
    let url = '/get_uploaded_datasets';
    fetch(url, {
        method: 'GET',
        // headers: {'Content-type':'application-json'},
    }).then(function (response) {
        response.json().then(function (res) {
            console.log('responses:', res);
            allDbDatasets = res; //saving all results locally to get them when user selects them
            console.log('all db sets', allDbDatasets);
            let all_set_html = "";
            for (let file_name of Object.keys(res)) {
                all_set_html = all_set_html + "<option>" + file_name + "</option>";
            }
            document.getElementById('test-set-db-input').innerHTML = all_set_html;

            if (willTrain) {
                document.getElementById('train-set-db-input').innerHTML = all_set_html;

            }
        })
    })
}

async function new_upload(obj) {
    console.log('started new upload');
    // console.log('hereeee', obj.id)
    // console.log(obj.files)
    let files = obj.files; // FileList object
    let name_list = [];
    for (let i = 0, f; f = files[i]; i++) {
        let reader = new FileReader();
        reader.onload = await function (e) {
            loadHandler(e, f.name, obj.id)
        };
        reader.onerror = errorHandler;
        reader.readAsText(f);
        name_list.push(f.name);
    }
    if (name_list[0] === "") {
        name_list = 'Or upload new set'
    }
    let nextSibling = obj.nextElementSibling;
    nextSibling.innerText = name_list;

    setTimeout(function () {
        // disable multiselect and assign values to start end time
        let type = obj.id.split("-")[0];
        if (type === 'train') {
            document.getElementById('train-set-db-input').disabled = true;
        } else {
            document.getElementById('test-set-db-input').disabled = true;
        }
        set_start_end_times();
    }, 500)


}


//csv file handling functions
async function loadHandler(event, name, id) {
    // console.log('event', event)
    let csv = event.target.result;
    await process_csv(csv, name, id);
}

async function process_csv(csv, name, id) {
    // console.log('name ', name)
    let allTextLines = csv.split(/\r\n|\n/);
    // console.log('all text lines', allTextLines)
    let col_1 = [];
    let col_2 = [];
    for (let i = 0; i < allTextLines.length; i++) {
        let data = allTextLines[i].split(',');
        if (data[0] !== '') { //if first col isnt null then we need to have an event associated with it even if its null
            col_1.push(parseFloat(data[0]));
            console.log('data 1 is', data[1]);
            (data[1] === null || data[1] === undefined) ? col_2.push(0) : col_2.push(parseFloat(data[1]))
        }
    }
    let full_data = {
        'name': name,
        'sig_vals': col_1,
        'events': col_2
    };
    let type = id.split('-')[0];
    // user_uploads_dict[type].push(full_data);
    storage.user_uploads[type].push(full_data);
    storage.user_uploads.types[type] = 'user_upload';
}

function errorHandler(evt) {
    if (evt.target.error.name === "NotReadableError") {
        alert("Cannot read file !");
    }
}


function clear_upload(cur_id, multiselect_id) {
    //disable multi select
    let multi = document.getElementById(multiselect_id);
    // console.log('element', multi);
    multi.value = '';

    //remove the previously uploaded folder
    document.getElementById(cur_id).parentElement.innerHTML = '<input type="file" data-height="500" class="custom-file-input white" id=' + cur_id + ' ' +
        'aria-describedby="test-set-upload-input" accept=".csv" onchange="new_upload(this)">' +
        '<label class="custom-file-label text-muted"  style="height:100%"  for=' + cur_id + '>Or upload new set</label>';

    // enable multiselect
    document.getElementById(multiselect_id).disabled = false;
}

function add_listeners() {

    if (willTrain) {
        typeArray.push('train');
        document.getElementById("clear-train-upload").addEventListener("click", e => {
            e.preventDefault();
            clear_upload("train-set-upload-input", 'train-set-db-input')
        });
    }

    document.getElementById("clear-test-upload").addEventListener("click", e => {
        e.preventDefault();
        clear_upload("test-set-upload-input", 'test-set-db-input')
    });

    for (let type of typeArray) {
        document.getElementById(type + '-set-db-input').addEventListener('click', e => {
                console.log('clicked input', $('#' + type + '-set-db-input').val());
                storage.user_uploads.types[type] = 'prev_datasets';
                storage.user_uploads[type] = [];
                $('#' + type + '-set-db-input').val()
                    .map(d => storage.user_uploads[type].push({
                            'name': d,
                            'sig_vals': allDbDatasets[d],
                            'events': new Array(allDbDatasets[d].length).fill(0)
                        })
                    );
                if ($('#' + type + '-set-db-input').val().length > 0) {
                    document.getElementById(type + '-set-upload-input').disabled = true;
                    document.getElementById('clear-' + type + '-upload').disabled = true;
                } else {
                    document.getElementById(type + '-set-upload-input').disabled = false;
                    document.getElementById('clear-' + type + '-upload').disabled = false;
                }
                setTimeout(function () {
                    console.log('storage before setting times', storage.user_uploads);
                    set_start_end_times()
                }, 200);
            }
        );
    }


    for (let tag of ['form']) {
        for (let html_el of document.getElementsByTagName(tag)) {
            console.log(html_el);
            html_el.addEventListener('change', check_completion)
        }
    }

    function check_completion() {
        console.log('checking completion');
        let next_btn = document.getElementById('next-btn');
        next_btn.disabled = false;
        let arrayToCheck = [get_train_test_sets()];
        if (storage.signal_type.includes('LSTM')) {
            arrayToCheck.push(get_lstm_params())
        }
        if (willTrain) {
            arrayToCheck.push(get_train_times());
        }
        for (let element of arrayToCheck) {
            if (element !== undefined) {
                console.log('checking el', element);
                for (let child of Object.keys(element)) {
                    if (element[child] === undefined || element[child] === "") {
                        next_btn.disabled = true
                    }
                }
            }
        }
    }
}

function train_test_same(obj) {
    if (obj.checked) {
        let uploaded = get_train_test_sets();
        console.log('uploaded', uploaded);
        if (uploaded.train[0] !== 'upload') {
            document.getElementById('test-set-db-input').value = uploaded.train
        } else {
            console.log(document.getElementById('train-set-upload-input').files);
            let upload_btn = document.getElementById('test-set-upload-input');
            upload_btn.files = document.getElementById('train-set-upload-input').files;
            new_upload(upload_btn)
        }
    } else {
        document.getElementById('test-set-db-input').value = '';
        clear_upload('test-set-upload-input', 'test-set-db-input')
    }
    //get selection from train
    //make test be the same value


}

function set_start_end_times() {
    let len_arr = [];
    document.getElementById('start-time-input').value = 0;
    storage.user_uploads['train'].map(d => {
        if (len_arr !== undefined) {
            len_arr.push(d.sig_vals.length)
        }
    });
    document.getElementById('end-time-input').value = len_arr.reduce((a, b) => (a + b), 0);
    // document.getElementById('section-time-input').disabled = true;
    // document.getElementById('section-anom-input').disabled = true;
}


function generate_parameters() {
    let param_table = document.getElementById('parameter-table');
    add_train_or_test_set_sections('test');
    if (storage.signal_type.includes('LSTM')) {
        if (storage.signal_type === 'LSTM-new') {
            willTrain = true;
            add_train_or_test_set_sections('train');
            toLoad.push('LSTM-new');
        }
        toLoad.push('LSTM-prev');
    } else {
        let trainInputNode = document.getElementById('train-sets-here');
        trainInputNode.parentNode.removeChild(trainInputNode)
    }
    toLoad.push(storage.job_type);

    for (let param_type of toLoad) {

        let col_container = document.createElement('div');
        "col h-100".split(" ").map(d => col_container.classList.add(d));

        let col_header = document.createElement('div');
        col_header.innerText = defaultParamDict[param_type].display_name;
        "card-header row-lg-4 w-100 bg-white d-flex justify-content-center".split(" ")
            .map(d => col_header.classList.add(d));

        col_container.appendChild(col_header);

        let params_per_type = defaultParamDict[param_type].params;
        for (let a_param of Object.keys(params_per_type)) {
            let config_name = params_per_type[a_param].config_name;
            let default_val = params_per_type[a_param].default;
            let type = params_per_type[a_param].type;
            console.log('type', type);

            let row_container = document.createElement('div');
            row_container.style.width = '100%';
            "row w-100 mx-4 my-2".split(" ").map(d => row_container.classList.add(d));

            let label = document.createElement('label');
            label.setAttribute('for', config_name);
            label.onclick = function () {
                set_default_param(config_name)
            };
            label.innerText = a_param;
            "col-sm-6 col-form-label".split(" ").map(d => label.classList.add(d));

            let input;
            if (type === undefined) {
                console.log('here');

                input = document.createElement('input');
                input.setAttribute('type', 'text');
            } else {
                input = document.createElement('select');
                input.setAttribute('size', '1');
                input.searchable = true;
                let option = document.createElement('option');
                option.selected = true;
                option.innerText = default_val;
                input.appendChild(option)
            }
            input.setAttribute('id', config_name);
            input.setAttribute('value', default_val);
            "col-sm-4 form-control".split(" ").map(d => input.classList.add(d));


            row_container.appendChild(label);
            row_container.appendChild(input);
            col_container.appendChild(row_container);
        }
        param_table.appendChild(col_container);
    }

}


function add_train_or_test_set_sections(type) {

    let parent_div = document.getElementById(type + '-sets-here');

    let label_row = document.createElement('div');
    label_row.classList.add('row');
    let label = document.createElement('label');
    label.setAttribute('for', type + '-set-db-input');
    "col-sm-6 col-form-label".split(" ")
        .map(d => label.classList.add(d));
    label.innerText = "Pick " + type + "ing sets";


    let set_inputs_div = document.createElement('div');
    set_inputs_div.classList.add('row');

    let first_col = document.createElement('div');
    first_col.classList.add('col-sm-5');

    let select_prev_upload = document.createElement('select');
    select_prev_upload.classList.add('form-control');
    select_prev_upload.setAttribute('id', type + '-set-db-input');
    select_prev_upload.setAttribute('size', '3');
    select_prev_upload.multiple = true;
    select_prev_upload.searchable = true;


    let second_col = document.createElement('div');
    second_col.classList.add('col-sm-4');

    let new_upload_input = document.createElement('input');
    new_upload_input.setAttribute('type', 'file');
    new_upload_input.setAttribute('id', type + '-set-upload-input');
    new_upload_input.setAttribute('data-height', '500');
    new_upload_input.setAttribute('aria-describedby', type + '-set-upload-input');
    new_upload_input.setAttribute('accept', '.csv');
    new_upload_input.addEventListener('change', function () {
        new_upload(new_upload_input)
    });
    new_upload_input.multiple = true;
    "custom-file-input white".split(" ")
        .map(d => new_upload_input.classList.add(d));

    let new_upload_label = document.createElement('label');
    new_upload_label.setAttribute('for', type + '-set-upload-input');
    new_upload_label.style.height = '100%';
    new_upload_label.innerText = "Or upload new set";
    "custom-file-label text-muted".split(" ")
        .map(d => new_upload_label.classList.add(d));


    let clear_container = document.createElement('div');
    clear_container.classList.add('input-group-append');

    let clear_btn = document.createElement('button');
    clear_btn.classList.add('input-group-text');
    clear_btn.setAttribute('id', 'clear-' + type + '-upload');
    clear_btn.innerText = 'Clear';


    parent_div.appendChild(label_row);
    parent_div.appendChild(set_inputs_div);

    label_row.appendChild(label);
    set_inputs_div.appendChild(first_col);
    set_inputs_div.appendChild(second_col);
    set_inputs_div.appendChild(clear_container);
    first_col.appendChild(select_prev_upload);
    second_col.appendChild(new_upload_input);
    second_col.appendChild(new_upload_label);
    clear_container.appendChild(clear_btn);


    if (type === 'test') {
        let check_container = document.createElement('div');
        "col d-flex justify-content-left text-left".split(" ")
            .map(d => check_container.classList.add(d));
        let check_div = document.createElement('div');
        "form-check row-sm-12 my-2".split(" ")
            .map(d => check_div.classList.add(d));
        let check_input = document.createElement('input');
        check_input.classList.add('form-check-input');
        check_input.setAttribute('type', 'checkbox');
        check_input.setAttribute('value', '');
        check_input.setAttribute('id', 'same-set,check');
        check_input.addEventListener('change', function () {
            train_test_same(check_input)
        });
        let check_label = document.createElement('label');
        check_label.classList.add('form-check-label');
        check_label.setAttribute('for', 'same-set-check');
        check_label.innerText = 'Train and test on the same files';

        check_container.appendChild(check_div);
        check_div.appendChild(check_input);
        check_div.appendChild(check_label);
        parent_div.appendChild(check_container)
    }

}

function add_train_time_pickers() {

    let parent_container = document.getElementById('train-times-here');

    let preset_container = document.createElement('div');
    "col pb-4".split(" ")
        .map(d => preset_container.classList.add(d));
    let label_container = document.createElement('div');
    label_container.classList.add('row');
    label_container.style.width = '100%';
    let label = document.createElement('label');
    label.setAttribute('for', 'start-time-input');
    "row no-gutters px-3 py-1".split(' ')
        .map(d => label.classList.add(d));
    label.innerText = 'Choose start and end datapoints of training dataset';
    let selector_container = document.createElement('div');
    selector_container.classList.add('row');

    parent_container.appendChild(preset_container);
    preset_container.appendChild(label_container);
    preset_container.appendChild(selector_container);
    label_container.appendChild(label);

    let dict = {
        'start-time-input': 'Pick starting datapoint',
        'end-time-input': 'Pick ending datapoint'
    };
    for (let type of Object.keys(dict)) {
        let len_container = document.createElement('div');
        len_container.classList.add('col-2');
        let input = document.createElement('input');
        input.classList.add('form-control');
        input.setAttribute('id', type);
        input.setAttribute('type', 'number');
        input.setAttribute('placeholder', dict[type]);
        // input.addEventListener('keyup', function () {
        //     disable_section_dropdowns()
        // });
        len_container.appendChild(input);
        selector_container.appendChild(len_container);
    }

}


// function add_preset_pickers() {
//     let preset_container = document.createElement('div');
//     "col pb-4".split(" ")
//         .map(d => preset_container.classList.add(d));
//     let label_container = document.createElement('div');
//     label_container.classList.add('row');
//     label_container.style.width = '100%';
//     let label = document.createElement('label');
//     label.setAttribute('for', 'section-time-input');
//     "row no-gutters px-3 py-1".split(' ')
//         .map(d => label.classList.add(d));
//     label.innerText = 'Pick training set sections';
//     let selector_container = document.createElement('div');
//     selector_container.classList.add('row');
//
//     parent_container.appendChild(preset_container);
//     preset_container.appendChild(label_container);
//     preset_container.appendChild(selector_container);
//     label_container.appendChild(label);
//
//
//     let dict = {
//         'section-time-input': 'Pick length of section',
//         'section-anom-input': 'Pick anomaly levels'
//     };
//     for (let type of Object.keys(dict)) {
//         let len_container = document.createElement('div');
//         len_container.classList.add('col-sm-5');
//         let len_select = document.createElement('select');
//         len_select.classList.add('form-control');
//         len_select.setAttribute('id', type);
//         len_select.setAttribute('size', '1');
//         len_select.searchable = true;
//         let len_option = document.createElement('option');
//         len_option.disabled = true;
//         len_option.selected = true;
//         len_option.setAttribute('value', '');
//         len_option.innerText = dict[type];
//
//         len_container.appendChild(len_select);
//         len_select.appendChild(len_option);
//         selector_container.appendChild(len_container);
//     }
// }

//
// function load_train_size_and_anoms() {
//     document.getElementById("section-time-input").innerHTML = '<option value="" disabled selected>Pick length of section</option>' +
//         '<option>Small</option>' +
//         '<option>Medium</option>' +
//         '<option>Large</option>' +
//         '<option>X-Large</option>';
//
//     document.getElementById("section-anom-input").innerHTML = ' <option value="" disabled selected>Choose your anomaly levels</option>' +
//         '<option>Minimal</option>' +
//         '<option>Some</option>' +
//         '<option>Many</option>'
// }
//
// function disable_section_dropdowns() {
//     console.log('called disablee');
//     let train_val = document.getElementById('start-time-input').value;
//     let test_val = document.getElementById('end-time-input').value;
//     console.log('values', train_val, test_val);
//     if (train_val !== "" || test_val !== "") {
//         document.getElementById('section-time-input').disabled = true;
//         document.getElementById('section-anom-input').disabled = true;
//     } else {
//         document.getElementById('section-time-input').disabled = false;
//         document.getElementById('section-anom-input').disabled = false;
//     }
// }
