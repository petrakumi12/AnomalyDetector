import os

import numpy as np

from helpers import normalizer
from helpers.normalizer import normalize_arr

encoded_vals = {}

def make_training_set(train_arrays, start=None, end=None):
    """
    Formats training data to make ready for training of telemanom
    concatenates all channels together in one array with columns = [signal_val, event, chan_name]
    :param train_arrays: array of dictionaries containing data to be used for training
    :param start:
    :param end:
    :return: array ready for training
    """

    final_training_set = np.array([])
    for i in range(len(train_arrays)):
        # print('train arrays i' , train_arrays)

        if start is not None and end is not None:
            # print('shapes are', np.shape(train_arrays[i]['sig_vals']), np.shape(train_arrays[i]['events']),
            #       np.shape(train_arrays[i]['name']))

            # array that will be appended with the final training set
            to_append = np.vstack([train_arrays[i]['sig_vals'], train_arrays[i]['events']])[:, int(start):int(end)].T
            # print('to append is ', to_append, 'with shape', np.shape(to_append))
        else:
            to_append = np.vstack([train_arrays[i]['sig_vals'], train_arrays[i]['events']]).T

        if len(final_training_set) == 0:
            final_training_set = to_append
        else:
            final_training_set = np.vstack((final_training_set, to_append))

    return final_training_set


def reformat_datasets(args):
    # making None elements into 0s
    print('args are', args)
    for a_type in ['train', 'test']:
        for index, data_dict in enumerate(args['params']['sets'][a_type]):
            if data_dict is not None:
                for keys in ['sig_vals', 'events']:
                    for i in range(len(data_dict[keys])):
                        if data_dict[keys][i] is None:
                            data_dict[keys][i] = 0
                    args['params']['sets'][a_type][index][keys] = [element[0] for element in normalize_arr(
                        np.array(data_dict[keys]).reshape(-1, 1))]
    return args


def add_extra_lstm_params(args):
    args['params']['alg_params']['predict'] = True  # lstm model will be used to predict
    args['params']['alg_params']['n_predictions'] = 1  # how many outputs the model will generate for one input
    args['params']['alg_params']['p'] = 0.0
    return args


def prepare_testing_sets(args, resources_folder):
    test_sets = args['params']['sets']['test']
    for channel in test_sets:
        final_arr = np.vstack([channel['sig_vals'], channel['events']]).T
        # print('final arr is', final_arr, 'with shape', np.shape(final_arr))
        final_arr[:, 0] = normalizer.normalize_arr(final_arr[:, 0].reshape(-1, 1))[:, 0]
        # print('final arr', final_arr)
        np.save(os.path.join(resources_folder, 'test', str(channel['name']) + '.npy'), final_arr,
                allow_pickle=True)


def add_training_lstm_params(args, splits):
    args['params']['alg_params']['train'] = True
    # reformat layers in way that keras will understand
    layers = args['params']['alg_params']['layers']
    args['params']['alg_params']['layers'] = [int(layers), int(layers)]

    # take as much of the training set as user asks for
    # check if user wants to do predetermined splits or not
    # print('times are predetermined or custom?', args['params']['times']['type'])
    if args['params']['times']['type'] != 'times':
        the_split = splits[args['params']['times']['param_1']][args['params']['times']['param_2']]
        args['params']['times']['param_1'] = the_split[0]
        args['params']['times']['param_2'] = the_split[1]
    return args


def prepare_training_sets(args, resources_folder):
    # format training set
    training_set = make_training_set(args['params']['sets']['train'],
                                     args['params']['times']['param_1'],
                                     args['params']['times']['param_2'])

    # normalize and save save to npy file
    training_set[:, 0] = normalizer.normalize_arr(training_set[:, 0].reshape(-1, 1))[:, 0]
    np.save(os.path.join(resources_folder, 'train', 'train.npy'), training_set, allow_pickle=True)


def add_testing_lstm_params(args):
    args['params']['alg_params']['train'] = False  # will not be training
    args['params']['alg_params']['use_id'] = args['prev_model_id']  # will instead be using a model saved with this id
    return args


def convert_args_to_numeric(args):
    for keys, vals in args['params']['alg_params'].items():
        if vals is not True and vals is not False and type(vals) == str:
            try:
                args['params']['alg_params'][keys] = int(vals)
            except:
                try:
                    args['params']['alg_params'][keys] = float(vals)
                except:
                    pass
    return args

