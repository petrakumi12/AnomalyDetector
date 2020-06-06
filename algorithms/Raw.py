from algorithms.Algorithm import Algorithm
from algorithms.lstm import custom_helpers

class Raw(Algorithm):
    def __init__(self, job):
        super().__init__(job)

        if 'LSTM' not in self.cur_job.args['signal_type']:
            # self.cur_job.log('Raw signal: %s', (self.cur_job.job_id))
            # if not using LSTM, then only make sure params have right types and run job
            self.cur_job.args = custom_helpers.convert_args_to_numeric(self.cur_job.args)
            # for item in self.cur_job.args['params']['sets']['test']:
            #     self.cur_job.signal_arrays[item['name']] = item['sig_vals']
