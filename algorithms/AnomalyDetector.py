import logging
import os
import shutil
import threading
from pathlib import Path

import boto3
import yaml

from algorithms.lstm.LSTM import LSTM
from algorithms.lstm import custom_helpers
from algorithms.telemanom.Telemanom import Telemanom
from algorithms.variation_of_variation_stdev.VariationVariationStDev import VariationVariationStDev
from algorithms.variation_percentile.VariationPercentile import VariationPercentile
from algorithms.variation_stdev.VariationStandardDeviation import VariationStandardDeviation
from helpers import db_interactions


class AnomalyDetector:
    """
    Class that controls multi-threading, anomaly detector job submissions, and how the jobs are carried through
    """

    def __init__(self):
        self.is_running = False  # whether an anomaly detection process is currently running
        self.queue = []  # will contain all submitted anomaly detection jobs that are pending
        self.anom_logger = logging.getLogger('anomalydetectorlogger')  # for logging output
        self.job_logger = logging.getLogger('joblogger')
        self.args = ""  # all arguments that will be needed to run an anomaly detection job
        self.default_algorithm_parameters = {
            'LSTM-new': {
                'display_name': 'LSTM Training',
                'params': {
                    'LSTM batch size': {
                        'config_name': 'lstm_batch_size',
                        'default': ''
                    },
                    'Dropout': {
                        'config_name': 'dropout',
                        'default': ''

                    },
                    'Number of Epochs': {
                        'config_name': 'epochs',
                        'default': ''

                    },
                    'Neurons per Layer': {
                        'config_name': 'layers',
                        'default': ''

                    },
                    'Loss Metric': {
                        'config_name': 'loss_metric',
                        'default': '',
                        'type': 'select'

                    },
                    'Optimizer': {
                        'config_name': 'optimizer',
                        'default': '',
                        'type': 'select'

                    },
                    'Minimum Loss': {
                        'config_name': 'min_delta',
                        'default': ''

                    },
                    'Patience': {
                        'config_name': 'patience',
                        'default': ''

                    },
                    'Validation Split': {
                        'config_name': 'validation_split',
                        'default': ''

                    }
                }
            },
            'LSTM-prev': {
                'display_name': 'LSTM Testing',
                'params': {
                    'l_s (number of input values to predict next output)': {
                        'config_name': 'l_s',
                        'default': ''

                    },
                    'Testing Batch Size': {
                        'config_name': 'batch_size',
                        'default': ''
                    },
                }
            },
            'Telemanom': {
                'display_name': 'Telemanom',
                'params': {
                    'Error Buffer': {
                        'config_name': 'error_buffer',
                        'default': ''

                    },
                    'Error Smoothing Percent': {
                        'config_name': 'smoothing_perc',
                        'default': ''

                    },
                    'Window Size': {
                        'config_name': 'window_size',
                        'default': ''
                    }
                }
            },
            'Variation with Percentile-based Threshold': {
                'display_name': 'Variation and Percentile',
                'params': {
                    'Variation Interval': {
                        'config_name': 'B',
                        'default': ''
                    },
                    'Percentile Threshold': {
                        'config_name': 'percentile',
                        'default': ''
                    }
                }
            },
            'Variation with Standard Deviation-based Threshold': {
                'display_name': 'Variation and Stdev Coeff',
                'params': {
                    'Variation Interval': {
                        'config_name': 'B',
                        'default': ''
                    },
                    'Threshold Coefficient': {
                        'config_name': 'threshold',
                        'default': ''
                    }
                }
            },
            'Variation of Variation with Standard Deviation-based Threshold': {
                'display_name': 'Variation of Variation',
                'params': {
                    'Variation Interval': {
                        'config_name': 'B',
                        'default': ''
                    },
                    'Variation of Variation Interval': {
                        'config_name': 'B_2',
                        'default': ''
                    },
                    'Threshold Coefficient': {
                        'config_name': 'threshold',
                        'default': ''
                    }
                }
            },
        }  # to be populated with all default params from all algorithms
        self.lock = threading.Lock()  # thread lock
        self.resources_folder = ""  # path to locally saved training and testing resources
        self.s3 = boto3.resource('s3', aws_access_key_id='AKIA6DRFAEOYPV5RRJFF',
                                 aws_secret_access_key='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')
        self.bucket = self.s3.Bucket('anomdetectmodels')

    def load_default_algorithm_params(self):
        defaults = self.default_algorithm_parameters
        # can add all params to anomaly detector to have

        with open('_config_files/config.yaml') as file:
            res_dict = yaml.load(file)
        for algorithm in defaults.keys():
            alg_params = defaults[algorithm]['params']
            for param_name, param_vals in alg_params.items():
                # print("1.", param_name, param_vals)
                defaults[algorithm]['params'][param_name]['default'] = res_dict[param_vals['config_name']]
            defaults['LSTM-new']['params']['Neurons per Layer']['default'] = res_dict['layers'][0]
        self.default_algorithm_parameters = defaults
        return defaults

    def queue_job(self, args, lock):
        """
        puts received job in queue and adds it to database
        :param args: user inputs formatted as a dictionary of arguments
        :param lock: the semaphore lock which makes sure the queue is not being altered at the same time by two different processes
        :return: the id of the queued job
        """
        self.anom_logger.info("----------Job Queued----------")
        # create a new job entry on the database with the above job id
        db_interactions.create_job(args)
        # update progress of job in db to job queued
        db_interactions.update_progress(args['_id'], args['jobs_db'], 2)

        lock.acquire()  # block all other processes from changing the queue
        self.queue.append(args)  # add the job details to queue
        lock.release()  # unblock queue

        return id

    def start_job(self, args):
        """
        Starts the process of running a job once it's dequeued by:
        - changing state of anomaly detector to running
        - initializing logger
        - initializing and running thread which initializes processing of the job
        :param args: job details
        """
        self.anom_logger.info("----------Job Left Queue and is Starting---------- %s " % (args['_id']))
        self.is_running = True  # change anomaly detector state to running
        self.anom_logger.handlers = []
        t = threading.Thread(target=self.prep_job, args=(args,))
        t.start()
        t.join()
        return

    def prep_job(self, args):
        """
        Prepares datasets for the specific jobs
        :param args: job details
        :return:
        """
        # make resources folder for temporary storage of datasets
        # make telemanom_temp_logs folder for temporary storage of logs
        self.resources_folder = os.path.join(os.getcwd(), '..', 'resources', args['_id'])
        self.resources_folder = os.path.join(os.getcwd(), '..', 'telemanom_temp_logs')

        Path(os.path.join(self.resources_folder, 'train')).mkdir(parents=True, exist_ok=True)
        Path(os.path.join(self.resources_folder, 'test')).mkdir(parents=True, exist_ok=True)
        # update db to processing user input
        db_interactions.update_progress(args['_id'], args['jobs_db'], 0)

        # first, reformat inputted datasets to make usable
        args = custom_helpers.reformat_datasets(args)
        args['jobs_db'].update_one(
            {'_id': args['_id']},
            {'$set': {'params': args['params']}}
        )

        # second, process user input based on signal type: new lstm model, prev trained model, or raw signal

        # if using lstm smoothing
        if 'LSTM' in args['signal_type']:
            self.anom_logger.info('LSTM smoothed signal')
            # adding params that will be needed in the config file for both training and testing lstms
            args = custom_helpers.add_extra_lstm_params(args)
            custom_helpers.prepare_testing_sets(args, self.resources_folder)  # prep testing sets

            if args['signal_type'] == 'LSTM-new':  # adding params that are needed if training new model
                self.anom_logger.info('Will train LSTM')
                # args = custom_helpers.add_training_lstm_params(args, self.splits)
                custom_helpers.prepare_training_sets(args, self.resources_folder)

            if args['signal_type'] == 'LSTM-prev':  # adding params that are needed if using previously trained model
                self.anom_logger.info('Will use previously trained LSTM')
                args = custom_helpers.add_testing_lstm_params(args)

            # third, make sure the parameters are the right type and dump them to the config file
            args = custom_helpers.convert_args_to_numeric(args)
            with open("_config_files/config_new.yaml", "w") as file:
                yaml.dump(args['params']['alg_params'], file)
            file.close()

            # finally, create LSTM object, run LSTM, then run the anomaly detection job
            lstm = LSTM(args, os.path.join(self.resources_folder, 'train'), os.path.join(self.resources_folder, 'test'),
                        self.anom_logger)

            self.anom_logger.info('---------------------------------')
            self.anom_logger.info('----------Starting LSTM----------')
            lstm.run()
            self.run_job(args, lstm)
        else:
            self.anom_logger.info('Raw signal')
            # if not using LSTM, then only make sure params have right types and run job
            args = custom_helpers.convert_args_to_numeric(args)
            self.run_job(args)

        return args

    def run_job(self, args, lstm=None):
        """
        Runs the anomaly detection job and saves results
        :param args:
        :param lstm:
        :return:
        """
        # initialize final json which will contain results and be saved in database
        # results_json = args['jobs_db'].find_one('_id', args['_id'])
        results = {}
        with open("_config_files/config_new.yaml", "w") as file:
            self.anom_logger.info('--------------------------------')
            self.anom_logger.info('Starting %s', args['job_type'])
            self.anom_logger.info('--------------------------------')

            signal_arrays = {}
            if lstm is not None:
                signal_arrays = lstm.y_hats
            else:
                for item in args['params']['sets']['test']:
                    signal_arrays[item['name']] = item['sig_vals']

            if bool(signal_arrays):
                if args['job_type'] == 'Telemanom':
                    results = run_telemanom(args, file, lstm)
                if args['job_type'] == 'Variation with Percentile-based Threshold':
                    var = VariationPercentile(args, signal_arrays, self.anom_logger)
                    results = var.run()
                if args['job_type'] == 'Variation with Standard Deviation-based Threshold':
                    var = VariationStandardDeviation(args, signal_arrays, self.anom_logger)
                    results = var.run()
                if args['job_type'] == 'Variation of Variation with Standard Deviation-based Threshold':
                    var = VariationVariationStDev(args, signal_arrays, self.anom_logger)
                    results = var.run()
                file.close()
                self.save_job_results(args, results, lstm)
            else:
                self.end_job(args, success=False)

    def save_job_results(self, args, results, lstm):
        if lstm is not None:
            # add lstm predictions to results
            for chan, y_hat in lstm.y_hats.items():
                results[chan.replace(".csv", "csv")]['smoothed_signal'] = list(y_hat)
            # add update database with resultse
        args['jobs_db'].update_one(
            {'_id': args['_id']},
            {'$set': {'results': results}}
        )
        self.end_job(args)

    def end_job(self, args, success=True):
        if success:
            db_interactions.update_progress(args['_id'], args['jobs_db'], 9)  # final update to job completed
        else:
            self.anom_logger.info('Job interrupted so early stopping activated')
        # close logger handlers
        handlers = self.anom_logger.handlers[:]
        for handler in handlers:
            handler.close()
            self.anom_logger.removeHandler(handler)

        # everything is done, closing connection and deleting temp folders
        # if os.path.exists(os.path.join(os.getcwd(), 'resources')):
        #     shutil.rmtree(os.path.join(os.getcwd(), 'resources'))
        #
        # if os.path.exists(os.path.join(os.getcwd(), 'telemanom_temp_logs')):
        #     shutil.rmtree(os.path.join(os.getcwd(), 'telemanom_temp_logs'))

        self.is_running = False # stop running anomaly detector


