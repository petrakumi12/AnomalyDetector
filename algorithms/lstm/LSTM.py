import os

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

        self.path_train = path_train
        self.path_test = path_test

        self.X_train = []
        self.y_train = []

        self.X_test = []
        self.y_test = []

        self.y_hats = {}

        print('hi', args['params']['sets']['train'])

        # make the necessary directories
        helpers.make_dirs(args['_id'])
        # set up the logger
        helpers.setup_logging(self.config, args['_id'], logger)
        # updating progress in db to job started
        db_interactions.update_progress(args['_id'], args['jobs_db'], 3)

    def run(self):
        _id = self.args['_id']
        job_db = self.args['jobs_db']

        try:

            db_interactions.update_progress(_id, job_db, 5)

            # train here first
            # ===============================================
            if self.config.train:
                self.X_train, self.y_train = helpers.load_train_data(self.path_train)
                model = models.generate_train_model(self.X_train, self.y_train)
                # save trained model locally for each
                model.save(os.path.join("telemanom_temp_logs", _id, "models", 'train' + ".h5"))
            else:
                model = models.load_train_model()

            # then predict here using generated model
            # ===============================================
            db_interactions.update_progress(_id, job_db, 6)  # predicting calculating anomalies update

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
            keras.backend.clear_session()
            return self.y_hats

        except Exception as e:
            print(e)
            # everything is done, closing connection and deleting temp folders
            # if os.path.exists(os.path.join(os.getcwd(), 'resources', 'temp',_id)):
            #     shutil.rmtree(os.path.join(os.getcwd(), 'resources', 'temp',_id))
            db_interactions.update_progress(_id, job_db, -1)  # log interruption
            return self.y_hats
