from algorithms.Algorithm import Algorithm
from algorithms.lstm.DataPrepper import DataPrepper

class Raw(Algorithm):
    """
    Class responsible for processing raw signal
    """
    def __init__(self, job):
        super().__init__(job)

        if 'LSTM' not in self.cur_job.args['signal_type']:
            # if not using LSTM, then only make sure params have right types and run job
            self.cur_job.args = DataPrepper().convert_args_to_numeric(self.cur_job.args)