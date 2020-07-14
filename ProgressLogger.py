import logging


class ProgressLogger():
    """
    Class that handles logging of job progress
    """
    def __init__(self):
        self.logger = logging.getLogger('logger')

    def log(self, message, job_id=None):
        if job_id is None:
            # log from outside a job
            self.logger.info(message)
            pass
        else:
            # log from inside a job
            self.logger.info("(%s) %s", (job_id, message))
            pass

        pass


