import numpy as np

from helpers.normalizer import normalize_arr
import algorithms.variation_percentile.variation_helpers as vh


class VariationStandardDeviation:
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
        threshold = self.args['params']['alg_params']['threshold']

        print("chans being analyzed: %s" % self.arrays.keys())
        i = 0
        for chan, series in self.arrays.items():
            self.logger.info("analyzing %s (%s of %s)" % (chan, i, len(self.arrays.keys())))

            var = [element[0] for element in normalize_arr(np.array(vh.variation(series, B)).reshape(-1, 1))]
            print('var arr', var)
            print('var max', np.amax(var))

            mean = np.mean(var)
            std = np.sqrt(np.sum([(i - np.mean(var)) ** 2 for i in var]) / len(var))

            indices = np.where(var > mean + (threshold * std))[0]

            predicted_anomalies = [1 if i-B in indices else 0 for i in range(len(series[:]))]
            self.results[chan.replace('.csv', 'csv')] = {
                'variation_arr': var,
                'anom_array': predicted_anomalies,
                'num_anoms': predicted_anomalies.count(1)
            }

        self.logger.info("variation method complete")
        self.logger.info("--------------------------------")

        return self.results
