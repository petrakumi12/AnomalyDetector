// parameter getters
function get_all_lstm_user_params() {
    console.log('get all params called');
    let param_dict = {
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
    };

    // train and test sets
    let set_name_arr = get_train_test_sets();
    for (let type of ['train', 'test']) {
        param_dict.sets[type] = set_name_arr[type];
    }
    // training times/sections
    param_dict.times = get_train_times();

    // all other parameters
    param_dict.alg_params = get_lstm_params();
    return param_dict
}

function get_train_test_sets() {
    let name_dict = {};
    for (let type of typeArray) {
        // check if multiselect is disabled
        // if yes then get uploaded file

        let multiselect_el = document.getElementById(type + '-set-db-input');
        if (multiselect_el.disabled === true) {
            name_dict[type] = ['upload']
        } else {
            // if no then get multiselect file
            let selected_arr = [];
            for (let selected of multiselect_el.selectedOptions) {
                selected_arr.push(selected.value)
            }
            name_dict[type] = selected_arr
        }
    }
    return name_dict
}

function get_train_times() {
    let train_sections = {};

   train_sections.type = 'times';
        train_sections.param_1 = document.getElementById('start-time-input').value;
        train_sections.param_2 = document.getElementById('end-time-input').value;

    return train_sections
}

function get_lstm_params() {
    let lstm_params = {};
    //lstm train
    for (let el of toLoad) {
        for (let a_param_dict of Object.values(defaultParamDict[el].params)) {
            let obj_id = a_param_dict.config_name;
                let element = document.getElementById(obj_id);
            if (document.getElementById(obj_id).tagName === 'INPUT') {
                lstm_params[obj_id] = element.value
            } else {
                lstm_params[obj_id] = element.options[element.selectedIndex].text;
            }
        }
    }
    return lstm_params
}

/*
sessionStorage.myObject = JSON.stringify(myObject); //will set object to the stringified myObject
 var myObject = JSON.parse(sessionStorage.myObject); //will parse JSON string back to object
*/

