import os
import shutil
import sys
import traceback
import keras
import yaml
import helpers.plotter as plotter

import numpy as np
import pydot

from algorithms.lstm.ErrorProcessing import ErrorProcessing
from algorithms.lstm.LSTMModel import LSTMModel
from algorithms.MLAlgorithm import MLAlgorithm
from algorithms.lstm.DataPrepper import DataPrepper
from algorithms.lstm.Config import Config
from helpers.DbInteractions import DbInteractions

keras.utils.vis_utils.pydot = pydot


class LSTM(MLAlgorithm):
    """
    Class that handles running LSTM jobs
    """

    def __init__(self, job):
        super().__init__(job)

        # if using lstm smoothing
        if 'LSTM' in self.cur_job.args['signal_type']:
            self.setup_lstm_environment()
            self.run()
            self.save_results()

    def setup_lstm_environment(self):
        """
        Makes sure all datasets are formatted, normalized, and saved, config file is updated, variables are put in the right form.
        :return:
        """
        print('%s : Using LSTM-smoothed signal' % self.cur_job.job_id)
        # adding params that will be needed in the config file for both training and testing lstms
        self.cur_job.args = DataPrepper().add_extra_lstm_params(self.cur_job.args)
        DataPrepper().prepare_testing_sets(self.cur_job.args, self.cur_job.resources_folder)  # prep testing sets

        if self.cur_job.args['signal_type'] == 'LSTM-new':  # adding params that are needed if training new model
            print('%s : Will train new LSTM model' % self.cur_job.job_id)
            DataPrepper().prepare_training_sets(self.cur_job.args, self.cur_job.resources_folder)

        if self.cur_job.args['signal_type'] == 'LSTM-prev':  # adding params that are needed if using previously trained model
            print('%s : Will use previously trained LSTM model' % self.cur_job.job_id)
            self.cur_job.args = DataPrepper().add_testing_lstm_params(self.cur_job.args)

        # third, make sure the parameters are the right type and dump them to the config file
        self.cur_job.args = DataPrepper().convert_args_to_numeric(self.cur_job.args)
        with open("_config_files/config_new.yaml", "w") as file:
            yaml.dump(self.cur_job.args['params']['alg_params'], file)
        file.close()

    def run(self):
        """
        Runs LSTM: checks if training, testing, or both and calls appropriate functions to generate or load model accordingly for each channel
        :return:
        """
        self.config = Config("_config_files/config_new.yaml") # reload config in case we have updated any of its values

        try:
            # update progress to training or loading trained model
            self.cur_job.update_progress(5)

            self.config.job_id = self.cur_job.job_id

            # train here first
            # ===============================================
            if self.config.train:
                self.X_train, self.y_train = DataPrepper().load_train_data(self.path_train)
                model = LSTMModel().generate_train_model(self.X_train, self.y_train)
                # save trained model to aws s3 bucket for each
                LSTMModel().upload_h5(model, self)
            else:
                model = LSTMModel().load_train_model(self)

            # then predict here using generated model
            # ===============================================
            self.cur_job.update_progress(6)  # update progress to predicting shape with lstm

            channel_names = [x[:-4] for x in os.listdir(self.path_test) if x[-4:] == '.npy']
            print("%s : Channels being predicted: %s" % (self.cur_job.job_id,channel_names))

            for i, chan in enumerate(channel_names):
                if i >= 0:
                    print("%s : Predicting %s (%s of %s)" % (self.cur_job.job_id, chan, i + 1, len(channel_names)))

                    self.X_test, self.y_test = DataPrepper().load_test_data(chan, self.path_test)
                    y_hat = LSTMModel().predict_in_batches(self.y_test, self.X_test, model, chan, self.cur_job.job_id)
                    self.y_hats[chan] = y_hat

                    # Error calculations
                    # ====================================================================================================
                    # e = ErrorProcessing().get_errors(self.y_test, y_hat, smoothed=False)
                    # normalized_error = np.mean(e) / np.ptp(self.y_test)

                    plotter.plot_real_pred_signal(self.y_test, y_hat, chan, self.path_train)

            print("%s : LSTM smoothing complete" % self.cur_job.job_id)
            print("---------------------------------")

        except Exception as e:
            print(e)
            traceback.print_exc(file=sys.stdout)
            self.cur_job.update_progress(-1)  # log interruption

        keras.backend.clear_session()
        # self.cur_job.signal_arrays = self.y_hats

    def save_results(self):
        """
        Saves results of LSTM testing (predicting) to database
        :return:
        """
        for chan, y_hat in self.y_hats.items():
            chan = DbInteractions().remove_channel_period(chan)
            if not chan in self.cur_job.results.keys():
                self.cur_job.results[chan] = {}
            self.cur_job.results[chan]['smoothed_signal'] = DbInteractions().prep_npy_arr_for_db(y_hat)



