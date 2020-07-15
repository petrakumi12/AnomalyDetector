import numpy as np
from algorithms.Algorithm import Algorithm

class Variation(Algorithm):
    """
    Superclass for all variation-based anomaly detection methods
    """
    def __init__(self, job):
        super().__init__(job)

    def variation(self, signal_array, B):
        """
        Runs variation algorithm to generate an array of variation of the original signal. See paper report for details.
        :param signal_array: array of raw or lstm-smoothed signal values
        :param B: interval needed to calculate variation
        :return: Array of length len(signal_array)-B
        """
        new_arr = list()
        for k in range(len(signal_array) - B):
            arr = [abs(signal_array[i + 1] - signal_array[i]) for i in range(k, k + B - 1)]
            thesum = np.sum(arr)
            new_arr.append(thesum)
        return new_arr

