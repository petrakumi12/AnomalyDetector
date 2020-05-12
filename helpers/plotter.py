import matplotlib.pyplot as plt
import numpy as np


def plot_split(npy_arr, subject_name, channel_name, start_loc, end_loc):
    # TODO: comment this file
    plt.plot(npy_arr[:, 0])
    plt.title("train split for " + subject_name + channel_name)
    plt.legend(["sig_val", "false_ans", "non_target", "true_ans", "pre_target", "3", "corr_targ", "incorr_targ"], loc=1)
    plt.axvspan(start_loc, end_loc, color='grey', alpha=0.5)
    plt.show()


def plot_real_pred_signal(y_test, y_hat, chan_id, path_train):
    # real vs pred plot
    plt.plot(y_test, color='blue', label='actual values', linewidth=1)
    plt.plot(y_hat, color='red', label='predicted values', linewidth=1)

    plt.title('actual vs pred vals ' + chan_id + ' ' + path_train.split('temp')[1])
    plt.xlabel('time in ms')
    plt.ylabel('signal_normalized')
    plt.show()


def plot_telemanom_anomalies(y_test, y_hat, anom, path_train):
    # real vs pred plot
    plt.plot(y_test, color='blue', label='actual values', linewidth=1)
    plt.plot(y_hat, color='red', label='predicted values', linewidth=1)

    for start, end in anom['anomaly_sequences']:
        plt.axvspan(start, end, color='grey', alpha=0.5)
    plt.title('actual vs pred vals ' + anom['chan_id'] + ' ' + path_train.split('temp')[1])
    plt.xlabel('time in ms')
    plt.ylabel('signal_normalized')
    plt.show()
