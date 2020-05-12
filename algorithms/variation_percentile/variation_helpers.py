import numpy as np


def variation(a, B):
    new_arr = list()
    for k in range(len(a) - B):
        arr = [abs(a[i + 1] - a[i]) for i in range(k, k + B - 1)]
        thesum = np.sum(arr)
        new_arr.append(thesum)
    return new_arr
