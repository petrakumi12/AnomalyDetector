import os
import shutil
from pathlib import Path

from algorithms.ProgressLogger import ProgressLogger
from algorithms.Raw import Raw
from algorithms.lstm import custom_helpers
from algorithms.lstm.LSTM import LSTM
from algorithms.telemanom.Telemanom import Telemanom
from algorithms.variation_of_variation_stdev.VariationVariationStDev import VariationVariationStDev
from algorithms.variation_algorithms.VariationPercentile import VariationPercentile
from algorithms.variation_algorithms.VariationStandardDeviation import VariationStandardDeviation
from helpers.db_interactions import db_arr_to_npy


class Job:
    """
    Class responsible for initializing, carrying through, and ending a job
    """

    def __init__(self, args):
        """
        Initialize Job object
        :param args: jobs arguments to be added to the job db
        """
        self.job_id = args['_id']
        self.db = args['jobs_db']
        self.use_ml = False  # turns True when LSTM or another ML model is used
        self.ml_object = None  # object that is initialized for ML in the job - can only be one
        del args['jobs_db']  # don't need this in the args variable - will keep only what needs to be posted on jobs db

        self.resources_folder = os.path.join(os.getcwd(), 'temp_logs', self.job_id)
        self.args = args
        # self.signal_arrays = {}  # arrays of signal values to be analyzed using anomaly detection methdos

        self.results = {}
        self.success = True

        self.progress = {
            0: 'Processing user input',
            1: 'Preparing datasets',
            2: 'Job queued',
            3: 'Job initialized',
            4: 'Job in progress - preparing sets for LSTM',
            5: 'Job in progress - training / loading trained model',
            6: 'Job in progress - predicting output',
            7: 'Job in progress - calculating errors',
            8: 'Job in progress - calculating anomalies',
            9: 'Job complete',
            -1: 'Job interrupted - error'
        }

        self.update_progress(0)
        self.db.insert(args)

    def update_progress(self, number):
        """
        Updates job progress in the db and informs user about it
        :param number: progress number to be used as key on job.progress dictionary to get progress state
        :return: None
        """
        self.db.update_one(
            {'_id': self.job_id},
            {'$set': {'progress': self.progress[number]}}
        )
        ProgressLogger().log((self.progress[number] + ": %s ", self.job_id))

    def prep(self):
        """
        Prepares datasets for the specific jobs
        :return: the updated job details
        """
        print('prepping job')


        # make resources folder for temporary storage of datasets
        Path(os.path.join(self.resources_folder, 'train')).mkdir(parents=True, exist_ok=True)
        Path(os.path.join(self.resources_folder, 'test')).mkdir(parents=True, exist_ok=True)

        # update db to processing user input
        self.update_progress(0)

        # first, reformat inputted datasets to make usable
        self.args = custom_helpers.reformat_datasets(self.args)
        self.db.update_one(
            {'_id': self.job_id},
            {'$set': {'params': self.args['params']}}
        )

    def run(self, anomalydetector):
        """
        Runs the anomaly detection job and saves results
        :return:
        """
        print('run job called')
        # self.log('--------------------------------',())
        ProgressLogger().log(('Starting %s', (self.args['job_type'])))
        # self.log('--------------------------------',())
        # try:
        self.prep()
        LSTM(self)
        Raw(self)
        self.update_progress(8)  # calculating anomalies
        Telemanom(self)
        VariationPercentile(self)
        VariationStandardDeviation(self)
        VariationVariationStDev(self)
        self.save_results()
        # except:
        #     print('failed')
        #     job.success = False
        self.end()
        print('running false')
        anomalydetector.is_running = False

    def end(self):
        print('ending job')
        if self.success:
            print('successful')
            self.update_progress(9)  # final update to job completed
        else:
            ProgressLogger().log('Job interrupted so early stopping activated')
        # close logger handlers
        handlers = ProgressLogger().logger.handlers[:]
        for handler in handlers:
            handler.close()
            ProgressLogger().logger.removeHandler(handler)

        # everything is done, closing connection and deleting temp folders
        if os.path.exists(os.path.join(os.getcwd(), 'resources')):
            shutil.rmtree(os.path.join(os.getcwd(), 'resources'))

        if os.path.exists(os.path.join(os.getcwd(), 'temp_logs')):
            shutil.rmtree(os.path.join(os.getcwd(), 'temp_logs'))

    def save_results(self):
        if self.success:
            self.db.update_one(
                {'_id': self.job_id},
                {'$set': {'results': self.results}}
            )

    def get_ytests(self):
        ytest_dict = {}
        for item in self.args['params']['sets']['test']:
            ytest_dict[item['name']] = db_arr_to_npy(item['sig_vals'])
        return ytest_dict

    def get_test_channels(self):
        return [item['name'] for item in self.args['params']['sets']['test']]


