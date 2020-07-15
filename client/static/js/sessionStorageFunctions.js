/**
 * Creates the curSubmission variable which will contain all info that will be stored on sessionStorage.
 * Initializes curSubmission with keys and empty values, and adds it to sessionStorage
 */
function initializeSessionStorage() {
    let curSubmission = {};
    curSubmission.job_name = '';
    curSubmission.job_desc = '';
    curSubmission.job_type = '';
    sessionStorage.curSubmission = JSON.stringify(curSubmission);
}

/**
 * Parses sessionStorage to get its info as a dictionary
 */
function parseSessionStorage() {
    return JSON.parse(sessionStorage.curSubmission)
}

/**
 * Adds or removes values from sessionStorage. If remove is chosen then simply deletes the key from sessionStorage
 * @param key the key to update
 * @param value the value to update with
 * @param addOrRemove whether to add value to key or remove the key altogether
 */
function updateSessionStorage(key, value, addOrRemove) {
    //if add then add value to key in sessionStorage
    if (addOrRemove === 'add') {
        let temporaryStorage = parseSessionStorage();
        temporaryStorage[key] = value;
        sessionStorage.curSubmission = JSON.stringify(temporaryStorage);
    }
    //if not add then remove the key entirely
    else {
        let temporaryStorage = parseSessionStorage();
        delete temporaryStorage[key];
        sessionStorage.curSubmission = JSON.stringify(temporaryStorage);
    }
}

/**
 * Logs sessionStorage variable contents
 */
function logSessionStorage() {
    console.log('cur storage', parseSessionStorage());
}
