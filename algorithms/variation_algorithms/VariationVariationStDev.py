import numpy as np

from algorithms.variation_algorithms.Variation import Variation
from helpers.normalizer import normalize_arr


class VariationVariationStDev(Variation):
    """
    Class that handles running the method of  Variation of Variation with Standard Deviation-based Threshold
    """

    def __init__(self, job):
        super().__init__(job)
        if self.cur_job.args['job_type'] == 'Variation of Variation with Standard Deviation-based Threshold':
            self.run()

    def run(self):
        B = self.cur_job.args['params']['alg_params']['B']
        B_2 = self.cur_job.args['params']['alg_params']['B_2']
        threshold = self.cur_job.args['params']['alg_params']['threshold']
        chans = self.cur_job.get_test_channels()
        print("Channels being analyzed: %s" % chans)
        i = 0
        for chan, series in self.cur_job.get_ytests().items():
            print("%s: Analyzing %s (%s of %s)" % (self.cur_job.job_id, chan, i+1, len(chans)))

            var = [element[0] for element in normalize_arr(np.array(self.variation(series, B)).reshape(-1, 1))]
            var_var = [element[0] for element in normalize_arr(np.array(self.variation(var, B_2)).reshape(-1, 1))]

            mean = np.mean(var_var)
            std = np.sqrt(np.sum([(i - np.mean(var_var)) ** 2 for i in var_var]) / len(var_var))

            indices = np.where(var_var > mean + (threshold * std))[0]

            predicted_anomalies = [1 if i-B-B_2 in indices else 0 for i in range(len(series[:]))]
            self.cur_job.results[chan.replace('.csv', 'csv')] = {
                'variation_arr': var,
                'variation_variation_arr': var_var,
                'anom_array': predicted_anomalies,
                'num_anoms': predicted_anomalies.count(1)
            }

        print("%s : Variation of Variation with Standard Deviation-based Threshold Algorithm Complete" % self.cur_job.job_id)
        print("--------------------------------")

