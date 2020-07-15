import os
import boto3
import numpy as np
import _access_keys as ak

from algorithms.Algorithm import Algorithm
from algorithms.lstm.Config import Config
from helpers.DbInteractions import DbInteractions


class MLAlgorithm(Algorithm):
    """
    Superclass for all machine learning algorithms
    """

    def __init__(self, job):
        super().__init__(job)
        self.cur_job.use_ml = True # boolean whether current job requires the use of any machine learning for analysis

        self.config = Config("_config_files/config_new.yaml") # path to config file
        self.s3 = boto3.resource('s3', aws_access_key_id = ak.aws_access_key_id,
                                 aws_secret_access_key = ak.aws_secret_access_key) # s3 bucket info needed for loading and saving LSTM models
        self.bucket = self.s3.Bucket("anomdetectmodels")

        self.path_train = os.path.join(self.cur_job.resources_folder, 'train')
        self.path_test = os.path.join(self.cur_job.resources_folder, 'test')

        self.X_train = []
        self.y_train = []

        self.X_test = []
        self.y_test = []

        self.y_hats = {}

        # make the necessary directories
        self.make_dirs()
        # update progress in db to job started
        self.cur_job.update_progress(3)

        # self.log('---------------------------------', ())
        print('%s : Starting LSTM' % (self.cur_job.job_id))

    def make_dirs(self):
        """
        Create directories needed for running lstms
        :return: None
        """
        paths = ['temp_logs/%s/models' % self.cur_job.job_id, 'temp_logs/%s/y_hat' % self.cur_job.job_id]

        for p in paths:
            if not os.path.isdir(p):
                os.mkdir(p)


    def get_ytrains(self):
        """
        Gets the signal values that algorithm will train on
        :return: dictionary where key is channel name and value is signal values
        """
        ytrain_dict = {}
        for item in self.cur_job.args['params']['sets']['train']:
            ytrain_dict[item['name']] = item['sig_vals']
        return ytrain_dict

    def get_ytests(self):
        """
        Gets the signal values that algorithm will test on
        :return: dictionary where key is channel name and value is signal values
        """
        ytest_dict = {}
        for item in self.cur_job.args['params']['sets']['test']:
            ytest_dict[item['name']] = np.array([[a] for a in item['sig_vals'][self.config.l_s+1:]])
        return ytest_dict

    def get_yhats(self):
        """
        Gets the signal values that LSTM predicted
        :return: dictionary where key is channel name and value is LSTM-smoothed signal values
        """
        yhat_dict = {}
        results = self.cur_job.results
        for chan in self.cur_job.results.keys():
            y_hat = results[chan]['smoothed_signal']
            yhat_dict[DbInteractions().add_channel_period(chan)] = DbInteractions().db_arr_to_npy(y_hat)
        return yhat_dict