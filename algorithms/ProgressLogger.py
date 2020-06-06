import logging


class ProgressLogger():
    """
    Class that handles running LSTM jobs
    """
    def __init__(self):
        self.logger = logging.getLogger('logger')

    def log(self, _id=None):
        if _id is None:
            # log from outside a job
            pass
        else:
            # log from inside a job
            pass

        pass


