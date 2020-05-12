// generate html for params page
// what we need to know to generate page
// if lstm:
//   if train
//      add training set input
//      generate lstm train parameters
//   add testing set input
//   generate lstm test param
// generate anomaly detection params based on picked method
function generate_params_page() {
    let session = get_sessionStorage();
    if (session.job_type.includes('LSTM')) {
        if (session.job_type === "LSTM-new") {
            generate_train_section()
        }
        generate_test_section()
    }
    generate_params_section(session.job_type)

}