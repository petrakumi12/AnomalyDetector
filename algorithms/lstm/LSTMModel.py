from keras.models import Sequential, load_model
from keras.callbacks import History, EarlyStopping
from keras.layers.recurrent import LSTM
from keras.layers.core import Dense, Activation, Dropout
import matplotlib.pyplot as plt
import numpy as np
import os
import io
import helpers.plotter as plotter
import boto3, re

from algorithms.lstm.Config import Config

# config
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # suppress tensorflow CPU speedup warnings


class LSTMModel:
    """
    Class that handles generating, changing, and saving LSTM Models
    """

    def generate_train_model(self, X_train, y_train):
        print('generating train model')
        print('train shape', X_train.shape)
        config = Config("_config_files/config_new.yaml")
        print('layers shape', config.layers)

        cbs = [History(), EarlyStopping(monitor='val_loss', patience=config.patience,
                                        min_delta=config.min_delta, verbose=0)]

        model = Sequential()

        model.add(LSTM(
            config.layers[0],
            input_shape=(None, X_train.shape[2]),
            return_sequences=True))
        model.add(Dropout(config.dropout))

        model.add(LSTM(
            config.layers[1],
            return_sequences=False))
        model.add(Dropout(config.dropout))

        model.add(Dense(
            config.n_predictions))
        model.add(Activation("linear"))

        model.compile(loss=config.loss_metric, optimizer=config.optimizer)

        history = model.fit(X_train, y_train, batch_size=config.lstm_batch_size,
                            epochs=config.epochs, validation_split=config.validation_split,
                            callbacks=cbs, verbose=True)

        # loss plot
        plt.plot(history.history['loss'])
        plt.plot(history.history['val_loss'])
        plt.title('model loss')
        plt.ylabel('loss')
        plt.xlabel('epoch')
        plt.legend(['train', 'val'], loc='upper left')
        plt.show()

        return model

    def load_train_model(self, lstm):
        """
        Loads previously traned LSTM model
        :param lstm: the LSTM class object
        :return: loaded model
        """
        self.download_h5(lstm)
        return load_model(os.path.join("temp_logs", lstm.config.job_id, "models", lstm.config.use_id + ".h5"))

    def get_model(self, anom, X_train, y_train, logger, train=False):
        """Train LSTM model according to specifications in config_new.yaml or load pre-trained model.

        :param anom (dict): contains all anomaly information for a given input stream
        :param X_train (np array): numpy array of training inputs with dimensions [timesteps, l_s, input dimensions)
        :param y_train (np array): numpy array of training outputs corresponding to true values following each sequence
        :param logger (obj): logging object
        :param train (bool): If False, will attempt to load existing model from repo
        :return model (obj): Trained Keras LSTM model
        """

        config = Config("_config_files/config_new.yaml")

        if not train and os.path.exists(os.path.join("data", config.use_id, "models", anom["chan_id"] + ".h5")):
            logger.info("Loading pre-trained model")
            return load_model(os.path.join("data", config.use_id, "models", anom["chan_id"] + ".h5"))

        elif train or (not train and not os.path.exists(
                os.path.join("data", config.use_id, "models", anom["chan_id"] + ".h5"))):
            if not train:
                logger.info("Training new model from scratch.")

            cbs = [History(), EarlyStopping(monitor='val_loss', patience=config.patience,
                                            min_delta=config.min_delta, verbose=0)]

            model = Sequential()

            model.add(LSTM(
                config.layers[0],
                input_shape=(None, X_train.shape[2]),
                return_sequences=True))
            model.add(Dropout(config.dropout))

            model.add(LSTM(
                config.layers[1],
                return_sequences=False))
            model.add(Dropout(config.dropout))

            model.add(Dense(
                config.n_predictions))
            model.add(Activation("linear"))

            model.compile(loss=config.loss_metric, optimizer=config.optimizer)

            history = model.fit(X_train, y_train, batch_size=config.lstm_batch_size,
                                epochs=config.epochs, validation_split=config.validation_split,
                                callbacks=cbs, verbose=True)

            plotter.plot_loss(history, anom)

            model.save(os.path.join("temp_logs", anom['run_id'], "models", anom["chan_id"] + ".h5"))

            return model

    def upload_h5(self, model, lstm):
        """
        Uploads lSTM model as .h5 file to AWS db
        :param model: the generated lstm model
        :param lstm: the lstm object
        :return:
        """
        model_data = io.BytesIO()
        model.save(model_data)
        model_data.seek(0)
        lstm.bucket.put_object(Body=model_data, ContentType='application/x-hdf5', Key=lstm.config.job_id + '.h5')

    def download_h5(self, lstm):
        """
        Downloads h5 file with given id where LSTM model of same id is saved
        :param lstm: the LSTM object
        :return:
        """
        path = os.path.join("temp_logs", lstm.config.job_id, "models", lstm.config.use_id + ".h5")
        lstm.bucket.download_file(lstm.config.use_id + '.h5', path)

    def predict_in_batches(self, y_test, X_test, model, chan_id, run_id):
        """
        Used trained LSTM model to predict test data arriving in batches
        :param y_test (np array): numpy array of test outputs corresponding to true values to be predicted at end of each sequence
        :param X_test (np array): numpy array of test inputs with dimensions [timesteps, l_s, input dimensions)
        :param model (obj): trained Keras model
        :param anom (dict): contains all anomaly information for a given input stream
        :return y_hat (np array): predicted test values for each timestep in y_test
        """
        config = Config("_config_files/config_new.yaml")

        y_hat = np.array([])
        num_batches = int((y_test.shape[0] - config.l_s) / config.batch_size)
        if num_batches < 0:
            raise ValueError("l_s (%s) too large for stream with length %s." % (config.l_s, y_test.shape[0]))

        # simulate data arriving in batches
        for i in range(1, num_batches + 2):
            prior_idx = (i - 1) * config.batch_size
            idx = i * config.batch_size
            if i == num_batches + 1:
                idx = y_test.shape[0]  # remaining values won't necessarily equal batch size

            X_test_period = X_test[prior_idx:idx]

            y_hat_period = model.predict(X_test_period)

            # map predictions n steps ahead to their corresponding timestep
            final_y_hat = []
            for t in range(len(y_hat_period) + config.n_predictions):
                y_hat_t = []
                for j in range(config.n_predictions):
                    if t - j >= 0 and t - j < len(y_hat_period):
                        y_hat_t.append(y_hat_period[t - j][j])
                if t < len(y_hat_period):
                    if y_hat_t.count(0) == len(y_hat_t):
                        final_y_hat.append(0)
                    else:
                        final_y_hat.append(y_hat_t[0])  # first prediction

            y_hat_period = np.array(final_y_hat).reshape(len(final_y_hat), 1)
            y_hat = np.append(y_hat, y_hat_period)

        y_hat = np.reshape(y_hat, (y_hat.size,))

        np.save(os.path.join("temp_logs", run_id, "y_hat", chan_id + ".npy"), np.array(y_hat))

        return y_hat
