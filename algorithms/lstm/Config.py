#!/usr/bin/env python

# coding: utf-8

import yaml
import os


class Config:
    """
    Loads parameters from config_new.yaml the config object
    """

    def __init__(self, path_to_config):

        if os.path.isfile(path_to_config):
            pass
        else:
            path_to_config = '../%s' % path_to_config

        setattr(self, "path_to_config", path_to_config)

        dictionary = None

        with open(path_to_config, "r") as f:
            dictionary = yaml.safe_load(f.read())

        try:
            for k, v in dictionary.items():
                setattr(self, k, v)
        except:
            for k, v in dictionary.iteritems():
                setattr(self, k, v)
