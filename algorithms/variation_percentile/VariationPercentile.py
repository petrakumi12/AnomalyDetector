import numpy as np

from helpers.normalizer import normalize_arr
import algorithms.variation_percentile.variation_helpers as vh


class VariationPercentile:
    """
    Class that handles running the method of Variation with Percentile-based Threshold
    """

    def __init__(self, args, arrays, logger):
        self.args = args
        self.arrays = arrays
        self.logger = logger
        self.results = {}

    def run(self):
        B = self.args['params']['alg_params']['B']
        percentile = self.args['params']['alg_params']['percentile']

        print("chans being analyzed: %s" % [item for item in self.arrays.keys()])
        i = 0
        for chan, series in self.arrays.items():
            self.logger.info("analyzing %s (%s of %s)" % (chan, i, len(self.arrays.keys())))

            var = [element[0] for element in normalize_arr(np.array(vh.variation(series, B)).reshape(-1, 1))]
            indices = np.where(var > np.percentile(var, [percentile]))[0]

            predicted_anomalies = [1 if i - B in indices else 0 for i in range(len(series[:]))]
            # print('lengths: series, var, anoms', len(series), len(var), len(predicted_anomalies))
            self.results[chan.replace('.csv', 'csv')] = {
                'variation_arr': var,
                'anom_array': predicted_anomalies,
                'num_anoms': predicted_anomalies.count(1)
            }
            i += 1

        self.logger.info("variation method complete")
        self.logger.info("--------------------------------")

        return self.results
