lstmtext = "LSTM RNN stands for Long Short Term Recurrent Neural Network. It is a type of neural network that is optimized to work well with time series data. In this application it is used together with a automatic threshold to detect anomalies, following a paper by Hundman et al (2018).";
ocsvmtext = "OC SVM stands for One Class Support Vector Machine. This classifier considers anomalous points as not belonging to the class of normal values.";
stdevtext = "This method uses the standard deviation of all points to find anomalies. Every point that is more than 3 times away from the mean of the dataset is considered anomalous.";

let job_options_text_dict = {
    'Telemanom': 'Telemanom is a method created by scientists at NASA that uses the difference between real and predicted signal values in an interval to automatically generate an error threshold. All points with errors above the threshold are marked as anomalies.',
    'Variation with Percentile-based Threshold': 'This method finds the variation of the signal values (either raw or LSTM-smoothed based on user preference), and marks as anomalous all points above a given percentile threshold. This percentile threshold is decided by the user.',
    'Variation with Standard Deviation-based Threshold': 'This method finds the variation of the signal values (either raw or LSTM-smoothed based on user preference), finds the mean and standard deviation of the variation array, then creates a threshold equal to mean + coefficient * standard deviation. The coefficient is decided by the user. All points whose variation is above the threshold is marked as anomalous.',
    'Variation of Variation with Standard Deviation-based Threshold': 'This method finds the variation of the signal values (either raw or LSTM-smoothed based on user preference), then takes the variation of the variation array. Then the mean and standard deviation of the variation of variation array are calculated, and a threshold is decided equal to mean + coefficient * standard deviation. The coefficient is decided by the user. All points whose variation of variation is above the threshold is marked as anomalous.'
};

let temp_storage = get_sessionStorage();

window.onload = function () {
    console.log('sess stor', get_sessionStorage());
    add_navbar();
    init_progress_bar(2.0);
    add_footer();
    generate_buttons();
};

function pick_job_type(option) {
    document.getElementById('help-div').innerText = job_options_text_dict[option];
    document.getElementById('picked-method').innerText = option;
    temp_storage.job_type = option;
    sessionStorage.cur_submission = JSON.stringify(temp_storage);
    enable_next()

}

function enable_next() {
    let job_input = document.getElementById('job-name-input').value;
    let job_type_input = document.getElementById('picked-method').innerText;
    console.log('job name and type', typeof(job_input), job_input === "");
    document.getElementById('next-btn').disabled = job_input === "" || job_type_input === 'None';
}

function date_as_name() {
    console.log('date as name called');
    let is_checked = document.getElementById('date-as-name').checked;
    if (is_checked) {
        document.getElementById("job-name-input").value = get_datetime();
        enable_next()
    } else {
        document.getElementById("job-name-input").value = "";
        document.getElementById('next-btn').disabled = false
    }
}

function get_datetime() {
    let currentDate = new Date();
    let date = currentDate.getDate();
    let month = currentDate.getMonth();
    let year = currentDate.getFullYear();
    let time = currentDate.getHours() + "." + currentDate.getMinutes() + "." + currentDate.getSeconds();
    return year + "-" + (month + 1) + "-" + date + '_' + time
}


function generate_buttons() {
//    check if raw or lstm
//    generate buttons accordingly
     let options_arr = job_options_text_dict;
    if (!get_sessionStorage().signal_type.includes('LSTM')) {
        delete options_arr['Telemanom'];
        console.log('loading buttons without telemanom', options_arr);
    }
    options_arr = Object.keys(options_arr);
    let parent_div = document.getElementById('options_here');
    for (let option of options_arr) {

        let div = document.createElement('div');
        "form-group row-md-4 mx-auto".split(" ")
            .map(d => div.classList.add(d));

        let btn = document.createElement('button');
        btn.setAttribute('type', 'button');
        "btn btn-info btn-block center".split(" ")
            .map(d => btn.classList.add(d));
        btn.onclick = function(){pick_job_type(option)};
        btn.innerText = option;

        div.appendChild(btn);
        parent_div.appendChild(div);
    }

}

