import psycopg2 as psycopg2
import numpy as np
import _access_keys as ak


def connect_db():
    """
    Opens a connection to Postgres db
    :return: connection object and cursor
    """
    connection = psycopg2.connect(user=ak.postgres_user,
                                  password=ak.postgres_pass,
                                  host=ak.postgres_host,
                                  port=ak.postgres_port,
                                  database=ak.postgres_database)
    cursor = connection.cursor()
    return connection, cursor


def disconnect_db(connection, cursor):
    """
    Closes the connection to Postgres db
    :param connection: connection object to db
    :param cursor: pointer to db
    :return:
    """
    if connection:
        cursor.close()
        connection.close()
        print("PostgreSQL connection is closed")


def get_sig_val_as_arr(cursor, subject_name, chan_name):
    """
    Takes a subject name and channel as input
    outputs numpy array of time and value params
    :param subject_name: name of subject eg P103-R-RL
    :param chan_name: name of channel eg A-DC1
    :param cursor: cursor for pointing at db
    :return: processed_arr: numpy arr with 2 columns, first one time, second value
    """
    time_val = []
    try:
        # selecting items from db
        select_time_and_val = "SELECT time_ms, value  " \
                              "FROM raw_data " \
                              "WHERE fk_subject = %s AND fk_channel IN" \
                              "(SELECT pk_channel_id " \
                              "FROM raw_data_channel " \
                              "WHERE channel_name = %s)" \
                              "Order by time_ms"

        cursor.execute(select_time_and_val, (subject_name, chan_name))
        time_signal_arr = cursor.fetchall()

    except (Exception, psycopg2.Error) as error:
        print("Error while fetching data from PostgreSQL:", error)

    time_signal_arr = np.array(time_signal_arr)
    print(np.shape(time_signal_arr))

    # handling duplicate rows
    prev_row = None
    processed_arr = []
    for i in range(len(time_signal_arr[:, 0])):
        if prev_row != time_signal_arr[i, 0]:
            processed_arr.append(time_signal_arr[i])
        else:
            print('repeated val in subject', subject_name, 'idx', i, 'time', time_signal_arr[i])
        prev_row = time_signal_arr[i, 0]

    # reshaping array
    processed_arr = np.vstack(processed_arr)
    return processed_arr


def get_event_ids_names_map(subject_name, cursor):
    """
    generates dictionary of event ids mapped to their names
    :param subject_name: name of subject whose event ids and names we want
    :param cursor: cursor to database connection
    :return: dict['id': 'name']
    """
    event_ids_names = {}
    event_ids = get_event_ids(subject_name, cursor)
    try:
        # selecting items from db
        select_event_ids = "SELECT name " \
                           "FROM event " \
                           "WHERE pk_event_id IN " \
                           "(SELECT DISTINCT fk_event " \
                           "FROM event_data " \
                           "WHERE fk_subject = %s" \
                           "Order by fk_event)"

        cursor.execute(select_event_ids, (subject_name,))
        event_names = cursor.fetchall()
        for i in range(len(event_ids)):
            event_ids_names[event_ids[i]] = event_names[i]

    except (Exception, psycopg2.Error) as error:
        print("Error while fetching data from PostgreSQL", error)
    return event_ids_names


def get_event_ids(subject_name, cursor):
    """
    gets ids of events given the subject name and cursor to a database connection
    :param subject_name: name of subject whose event ids we want
    :param cursor: cursor to database connection
    :return: array of event ids as strings
    """
    event_ids = []
    try:
        # selecting items from db
        select_event_ids = "SELECT DISTINCT fk_event " \
                           "FROM event_data " \
                           "WHERE fk_subject = %s" \
                           "Order by fk_event"

        cursor.execute(select_event_ids, (subject_name,))
        event_ids = cursor.fetchall()
    except (Exception, psycopg2.Error) as error:
        print("Error while fetching data from PostgreSQL", error)
    return event_ids


def get_event_times_map(subject_name, cursor):
    """
    generates dictionary of event ids mapped to the time intervals when they happen
    :param subject_name: name of subject whose dictionary we want to generate
    :param cursor: cursor to database connection
    :return: dict['id': [(start,end)]
    """
    event_ids = get_event_ids(subject_name, cursor)
    id_time_dict = {}

    select_event_times = "SELECT start_time, end_time " \
                         "FROM event_data " \
                         "WHERE fk_subject = %s and fk_event = %s" \
                         "Order by start_time"

    for idx in event_ids:
        try:
            cursor.execute(select_event_times, (subject_name, idx))
            event_times = cursor.fetchall()
            event_times = np.array([(time[0], time[1]) for time in event_times])
            id_time_dict[idx] = event_times
        except (Exception, psycopg2.Error) as error:
            print("Error while fetching data from PostgreSQL", error)

    return id_time_dict


def get_channels(subject_name, cursor):
    """
    gets channels corresponding to a subject on the database
    :param subject_name: name of subject
    :param cursor: cursor to database
    :return: array of channels belonging to subject
    """
    channel_arr = {}
    try:
        # selecting items from db
        select_chan = "SELECT channel_name " \
                      "FROM raw_data_channel " \
                      "WHERE pk_channel_id IN " \
                      "(SELECT fk_channel " \
                      "FROM raw_data " \
                      "WHERE fk_subject = %s " \
                      "Order by time_ms)"

        cursor.execute(select_chan, (subject_name,))
        channel_arr = [chan[0] for chan in cursor.fetchall()]
    except (Exception, psycopg2.Error) as error:
        print("Error while fetching data from PostgreSQL:", error)
    return channel_arr


def prep_npy_arr_for_db(npy_arr):
    if type(npy_arr) == np.ndarray:
        return list(npy_arr)


def db_arr_to_npy(a_list):
    if type(a_list) == list:
        return np.array(a_list)
    else:
        return a_list


def add_channel_period(chan):
    return chan.replace('csv', '.csv')


def remove_channel_period(chan):
    return chan.replace('.csv', 'csv')
