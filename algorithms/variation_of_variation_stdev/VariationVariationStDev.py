import numpy as np

from helpers.normalizer import normalize_arr
import algorithms.variation_percentile.variation_helpers as vh


class VariationVariationStDev:
    """
    Class that handles running the method of  Variation of Variation with Standard Deviation-based Threshold
    """

    def __init__(self, args, arrays, logger):
        self.args = args
        self.arrays = arrays
        self.logger = logger
        self.results = {}

    def run(self):
        B = self.args['params']['alg_params']['B']
        B_2 = self.args['params']['alg_params']['B_2']
        threshold = self.args['params']['alg_params']['threshold']

        print("chans being analyzed: %s" % self.arrays.keys())
        i = 0
        for chan, series in self.arrays.items():
            self.logger.info("analyzing %s (%s of %s)" % (chan, i, len(self.arrays.keys())))

            var = [element[0] for element in normalize_arr(np.array(vh.variation(series, B)).reshape(-1, 1))]
            var_var = [element[0] for element in normalize_arr(np.array(vh.variation(var, B_2)).reshape(-1, 1))]

            mean = np.mean(var_var)
            std = np.sqrt(np.sum([(i - np.mean(var_var)) ** 2 for i in var_var]) / len(var_var))

            indices = np.where(var_var > mean + (threshold * std))[0]

            predicted_anomalies = [1 if i-B-B_2 in indices else 0 for i in range(len(series[:]))]
            self.results[chan.replace('.csv', 'csv')] = {
                'variation_arr': var,
                'variation_variation_arr': var_var,
                'anom_array': predicted_anomalies,
                'num_anoms': predicted_anomalies.count(1)
            }

        self.logger.info("variation method complete")
        self.logger.info("--------------------------------")

        return self.results