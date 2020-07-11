import numpy as np
import os
from algorithms.lstm.Config import Config
from helpers import normalizer
from helpers.normalizer import normalize_arr


class DataPrepper():
    """
    Class that handles preparing and processing data for running with LSTMs
    """

    def load_train_data(self, path_train):
        """
        Loads training data from local directory, splitting into X and y values
        :param path_train: path of training directory
        :return: X_train, y_train
        """
        try:
            train = np.load(os.path.join(path_train, "train.npy"), allow_pickle=True)

        except:
            raise ValueError("Training data not found, on", path_train, "check train and test paths")

        X_train, y_train = self.shape_data_for_lstm(train)

        return X_train, y_train

    def load_test_data(self, chan_id, path_test):
        """
        Loads testing data from local directory, splitting into X and y values

        :param chan_id: Id of current channel
        :param path_test: path to local directory where array is stored
        :return: X_test, y_test
        """
        try:
            test = np.load(os.path.join(path_test, chan_id + ".npy"), allow_pickle=True)

        except:
            raise ValueError("Testing data not found, check train and test paths")

        # shape, split data
        X_test, y_test = self.shape_data_for_lstm(test, train=False)

        return X_test, y_test

    def shape_data_for_lstm(self, arr, train=True):
        """
        Shape raw input streams for ingestion into LSTM. config.l_s specifies the sequence length of
        prior timesteps fed into the model at each timestep t.

        :param arr: (np array): array of input streams with dimensions [timesteps, 1, input dimensions]
        :param train (bool): If shaping training data, this indicates data can be shuffled
        :return X (np array): array of inputs with dimensions [timesteps, l_s, input dimensions])
        :return y (np array): array of outputs corresponding to true values following each sequence.
        """

        config = Config("_config_files/config_new.yaml")
        print('arr shape before', np.shape(arr))

        data = []

        for i in range(len(arr) - config.l_s - config.n_predictions):
            data.append(arr[i:i + config.l_s + config.n_predictions])
        data = np.array(data)
        print('shape arr after', np.shape(data))

        assert len(data.shape) == 3

        if train == True:
            np.random.shuffle(data)

        X = data[:, :-config.n_predictions, :]
        y = data[:, -config.n_predictions:, 0]  # telemetry value is at position 0

        return X, y

    def make_training_set(self, train_arrays, start=None, end=None):
        """
        Formats training data to make ready for training of telemanom
        concatenates all channels together in one array with columns = [signal_val, event, chan_name]

        :param train_arrays: array of dictionaries containing data to be used for training
        :param start: starting point of dataset that will be used for training set
        :param end: ending point of dataset that will be used for training set
        :return: array ready for training
        """

        final_training_set = np.array([])
        for i in range(len(train_arrays)):

            if start is not None and end is not None:
                # array that will be appended with the final training set
                to_append = np.vstack([train_arrays[i]['sig_vals'], train_arrays[i]['events']])[:,
                            int(start):int(end)].T

            else:
                to_append = np.vstack([train_arrays[i]['sig_vals'], train_arrays[i]['events']]).T

            if len(final_training_set) == 0:
                final_training_set = to_append

            else:
                final_training_set = np.vstack((final_training_set, to_append))

        return final_training_set

    def reformat_datasets(self, args):
        """
        Makes None values in datasets to 0s and normalizes them to between 1 and 0
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
                            # make None to 0
                            if data_dict[keys][i] is None:
                                data_dict[keys][i] = 0
                        # normalize values between 1 and 0
                        args['params']['sets'][a_type][index][keys] = [element[0] for element in normalize_arr(
                            np.array(data_dict[keys]).reshape(-1, 1))]
        return args


    def prepare_testing_sets(self, args, resources_folder):
        """
        Prepares testing sets:
        reshapes and normalizes them to between 0 and 1, and saves them to local directory
        :param args: a dictionary containing all job info
        :param resources_folder: local path where data is to be stored
        :return:
        """
        test_sets = args['params']['sets']['test']
        for channel in test_sets:
            final_arr = np.vstack([channel['sig_vals'], channel['events']]).T # reshape
            final_arr[:, 0] = normalizer.normalize_arr(final_arr[:, 0].reshape(-1, 1))[:, 0] # normalize
            np.save(os.path.join(resources_folder, 'test', str(channel['name']) + '.npy'), final_arr,
                    allow_pickle=True) # save

    def add_training_lstm_params(self, args, splits):
        """
        Adds to args dictionary parameters that are necessary for training LSTM
        :param args: dictionary with all params necessary for running job
        :param splits: the first and last datapoint to get subset for training
        :return: the updated args param
        """

        # make training = True
        args['params']['alg_params']['train'] = True

        # reformat layers in way that keras will understand
        layers = args['params']['alg_params']['layers']
        args['params']['alg_params']['layers'] = [int(layers), int(layers)]

        # take as much of the training set as user asks for
        # check if user wants to do predetermined splits or not
        if args['params']['times']['type'] != 'times':
            the_split = splits[args['params']['times']['param_1']][args['params']['times']['param_2']]
            args['params']['times']['param_1'] = the_split[0]
            args['params']['times']['param_2'] = the_split[1]

        return args

    def add_extra_lstm_params(self, args):
        """
        Adds to args parameter parameters that are necessary for running LSTM
        :param args: a dictionary containing all parameters necessary for running job
        :return: the updated args param
        """
        args['params']['alg_params']['predict'] = True  # lstm model will be used to predict
        args['params']['alg_params']['n_predictions'] = 1  # how many outputs the model will generate for one input
        args['params']['alg_params']['p'] = 0.0 # patience parameter will default to 0 because we are not using it
        return args

    def prepare_training_sets(self, args, resources_folder):
        """
        Reformats data to be ready for training, then nromalizes and saves to local directory as .npy file
        :param args: dictionary with all parameters necessary to run job
        :param resources_folder: local path where training set will be saved as npy file
        :return:
        """
        # format training set
        training_set = self.make_training_set(args['params']['sets']['train'],
                                         args['params']['times']['param_1'],
                                         args['params']['times']['param_2'])

        training_set[:, 0] = normalizer.normalize_arr(training_set[:, 0].reshape(-1, 1))[:, 0] # normalize
        np.save(os.path.join(resources_folder, 'train', 'train.npy'), training_set, allow_pickle=True) # save

    def add_testing_lstm_params(self, args):
        """
        Adds parameters to args dictionary that are necessary for running the prediction part of LSTM
        :param args: dictionary with parameters necessary for running anomaly detection job
        :return: the updated args param
        """
        args['params']['alg_params']['train'] = False  # will not be training
        args['params']['alg_params']['use_id'] = args['prev_model_id']  # will use previously trained model with this id

        return args

    def convert_args_to_numeric(self, args):
        """
        Converts numbers represented as Strings in the args dictionary to floats or ints
        :param args: the dictionary containing all parameters that are necessary for running anomaly detection job
        :return:
        """
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

