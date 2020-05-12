import os

import numpy as np

from helpers import normalizer
from helpers.normalizer import normalize_arr

encoded_vals = {}


# # import trials.calc_accuracy as acc
#
#
# def create_acc_log_csv(path):
#     with open(os.path.join(path, _id + '_acc_log.csv'), 'w+') as csvfile:
#         writer = csv.writer(csvfile, delimiter=',')
#         writer.writerow(
#             ['train_size', 'train_cat', 'anom_cat', 'chan', 'TP', 'FP', 'TN', 'FN', 'prec', 'recall', 'stdev_anom_no',
#              'stdev_anom_interval_no', 'stdev_anom_times', 'stdev_time', 'lstm_anom_no', 'lstm_anom_interval_no',
#              'lstm_anom_times', 'lstm_time'])
#     csvfile.close()
#
#
#
# def get_model_acc(config, _id, path_test, anom, elapsed_time,):
#     # petra added this
#     categories = path_test.split('temp')[1]
#     categories = categories.split('/')[0]
#     train_cat = categories.split('_')[0]
#     train_cat = train_cat.replace('\\', '')
#     acc_cat = categories.split('_')[1]
#     acc_cat = acc_cat.replace('\\test', '')
#     res_path = os.path.join(os.getcwd(), 'temp')
#     acc.get_acc_vals(res_path, path_test, anom['anomaly_sequences'], config.l_s, _id, train_cat, acc_cat,
#                      anom['chan_id'], elapsed_time)


def make_training_set(train_arrays, start=None, end=None):
    """
    formats training data to make ready for training of telemanom
    concatenates all channels together in one array with columns = [signal_val, event, chan_name]
    :param train_arrays: array of dictionaries containing data to be used for training
    :return: array ready for training
    """
    # print('start end', start, end)

    final_training_set = np.array([])
    for i in range(len(train_arrays)):
        # print('train arrays i' , train_arrays)

        # name of file / array
        name = train_arrays[i]['name']
        # make into array of names to append
        # train_arrays[i]['name'] = [name for j in range(len(train_arrays[i]['sig_vals']))]

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


def encode_categories(input_array):
    # find the column with strings
    col = len(input_array[0, :]) - 1

    uniques = list(set(input_array[:, col]))  # get all unique entries in the column as a list

    for unique in uniques:

        unique = unique.replace('.csv', 'csv')
        if unique not in encoded_vals.keys():
            encoded_vals[unique] = len(encoded_vals.keys()) + 2
    for row in range(len(input_array[:, col])):
        input_array[row, col] = encoded_vals[input_array[row, col].replace('.csv', 'csv')]

    # input_array[row, col] = input_array[row,col].replace(".csv","")
    # input_array[row, col] = input_array[row, col].encode("utf-8")
    # input_array[row, col] = int.from_bytes(input_array[row, col], byteorder="big")

    # input_array[:,col] = to_categorical(train[:,col])
    # print('here 5')
    input_array = input_array.astype(np.float)
    # print('first 5 results', input_array[:5, :])

    # print('result: ', input_array)
    # print('dict', encoded_vals)
    # print('converted to categorical')
    return input_array.astype(np.float)


def reformat_datasets(args):
    """
    TODO
    :param args:
    :return:
    """
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
        names_arr = [channel['name'] for j in range(len(channel['sig_vals']))]

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

# def decode_categories(input_array):
#     print('decoding categories')
#     print(encoded_vals)
#     input_array = input_array.astype(np.str)
#     print(input_array)
#     # we know the last column in the array is the one that needs to be decoded
#     col = len(input_array[0, :]) - 1
#
#     for row in range(len(input_array[:, 0])):
#         for key, val in encoded_vals.items():  # for name, age in dictionary.iteritems():  (for Python 2.x)
#             if int(input_array[row, col].split(".")[0]) == val:
#                 input_array[row, col] = key
#         # print('here',int(input_array[row,col]).to_bytes(((int(input_array[row,col]).bit_length() + 7) // 8), byteorder="big").decode("utf-8"))
#         # input_array[row,col] = int(input_array[row,col]).to_bytes(((int(input_array[row,col]).bit_length() + 7) // 8), byteorder="big").decode("utf-8")
#
#     print('final array', input_array)
#     return input_array


# A = np.array([[1, 2, 'chan2csv'], [3, 4, 'chan3csv']])
# print(A)

# A = encode_categories(A)
# print(A)

#
# for col in range(len(input_array[0, :])):
#     new_arr = []
#     # print('checking', input_array[:, col])
#     # print('checking in ', list(encoded_vals.values()))
#
#
#
#     if np.any(np.in1d(list(set(input_array[:, col])), list(encoded_vals.values()))):
#         # print('match found')
#         for row in range(len(input_array[:, col])):
#             for key, value in encoded_vals.items():
#                 if value == input_array[row, col]:
#                     if 'csv' in key: key = key.replace('csv', '.csv')
#                     new_arr.append(key)
#
#     if len(new_arr) == len(input_array[:, 0]):
#         input_array = input_array.astype(np.str)
#         input_array[:, col] = new_arr


# a = np.array([[1, 'petra.csv', 1], [2, 'hi', 2], [3, 'petra.csv', 3]])
# # # print(a)
# encode_categories(a)
# # make_training_set(None)
