import os
import shutil
import sys
import traceback

import boto3

import helpers.plotter as plotter
import helpers.db_interactions as db_interactions

import numpy as np
import pydot

import algorithms.lstm.errors as err
import algorithms.lstm.modeling as models
from algorithms.lstm._globals import Config
import algorithms.lstm.helpers as helpers
import keras

keras.utils.vis_utils.pydot = pydot


class LSTM:
    """
    Class that handles running LSTM jobs
    """
    def __init__(self, args, path_train, path_test, logger):
        self.config = Config("_config_files/config_new.yaml")
        self.args = args
        self.logger = logger
        self.s3 = boto3.resource('s3', aws_access_key_id='AKIA6DRFAEOYPV5RRJFF',
                            aws_secret_access_key='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')
        self.bucket = self.s3.Bucket("anomdetectmodels")

        self.path_train = path_train
        self.path_test = path_test

        self.X_train = []
        self.y_train = []

        self.X_test = []
        self.y_test = []

        self.y_hats = {}

        # make the necessary directories
        helpers.make_dirs(args['_id'])
        # set up the logger
        helpers.setup_logging(args['_id'], logger)
        # updating progress in db to job started
        db_interactions.update_progress(args['_id'], args['jobs_db'], 3)

    def run(self):
        _id = self.args['_id']
        job_db = self.args['jobs_db']

        try:
            # update progress to training or loading trained model
            db_interactions.update_progress(_id, job_db, 5)

            self.config.job_id = _id

            # train here first
            # ===============================================
            if self.config.train:
                self.X_train, self.y_train = helpers.load_train_data(self.path_train)
                model = models.generate_train_model(self.X_train, self.y_train)
                # save trained model to aws s3 bucket for each
                models.upload_h5(model, self)
            else:
                model = models.load_train_model(self)

            # then predict here using generated model
            # ===============================================
            db_interactions.update_progress(_id, job_db, 6)  # update progress to predicting shape with lstm

            channel_names = [x[:-4] for x in os.listdir(self.path_test) if x[-4:] == '.npy']
            print("chans being predicted: %s" % channel_names)

            for i, chan in enumerate(channel_names):
                if i >= 0:
                    self.logger.info("predicting %s (%s of %s)" % (chan, i+1, len(channel_names)))

                    self.X_test, self.y_test = helpers.load_test_data(chan, self.path_test)

                    y_hat = models.predict_in_batches(self.y_test, self.X_test, model, chan, _id)
                    self.y_hats[chan] = y_hat

                    # Error calculations
                    # ====================================================================================================
                    e = err.get_errors(self.y_test, y_hat, chan, _id, smoothed=False)

                    normalized_error = np.mean(e) / np.ptp(self.y_test)
                    self.logger.info("normalized prediction error: %s" % normalized_error)

                    plotter.plot_real_pred_signal(self.y_test, y_hat, chan, self.path_train)

            self.logger.info("all predictions complete")
            self.logger.info("---------------------------------")
            # return self.y_hats

        except Exception as e:
            print(e)
            traceback.print_exc(file=sys.stdout)
            db_interactions.update_progress(_id, job_db, -1)  # log interruption


        keras.backend.clear_session()
        return self.y_hats
