import os
import threading
from algorithms.AnomalyDetector import AnomalyDetector
from flask import Flask, render_template, jsonify, request, make_response
from flask_pymongo import PyMongo
import helpers.server_functions as server_functions
import boto3



# path = r'C:\Users\Petra Kumi\OneDrive - Worcester Polytechnic Institute (wpi.edu)\School\MQP\Python ' \
#        r'Code\custom_telemanom\telemanom_temp_logs '

app = Flask(__name__)
app._static_folder = os.path.abspath("templates/static/")
app.config['MONGO_URI'] = \
    "mongodb+srv://Kumi:Hg1kbxPcCmYtWI6h@cluster0-atswd.azure.mongodb.net/test?retryWrites=true&w=majority"
app.config['MONGO_DBNAME'] = 'restdb'

mongo = PyMongo(app)
db = mongo.db


# Site page routes
@app.route('/')
def home():
    return render_template('index_new.html')


@app.route('/results')
def results():
    return render_template('results_new.html')


@app.route('/compare_algs')
def compare_algs_page():
    return render_template('compare_algs.html')


@app.route('/lstm_parameters')
def lstm_parameters():
    return render_template('lstm_parameters.html')


@app.route('/new_job_prev')
def new_job_prev():
    return render_template('new_job_prev.html')


@app.route('/pick_method')
def pick_method():
    return render_template('pick_method.html')


@app.route('/pick_comparison')
def pick_comparison():
    return render_template('pick_comparison.html')


@app.route('/submitted')
def submitted():
    return render_template('submitted.html')


@app.route('/lstm_prev_params')
def lstm_prev_params():
    return render_template('lstm_prev_params.html')


@app.route('/visualize')
def visualize_submission():
    return render_template('visualize_submission.html')


# Endpoints for message passing between user and server

@app.route('/submit_request', methods=['POST'])
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


@app.route('/get_jobs', methods=['GET'])
def get_jobs():
    """
    Retrieves all entries in the job collection of MongoDb
    :return: a json with the job information
    """
    final_arr = []
    for job in mongo.db.jobs.find({}):
        final_arr.append(job)
    return make_response({"jobs": final_arr}, 200)


@app.route('/delete_entry', methods=['POST'])
def delete_entry():
    """
    Deletes entry in the job collection of MongoDb
    :return: a success response
    """
    args = request.get_json(force=True)
    mongo.db.jobs.delete_one({'_id': args['id']})
    return make_response('ok', 200)


@app.route('/get_default_params', methods=['GET'])
def get_default_params():
    """
    Gets default parameters for all algorithms
    :return: a dictionary with algorithm types, their parameter names, and their default values
    """
    return make_response(jsonify(anomalydetector.default_algorithm_parameters), 200)


@app.route('/get_uploaded_datasets', methods=['GET'])
def get_uploaded_datasets():
    """
    Retrieve all datasets uploaded on the uploaded_datasets collection in MongoDb
    :return: a dictionary containing all uploaded datasets names and their values
    """
    set_dict = {}
    for dataset in mongo.db.uploaded_datasets.find({}):
        set_dict[dataset['name']] = dataset['data']
    return make_response(set_dict, 200)


@app.route('/upload_new_datasets', methods=['POST'])
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


@app.route('/get_saved_models', methods=['GET'])
def get_saved_models():
    """
    Retrieves all LSTM models that were saved during previous jobs
    :return: all jobs with saved LSTM models
    """
    res_arr = []
    for file in anomalydetector.bucket.objects.all():
        id = file.key.replace(".h5", "")
        job = mongo.db.jobs.find_one({"_id": id})
        if job is not None:
            res_arr.append(job)
            print('job', job)
    return make_response(jsonify(res_arr), 200)


# Server functions just for the API

@app.route('/job_progress', methods=['POST'])
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


@app.route('/job_details', methods=['POST'])
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
    anomalydetector.load_default_algorithm_params()  # load default parameters in the anomaly detector
    jobs = threading.Thread(target=server_functions.start_thread, args=[anomalydetector])  # initialize threads
    jobs.start()  # start jobs threads
    app.run(threaded=True, debug=True)  # run application

    # app.run(host=os.getenv('IP', '0.0.0.0'),port=int(os.getenv('PORT', 4444)), debug=True)

# @app.route('/get_info/<id>', methods=['GET'])
# def get_info(id):
#     """
#     Retrieves result information about complegted job
#     :param id: id of job
#     :return: the job json from the database
#     """
#     job = mongo.db.jobs.find_one({'_id': id})
#     job = make_response(jsonify(job), 200)
#     return job

#
# @app.route('/get_channels/<subject_name>', methods=['GET'])
# def get_channels(subject_name):
#     """
#     Gets channels of a subject, given their name
#     :param subject_name: name of subject
#     :return: array of channel names
#     """
#     connection, cursor = db_interactions.connect_db() # connect to Postgres db
#     chan_array = db_interactions.get_channels(subject_name, cursor)
#     db_interactions.disconnect_db(connection, cursor)
#     return chan_array

# @app.route('/get_graph', methods=['POST'])
# def get_graph_vals():
#     """
#     Generates signal values of channels for making graph
#     :return: dict {times:[],channel_names:[],sig_vals:{chan_name:[]}
#     """
#     return server_functions.get_graph_vals(request.get_json(force=True))

# @app.route('/compare_algs/<ids>', methods=['GET'])
# def compare_algs(ids):
#     """
#     Gets jobs from the database matching the requested id's and returns them to user
#     :param ids: a string containing ids to be compared separated with a comma
#     :return: a json containing an array of jsons for all requested jobs
#     """
#     info_arr = []
#     for element in ids.split(','):
#         found_result = mongo.db.jobs.find_one({'_id': element})
#         info_arr.append(found_result)
#     return make_response(jsonify({'info': info_arr}), 200)


# @app.route('/post_comparison_data', methods=['POST'])
# def post_comparison_data():
#     """
#     Will post data about the comparisons on the database for manipulation
#     :return: a json saying that the request went through
#     """
#     mongo.db.comparison_data.remove({})
#     print("comparison data posted ")
#     ids = request.get_json(force=True)
#     print("ids", ids)
#     for id in ids['ids']:
#         data = mongo.db.jobs.find_one({'_id': id})
#         print("found", data)
#         mongo.db.comparison_data.insert(data)
#     return make_response('ok', 200)

#
# @app.route('/get_comparison_data', methods=['GET'])
# def get_comparison_data():
#     """
#     Will receive data from db about comparisons and send to user
#     :return: a json of an array containing the job comparison information
#     """
#     print("comparison data received")
#     print("received this", [element for element in mongo.db.comparison_data.find()])
#     return make_response(jsonify([element for element in mongo.db.comparison_data.find()]), 200)

# '105-SART-June2018-VC', '109-SART-June2018-NT',
# '111-SART-June2018-MO',
# '113-SART-June2018-TN', '116-SART-June2018-MD', '106-SART-June2018-MH', '119-SART-June2018-YA']
