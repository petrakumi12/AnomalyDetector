import os

import boto3

from algorithms.Algorithm import Algorithm
from algorithms.ProgressLogger import ProgressLogger
from algorithms.lstm._globals import Config
from algorithms.lstm.custom_helpers import make_training_set
from helpers.db_interactions import add_channel_period, db_arr_to_npy


class MLAlgorithm(Algorithm):
    """
    Class that handles running LSTM jobs
    """

    def __init__(self, job):
        super().__init__(job)
        self.cur_job.use_ml = True

        self.config = Config("_config_files/config_new.yaml")
        self.s3 = boto3.resource('s3', aws_access_key_id='AKIA6DRFAEOYPV5RRJFF',
                                 aws_secret_access_key='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')
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
        ProgressLogger().log(('Starting LSTM: %s', (self.cur_job.job_id)))

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
        ytrain_dict = {}
        for item in self.cur_job.args['params']['sets']['train']:
            ytrain_dict[item['name']] = item['sig_vals']
        return ytrain_dict

    def get_ytests(self, train):
        ytest_dict = {}
        if train:
            for item in self.cur_job.args['params']['sets']['test']:
                ytest_dict[item['name']]= make_training_set([item],
                                 self.cur_job.args['params']['times']['param_1'],
                                 self.cur_job.args['params']['times']['param_2'])
        else:
            for item in self.cur_job.args['params']['sets']['test']:
                ytest_dict[item['name']] = item['sig_vals'][self.config.l_s:]
        return ytest_dict

    def get_yhats(self):
        yhat_dict = {}
        results = self.cur_job.results
        for chan in self.cur_job.results.keys():
            y_hat = results[chan]['smoothed_signal']
            yhat_dict[add_channel_period(chan)] = db_arr_to_npy(y_hat)
        print('get yhats:', yhat_dict)
        return yhat_dict