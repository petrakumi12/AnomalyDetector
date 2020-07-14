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
        if self.cur_job.args['job_type'] == 'Telemanom' and self.cur_job.use_ml:
            self.run()

    def run(self):
        print('%s : Starting Telemanom' % self.cur_job.job_id)
        for chan, y_hat in self.get_yhats().items():

            y_test = self.get_ytests()[chan]

            # Error processing
            e_s = ErrorProcessing().get_errors(y_test, y_hat, smoothed=True)
            E_seq, E_seq_scores = ErrorProcessing().process_errors(y_test, e_s)

            errors = np.zeros(len(y_hat))
            for interval in E_seq:
                for i in range(interval[0], interval[1]):
                    errors[i] = 1
            errors = list(errors)

            # Saving results
            self.cur_job.results[DbInteractions().remove_channel_period(chan)]['anom_array'] = errors
            self.cur_job.results[DbInteractions().remove_channel_period(chan)]['num_anoms'] = collections.Counter(errors)[1]
            print('%s : Telemanom Algorithm Complete' % self.cur_job.job_id)

