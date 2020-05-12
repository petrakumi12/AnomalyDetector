import ntpath
from pathlib import Path
import numpy as np


def load_data_from_csv(args):
    # will get signal value and events from all submitted csvs
    # args['params']['train'], args['params']['test'] - load each csv from each path
    # and add to a new dict {name, sig_vals, events} as string, list, list
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
                    # print('csv shape', len(np.shape(csv_content)))

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

        # print('events?', csv_content[:, 1])
        args['params']['sets'][a_type] = res_dict[a_type]

        # print('train signal shape', np.shape(args['params']['sets']['train'][0]['sig_vals']))
        # print('train events shape', np.shape(args['params']['sets']['train'][0]['events']))
        # print('test signal shape', np.shape(args['params']['sets']['train'][0]['sig_vals']))
        # print('test events shape', np.shape(args['params']['sets']['train'][0]['events']))

    return args


# load_data_from_csv(args)


def add_default_parameters(req, anomalydetector):
    # check if lstm
    # if yes, then loop through all e = defaults['LSTM-new']['params'].values()
    # and add to req['alg_'params'][e['config_name']] = e['default']

    defaults = anomalydetector.default_algorithm_parameters
    # signal type params
    if 'LSTM' in req['signal_type']:
        # lstm prev
        for lstm_prev_param in defaults['LSTM-prev']['params'].values():
            req['params']['alg_params']['train'] = False

            if req['params']['alg_params'].get(lstm_prev_param['config_name'], None) is None:
                req['params']['alg_params'][lstm_prev_param['config_name']] = lstm_prev_param['default']

        if req['signal_type'] == 'LSTM-new':
            req['params']['alg_params']['train'] = True
            for lstm_new_param in defaults['LSTM-new']['params'].values():
                if req['params']['alg_params'].get(lstm_new_param['config_name'], None) is None:
                    req['params']['alg_params'][lstm_new_param['config_name']] = lstm_new_param['default']

        layer_no = req['params']['alg_params']['layers']
        req['params']['alg_params']['layers'] = [int(layer_no), int(layer_no)]

    # algorithm type params
    for params in defaults[req['job_type']]['params'].values():
        # print('params are ', params)
        if req['params']['alg_params'].get(params['config_name'], None) is None:
            # print('changing param ', params['config_name'])
            req['params']['alg_params'][params['config_name']] = params['default']

    return req
