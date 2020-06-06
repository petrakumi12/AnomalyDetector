import numpy as np
from algorithms.Algorithm import Algorithm

class Variation(Algorithm):
    """
    Superclass for all variation-based anomaly detection methods
    """
    def __init__(self, job):
        super().__init__(job)

    def variation(self, a, B):
        new_arr = list()
        for k in range(len(a) - B):
            arr = [abs(a[i + 1] - a[i]) for i in range(k, k + B - 1)]
            thesum = np.sum(arr)
            new_arr.append(thesum)
        return new_arr

