import os
import threading
from AnomalyDetector import AnomalyDetector
from flask import Flask, render_template, jsonify, request, make_response
from flask_pymongo import PyMongo
import helpers.server_functions as server_functions

app = Flask(__name__, template_folder='web')
app._static_folder = os.path.abspath("web/static/")
app.config['MONGO_URI'] = \
    "mongodb+srv://Kumi:Hg1kbxPcCmYtWI6h@cluster0-atswd.azure.mongodb.net/test?retryWrites=true&w=majority"
app.config['MONGO_DBNAME'] = 'restdb'

mongo = PyMongo(app)
db = mongo.db


# Site page routes
@app.route('/')
def home():
    return render_template('index.html')


@app.route('/results')
def results():
    return render_template('results.html')


@app.route('/compareAlgorithms')
def compare_algorithms():
    return render_template('compareAlgorithms.html')


@app.route('/pickJobParameters')
def pick_parameters():
    return render_template('pickJobParameters.html')


@app.route('/pickPreviousLSTMModel')
def pick_previously_saved_model():
    return render_template('pickPreviousLSTMModel.html')


@app.route('/pickAnomalyDetector')
def pick_method():
    return render_template('pickAnomalyDetector.html')


@app.route('/submitJob')
def submit():
    return render_template('submitJob.html')



@app.route('/visualize')
def visualize_submission():
    return render_template('visualizeJobResults.html')


# Endpoints for message passing between user and server

@app.route('/submitRequest', methods=['POST'])
def submit_request():
    """
    Handles requests to start an anomaly detection job:
    Prepares for submission and submits to queue
    Receives from user a dictionary of parameters necessary for submitting the job
    :return: string with status and id of request
    """
    req = request.get_json(force=True)  # get request as json
    req = server_functions.prepare_request(req, mongo, anomalydetector)  # prepare request to submit to queue
    server_functions.submit_request(req, anomalydetector)  # submit request to queue
    return make_response({'status': 'success', 'id': req['_id']}, 200)


@app.route('/getJobs', methods=['GET'])
def get_jobs():
    """
    Retrieves all entries in the job collection of MongoDb
    :return: a json with the job information
    """
    final_arr = []
    for job in mongo.db.jobs.find({}):
        final_arr.append(job)
    return make_response({"jobs": final_arr}, 200)


@app.route('/deleteEntry', methods=['POST'])
def delete_entry():
    """
    Deletes entry in the job collection of MongoDb
    :return: a success response
    """
    args = request.get_json(force=True)
    mongo.db.jobs.delete_one({'_id': args['id']})
    return make_response('ok', 200)


@app.route('/getDefaultParameters', methods=['GET'])
def get_default_params():
    """
    Gets default parameters for all algorithms
    :return: a dictionary with algorithm types, their parameter names, and their default values
    """
    return make_response(jsonify(anomalydetector.default_algorithm_parameters), 200)


@app.route('/getUploadedDatasets', methods=['GET'])
def get_uploaded_datasets():
    """
    Retrieve all datasets uploaded on the uploaded_datasets collection in MongoDb
    :return: a dictionary containing all uploaded datasets names and their values
    """
    set_dict = {}
    for dataset in mongo.db.uploaded_datasets.find({}):
        set_dict[dataset['name']] = dataset['data']
    return make_response(set_dict, 200)


@app.route('/uploadNewDatasets', methods=['POST'])
def upload_new_datasets():
    """
    Uploads new datasets to the uploaded_datasets MongoDb collection
    :return: a success response
    """
    to_upload = request.get_json(force=True)['to_upload']
    for item in to_upload:
        name = item['name']
        data = item['sig_vals']
        # check if the dataset is already in database, if not add to db otherwise skip
        if mongo.db.jobs.find_one({'name': name, 'data': data}) is None:
            print('no prev uploads with params ', name, data, ' found, so inserting this to db')
            mongo.db.uploaded_datasets.insert({'name': name, 'data': data})
    return make_response('ok', 200)


@app.route('/getSavedModels', methods=['GET'])
def get_saved_models():
    """
    Retrieves all LSTM models that were saved during previous jobs
    :return: all jobs with saved LSTM models
    """
    res_arr = []
    for file in anomalydetector.bucket.objects.all():
        an_id = file.key.replace(".h5", "")
        job = mongo.db.jobs.find_one({"_id": an_id})
        if job is not None:
            res_arr.append(job)
            print('job', job)
    return make_response(jsonify(res_arr), 200)


# Server functions just for the API

@app.route('/getJobProgress', methods=['POST'])
def get_job_status():
    """
    Gets status of job with id requested by user
    return: a dictionary with job id, name, and progress
    """
    an_id = request.get_json(force=True)['id']
    a_result = mongo.db.jobs.find_one({'_id': an_id})
    return make_response({'id': an_id,
                          'job_name': a_result['job_name'],
                          'progress': a_result['progress']}, 200)


@app.route('/getJobDetails', methods=['POST'])
def get_job_details():
    """
    Gets all job details for job with id requested by user
    return: a dictionary with all the details for the job
    """
    an_id = request.get_json(force=True)['id']
    a_result = mongo.db.jobs.find_one({'_id': an_id})
    return make_response(a_result, 200)


# Db interaction functions separate from the app

def save_datasets():
    """
    Saves datasets from Postgres to Mongodb
    :return: None
    """
    subject_arr = ['101-SART-June2018-AS', '102-SART-June2018-AS']
    for subject in subject_arr:
        for chan in server_functions.get_channels(subject):
            data = server_functions.get_graph_vals({
                'subject_name': subject,
                'chan_arr': [chan]
            })
            upload_dict = {
                'name': subject + '_' + chan,
                'data': data['sig_vals'][chan]
            }
            mongo.db.uploaded_datasets.insert(upload_dict)
    return


def clear_uploaded():
    """
    Removes all documents in the uploaded_datasets collection in MongoDb
    :return: None
    """
    mongo.db.uploaded_datasets.remove({})
    return


def clear_jobs_db():
    """
    Removes all documents in the jobs collection of MongoDb
    :return: None
    """
    anomalydetector.bucket.objects.all().delete()
    mongo.db.jobs.remove({})
    return


if __name__ == '__main__':
    anomalydetector = AnomalyDetector()  # initialize anomaly detector
    # clear_jobs_db()
    thread = threading.Thread(target=anomalydetector.start_thread, args=[])  # initialize threads
    thread.start()  # start jobs threads
    app.run(threaded=True, debug=True)  # run application

