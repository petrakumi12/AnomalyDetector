import threading
import boto3
import yaml
from Job import Job

class AnomalyDetector:
    """
    Class that controls threads and queueing of jobs
    """

    def __init__(self):
        self.jobs_queue = []  # will contain all submitted anomaly detection jobs that are pending
        self.is_running = False
        self.lock = threading.Lock()  # thread lock
        self.s3 = boto3.resource('s3', aws_access_key_id='AKIA6DRFAEOYPV5RRJFF',
                                 aws_secret_access_key='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')
        self.bucket = self.s3.Bucket('anomdetectmodels')

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
        self.load_default_algorithm_params()


    def load_default_algorithm_params(self):
        """
        Sets all default parameters of the algorithms as variables in the
        default_algorithm_parameters variable of the AnomalyDetector object
        :return: the dictionary with all default parameters for each job
        """
        defaults = self.default_algorithm_parameters

        with open('_config_files/config.yaml') as file:
            res_dict = yaml.load(file)
        for algorithm in defaults.keys():
            alg_params = defaults[algorithm]['params']
            for param_name, param_vals in alg_params.items():
                defaults[algorithm]['params'][param_name]['default'] = res_dict[param_vals['config_name']]
            defaults['LSTM-new']['params']['Neurons per Layer']['default'] = res_dict['layers'][0]
        self.default_algorithm_parameters = defaults
        return defaults

    def start_thread(self):
        """
        Start anomaly detector threads
        :return: None
        """
        while True:
            if len(self.jobs_queue) != 0:
                if not self.is_running:
                    self.lock.acquire()
                    job = self.jobs_queue.pop(0)
                    print('AnomalyDetector Started')
                    self.lock.release()
                    self.dequeue_job(job)

    def queue_job(self, args, lock):
        """
        Puts received job in queue and adds it to database
        :param args: user inputs formatted as a dictionary of arguments
        :param lock: the semaphore lock which makes sure the queue is not being altered
        at the same time by two different processes
        :return: the id of the queued job
        """
        print("Queued: %s" % (args['_id']))
        job = Job(args)
        job.update_progress(2)  # update progress of job in db to job queued
        lock.acquire()  # block all other processes from changing the queue
        self.jobs_queue.append(job)  # add the job details to queue
        lock.release()  # unblock queue

    def dequeue_job(self, job):
        """
        Starts the process of running a job once it's dequeued by:
        - changing state of anomaly detector to running
        - initializing logger
        - initializing and running thread which initializes processing of the job
        """
        print("Dequeued: %s" % job.job_id)
        self.is_running = True  # change anomaly detector state to running
        t = threading.Thread(target=job.run, args=(self,))
        t.start()
        t.join()


