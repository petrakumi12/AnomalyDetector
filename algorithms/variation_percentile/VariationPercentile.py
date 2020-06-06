import numpy as np

from algorithms.Algorithm import Algorithm
from algorithms.ProgressLogger import ProgressLogger
from helpers.normalizer import normalize_arr
import algorithms.variation_percentile.variation_helpers as vh


class VariationPercentile(Algorithm):
    """
    Class that handles running the method of Variation with Percentile-based Threshold
    """

    def __init__(self, job):
        super().__init__(job)
        if self.cur_job.args['job_type'] == 'Variation with Percentile-based Threshold':
            self.run()

    def run(self):
        B = self.cur_job.args['params']['alg_params']['B']
        percentile = self.cur_job.args['params']['alg_params']['percentile']
        chans = self.cur_job.get_test_channels()
        print("chans being analyzed: %s" % chans)
        i = 0
        for chan, series in self.cur_job.get_ytests().items():
            ProgressLogger().log("analyzing %s (%s of %s)" % (chan, i, len(chans)))

            var = [element[0] for element in normalize_arr(np.array(vh.variation(series, B)).reshape(-1, 1))]
            indices = np.where(var > np.percentile(var, [percentile]))[0]

            predicted_anomalies = [1 if i - B in indices else 0 for i in range(len(series[:]))]
            # print('lengths: series, var, anoms', len(series), len(var), len(predicted_anomalies))
            self.cur_job.results[chan.replace('.csv', 'csv')] = {
                'variation_arr': var,
                'anom_array': predicted_anomalies,
                'num_anoms': predicted_anomalies.count(1)
            }
            i += 1

        # ProgressLogger.log("variation method complete")
        # ProgressLogger.log("--------------------------------")

