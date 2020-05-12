import collections
import csv

from helpers import db_interactions
import algorithms.lstm.errors as err
from algorithms.lstm._globals import Config
import numpy as np


class Telemanom:
    """
    Class that handles running the Telemanom algorithm
    """

    def __init__(self, _id, y_test, y_hats):
        self._id = _id
        self.y_test = y_test
        self.y_hats = y_hats
        self.results = {}

    def run(self, job_db):
        config = Config("_config_files/config_new.yaml")

        with open("results/%s.csv" % self._id, "a") as out:
            writer = csv.DictWriter(out, config.header)  # line by line results written to csv
            writer.writeheader()

            for chan, y_hat in self.y_hats.items():

                # Error processing
                db_interactions.update_progress(self._id, job_db, 8)  # calculating anomalies

                e_s = err.get_errors(self.y_test, y_hat, chan, self._id, smoothed=True)
                E_seq, E_seq_scores = err.process_errors(self.y_test, e_s)

                errors = np.zeros(len(y_hat))
                for interval in E_seq:
                    for i in range(interval[0], interval[1]):
                        errors[i] = 1
                errors = list(errors)

                # Writing to csv
                anom = {
                    'run_id': self._id,
                    'chan_id': chan,
                    'anomaly_sequences': E_seq,
                    'num_anoms': len(E_seq),
                    'num_total_vals': self.y_test.shape[0]
                }

                writer.writerow(anom)

                # Saving results
                self.results[chan.replace('.csv', 'csv')] = {
                    'anom_array': errors,
                    'num_anoms': collections.Counter(errors)[1]
                }

        out.close()
        return self.results
