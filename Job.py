import os
import shutil
from pathlib import Path

from algorithms.Raw import Raw
from algorithms.lstm.DataPrepper import DataPrepper
from algorithms.lstm.LSTM import LSTM
from algorithms.telemanom.Telemanom import Telemanom
from algorithms.variation_algorithms.VariationVariationStDev import VariationVariationStDev
from algorithms.variation_algorithms.VariationPercentile import VariationPercentile
from algorithms.variation_algorithms.VariationStandardDeviation import VariationStandardDeviation
from helpers.DbInteractions import DbInteractions


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
        print(self.job_id + " : " + str(self.progress[number]))

    def prep(self):
        """
        Prepares datasets for the specific jobs
        :return: the updated job details
        """
        print("%s : Prepping job" % self.job_id)


        # make resources folder for temporary storage of datasets
        Path(os.path.join(self.resources_folder, 'train')).mkdir(parents=True, exist_ok=True)
        Path(os.path.join(self.resources_folder, 'test')).mkdir(parents=True, exist_ok=True)

        # update db to processing user input
        self.update_progress(0)

        # first, reformat inputted datasets to make usable
        self.args = DataPrepper().reformat_datasets(self.args)
        self.db.update_one(
            {'_id': self.job_id},
            {'$set': {'params': self.args['params']}}
        )

    def run(self, anomalydetector):
        """
        Runs the anomaly detection job and saves results
        :return:
        """
        # self.log('--------------------------------',())
        print("%s: Algorithm type %s on signal type %s" % (self.job_id, self.args['job_type'], self.args['signal_type']))
        print('--------------------------------')
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
        print('AnomalyDetector stopped running')
        anomalydetector.is_running = False

    def end(self):
        if self.success:
            print('%s : Job Successful' % self.job_id)
            self.update_progress(9)  # final update to job completed
        else:
            print('%s : Job interrupted so early stopping activated' % self.job_id)

        print('%s : Ending Job' % self.job_id)
        print('--------------------------------')

        # everything is done, deleting temp folders
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
            ytest_dict[item['name']] = DbInteractions().db_arr_to_npy(item['sig_vals'])
        return ytest_dict

    def get_test_channels(self):
        return [item['name'] for item in self.args['params']['sets']['test']]


