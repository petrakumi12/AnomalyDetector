import errno

import numpy as np
import os
import helpers.plotter as plotter
from sklearn.preprocessing import MinMaxScaler

def normalize_split_and_save_npy(subject_name, channel_name, big_df, split_start_time=514000, split_end_time=700000,
                                 save_path=os.path.join('resources'), norm_type='minmax'):
    """
    normalizes, splits, and saves dataframe to numpy
    :param subject_name: name of subject - used to save to folder with same name
    :param channel_name: name of channel - used as name by which to save .npy file
    :param big_df: dataframe to normalize and save
    :param split_start_time: time when training set starts. If there is no data at that time, will find closest
    :param split_end_time: time when training set ends. If there is no data at that time, will find closest
    :param save_path: path to save in
    :return:
    """

    #make directories if dont exist
    save_path = os.path.join(save_path, subject_name)

    try:
        # os.chdir('..')
        os.makedirs(os.path.join(os.getcwd(), save_path))
        print('dir made:', os.path.join(os.getcwd(), save_path))
        os.makedirs(os.path.join(os.getcwd(), save_path, 'train'))
        print('dir made:', os.path.join(os.getcwd(), save_path, 'train'))
        os.makedirs(os.path.join(os.getcwd(), save_path, 'test'))
        print('dir made:', os.path.join(os.getcwd(), save_path,'test'))
    except OSError as e:
        if e.errno != errno.EEXIST:
            raise

    # assign paths
    train_path = os.path.join(os.getcwd(), save_path, 'train', channel_name + '.npy')
    test_path = os.path.join(os.getcwd(), save_path, 'test', channel_name + '.npy')
    start_loc = int(big_df.index.get_loc(split_start_time, method='nearest'))
    end_loc = int(big_df.index.get_loc(split_end_time, method='nearest'))
    #create and normalize array
    npy_arr = np.array(big_df.values)
    npy_arr = normalize_arr(npy_arr) if norm_type=='minmax' else normalize_zscore(npy_arr)
    # save to path
    np.save(train_path, npy_arr[start_loc:end_loc, :])
    np.save(test_path, npy_arr)
    # plot
    plotter.plot_split(npy_arr, subject_name, channel_name, start_loc, end_loc)


def normalize_arr(input_arr):
    """
    normalized input array so all its values are between 0 and 1
    :param input_arr: array to normalize
    :return: normalized array using min-max method
    """
    # print('normalizing', input_arr)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler = scaler.fit(input_arr)
    input_arr = scaler.transform(input_arr)
    return input_arr



def normalize_zscore(input_arr):
    """
    normalize input array using z scores
    :param input_arr: array to normalize
    :return:
    """
    return (input_arr-input_arr.mean())/input_arr.std()