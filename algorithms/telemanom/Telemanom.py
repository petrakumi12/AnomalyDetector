import collections
from algorithms.MLAlgorithm import MLAlgorithm
from algorithms.lstm.ErrorProcessing import ErrorProcessing
import numpy as np

from algorithms.lstm.DataPrepper import DataPrepper
from helpers.DbInteractions import DbInteractions


class Telemanom(MLAlgorithm):
    """
    Class that handles running the Telemanom algorithm
    """

    def __init__(self, job):
        super().__init__(job)
        print('use ml is', self.cur_job.use_ml)
        if self.cur_job.args['job_type'] == 'Telemanom' and self.cur_job.use_ml:
            self.run()

    def run(self):
        print('running telemanom')
        for chan, y_hat in self.get_yhats().items():

            print('chan', chan)
            print('y hat', y_hat, type(y_hat), np.shape(y_hat))
            print('get ytests',self.get_ytests(self.config.train))
            # if self.config.train:
            #     _, y_test = DataPrepper().shape_data_for_lstm(self.get_ytests(self.config.train)[chan], train=False)
            # else:
            y_test = self.get_ytests(self.config.train)[chan]

            print('y test', y_test, type(y_test), np.shape(y_test))
            # Error processing
            e_s = ErrorProcessing().get_errors(y_test, y_hat, smoothed=True)
            E_seq, E_seq_scores = ErrorProcessing().process_errors(y_test, e_s)

            errors = np.zeros(len(y_hat))
            for interval in E_seq:
                for i in range(interval[0], interval[1]):
                    errors[i] = 1
            errors = list(errors)
            # Saving results
            print('saving telemanom results')
            self.cur_job.results[DbInteractions().remove_channel_period(chan)]['anom_array'] = errors
            self.cur_job.results[DbInteractions().remove_channel_period(chan)]['num_anoms'] = collections.Counter(errors)[1]

