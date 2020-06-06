class Algorithm():
    """
    Class that controls multi-threading, anomaly detector job submissions, and how the jobs are carried through
    """
    def __init__(self, job):
        self.cur_job = job

