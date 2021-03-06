from pytz import timezone
from datetime import datetime as dt
from helpers.DbInteractions import DbInteractions
import numpy as np
import helpers.api_helpers as api_helpers

class Server:
    """
    Class that handles preparing and processing data for running with LSTMs
    """

    def prepare_request(self, args, mongo, anomalydetector):
        """
        Prepares a request for submission to the queue
        :param args: the request submitted by user
        :param mongo: the MongoDb app
        :param anomalydetector: the anomaly detection object
        :return: the request dictionary updated to be ready for submission
        """
        args['jobs_db'] = mongo.db.jobs  # add jobs database to request
        _id = args['job_name']  # assign job name as id

        # try to parse id as a datetime
        # if that's not possible then make id equal to the current date time
        try:
            dt.strptime(args['job_name'], "%Y-%m-%d_%H.%M.%S")

        except ValueError:
            _id = dt.now(timezone('EST')).strftime("%Y-%m-%d_%H.%M.%S")
        args['_id'] = _id  # add id to request

        args = api_helpers.load_data_from_csv(args)  # parse the csv files in the path if request is from api
        args = api_helpers.add_default_parameters(args, anomalydetector)  # add default parameters if not in request

        return args


    def submit_request(self, args, anomalydetector):
        """
        Submits anomaly detection job request to queue
        :return: the queue containing all the jobs
        """
        print("Submitted new anomaly detection job to server")
        anomalydetector.queue_job(args, anomalydetector.lock)
        return anomalydetector.jobs_queue


    def get_channels(self, subject_name):
        """
        Retrieves channels of a subject, given their name
        :param subject_name: name of subject
        :return: array of channel names
        """
        connection, cursor = DbInteractions().connect_db()
        chan_array = DbInteractions().get_channels(subject_name, cursor)
        DbInteractions().disconnect_db(connection, cursor)
        return chan_array


    def get_graph_vals(self, args):
        """
        Generates signal values of channels for making graph
        :param args: the arguments used in the submission request
        :return: a dictionary of all channel names, times, and signal values
        """
        subject_name = args['subject_name']
        chan_arr = args['chan_arr']
        time_arr = []
        val_arr = []

        connection, cursor = DbInteractions().connect_db()  # connect to Postgres Db
        # make array of signal values from each channel in the array of channels
        for chan_name in chan_arr:
            time_sig = DbInteractions().get_sig_val_as_arr(cursor, subject_name, chan_name)
            time_arr = time_sig[:, 0]
            sig_arr = time_sig[:, 1]
            val_arr = np.vstack((val_arr, sig_arr)) if len(val_arr) != 0 else sig_arr

        # add to final dictionary all channels and their signal values
        all_signal_values = {}
        for i in range(0, len(chan_arr)):
            if len(chan_arr) == 1:
                all_signal_values[chan_arr[i]] = val_arr.tolist()
            else:
                all_signal_values[chan_arr[i]] = val_arr[i].tolist()

        final_dict = {
            'times': time_arr.tolist(),
            'chans': chan_arr,
            'sig_vals': all_signal_values
        }

        DbInteractions().disconnect_db(connection, cursor)  # disconnect from Postgres
        return final_dict
