import ntpath
from pathlib import Path
import numpy as np


def load_data_from_csv(args):
    """
    Gets signal value and events from all submitted csvs
    and adds info to a dictionary with structure {name: String, sig_vals: Array(Float), events: Array(Integer)}
    :param args: job parameters
    :return: updated job parameters
    """

    train_test_arr = ['train', 'test']
    res_dict = {
        'train': [],
        'test': []
    }
    for a_type in train_test_arr:
        if args['params']['sets'].get(a_type, None) is not None:
            for a_path_str in args['params']['sets'][a_type]:

                a_dict = {}
                try:
                    a_path = Path(a_path_str)
                    head, tail = ntpath.split(a_path)
                    if tail is None:
                        a_dict['name'] = ntpath.basename(head)
                    else:
                        a_dict['name'] = tail

                    csv_content = np.genfromtxt(a_path, delimiter=',')

                    if len(np.shape(csv_content)) == 1:  # means no events in csv, just sig val
                        a_dict['sig_vals'] = list(csv_content[:, ])
                        a_dict['events'] = [None for i in range(len(csv_content[:, ]))]
                    else:
                        a_dict['sig_vals'] = list(csv_content[:, 0])
                        a_dict['events'] = list(csv_content[:, 1])

                    res_dict[a_type].append(a_dict)
                    print("Request made from API")

                except:
                    print('Request not made from API')
                    return args
        else:
            print(a_type, "does not exist in args['params']['sets']")

        args['params']['sets'][a_type] = res_dict[a_type]

    return args



def add_default_parameters(args, anomalydetector):
    """
    Adds to args parameter the default algorithm parameters
    :param args: parameters needed to run a job
    :param anomalydetector: AnomalyDetector object
    :return: updated args parameter
    """

    defaults = anomalydetector.default_algorithm_parameters

    # signal type params
    if 'LSTM' in args['signal_type']:
        # lstm prev
        for lstm_prev_param in defaults['LSTM-prev']['params'].values():
            args['params']['alg_params']['train'] = False

            if args['params']['alg_params'].get(lstm_prev_param['config_name'], None) is None:
                args['params']['alg_params'][lstm_prev_param['config_name']] = lstm_prev_param['default']
        # lstm new
        if args['signal_type'] == 'LSTM-new':
            args['params']['alg_params']['train'] = True
            for lstm_new_param in defaults['LSTM-new']['params'].values():
                if args['params']['alg_params'].get(lstm_new_param['config_name'], None) is None:
                    args['params']['alg_params'][lstm_new_param['config_name']] = lstm_new_param['default']

            layer_no = args['params']['alg_params']['layers']
            args['params']['alg_params']['layers'] = [int(layer_no), int(layer_no)]

    # algorithm type params
    for params in defaults[args['job_type']]['params'].values():
        # print('params are ', params)
        if args['params']['alg_params'].get(params['config_name'], None) is None:
            # print('changing param ', params['config_name'])
            args['params']['alg_params'][params['config_name']] = params['default']

    return args