def run_telemanom(args, file, lstm):
    # add parameters specific to Telemanom
    args['params']['alg_params']['header'] = ['run_id', 'chan_id', 'num_anoms', 'anomaly_sequences',
                                              'num_total_vals']
    # save to yaml file
    yaml.dump(args['params']['alg_params'], file)
    # run lstm
    # create telemanom object and run telemanom
    telemanom = Telemanom(args['_id'], lstm.y_test, lstm.y_hats)
    res = telemanom.run(args['jobs_db'])

    return res

# def temp_fcn():
#     args = {
#         '_id': '123',
#         'job_name': '3-29-2020_22.27.47',
#         'job_desc': "",
#         'job_type': 'LSTM-new',
#         'params': {
#             'sets': {
#                 'train': [],
#                 'test': []
#             },
#             'times': {
#                 'type': 'times',
#                 'param_1': '0',
#                 'param_2': '1000'
#             },
#             'alg_params': {
#                 'batch_size': 100,
#                 'lstm_batch_size': 80,
#                 'dropout': 0.6,
#                 'epochs': 8,
#                 'layers': 85,
#                 'loss_metric': 'mse',
#                 'optimizer': 'adam',
#                 'min_delta': 0.03,
#                 'patience': 10,
#                 'validation_split': 0.4,
#                 'l_s': 200,
#                 'error_buffer': 100,
#                 'smoothing_perc': 0.04
#             }
#         }
#
#     }
#     train_arrays = {}
#     counter = 0
#     for i in range(0, 2):
#         temp = []
#         with open('C:/Users/Petra Kumi/Desktop/' + str(i) + '.csv', 'r') as file:
#             for row in file.readlines():
#                 temp.append(float(row))
#         train_arrays[counter] = {
#             'name': i,
#             'sig_vals': temp,
#             'events': [0 for i in range(len(temp))]
#         }
#         counter += 1
#     for i in range(counter):
#         print('[', i, ']: ', train_arrays[i])
#     args['params']['sets']['train'] = train_arrays
#     args['params']['sets']['test'] = train_arrays
#
#     # print(train_arrays)
#
#     ## add the channels on the dict
#     ad = AnomalyDetector()
#     AnomalyDetector.handle_lstm(ad, args, ad.logger)

## start job


# temp_fcn()
