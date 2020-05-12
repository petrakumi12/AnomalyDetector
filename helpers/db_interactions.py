import psycopg2 as psycopg2
import numpy as np

progress = {
    0: 'Processing user input',
    1: 'Preparing datasets',
    2: 'Job queued',
    3: 'Job initialized',
    4: 'Job in progress - preparing sets for LSTM',
    5: 'Job in progress - training / loading trained model',
    6: 'Job in progress - predicting output',
    7: 'Job in progress - calculating errors',
    8: 'Job in progress - calculating anomalies',
    9: 'Job complete',
    -1: 'Job interrupted - error'
}


def connect_db():
    # connecting to db
    connection = psycopg2.connect(user="postgres",
                                  password="jhA-j4X-ZqI-LTX",
                                  host="esolovey-vm1.wpi.edu",
                                  port="5432",
                                  database="studies")
    cursor = connection.cursor()
    return connection, cursor


def disconnect_db(connection, cursor):
    # closing database connection.
    if connection:
        cursor.close()
        connection.close()
        print("PostgreSQL connection is closed")


def get_sig_val_as_arr(cursor, subject_name, chan_name):
    """
    takes a subject name and channel as input
    outputs numpy array of time and value params
    :param subject_name: name of subject eg P103-R-RL
    :param chan_name: name of channel eg A-DC1
    :param cursor: cursor for pointing at db
    :return: arr: numpy arr with 2 columns, first one time, second value
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
        time_val = cursor.fetchall()
    except (Exception, psycopg2.Error) as error:
        print("Error while fetching data from PostgreSQL:", error)

    arr = np.array(time_val)
    print(np.shape(arr))

    # handling duplicate rows
    prev_row = None
    new_arr = []
    for i in range(len(arr[:, 0])):
        if prev_row != arr[i, 0]:
            new_arr.append(arr[i])
        else:
            print('repeated val in subject', subject_name, 'idx', i, 'time', arr[i])
        prev_row = arr[i, 0]
    new_arr = np.vstack(new_arr)
    # print('new_arr shape',np.shape(new_arr))
    # print('arr shape',np.shape(arr))
    arr = new_arr
    return arr


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


# connection,cursor = connect_db()
# print(get_channels('101-SART-June2018-AS',cursor))
# disconnect_db(connection,cursor)

###################################### Interactions with mongodb #####################################################
def create_job(args):
    args_new = {}
    for key, val in args.items():
        args_new[key] = val
    args_new['progress'] = progress[0]
    del args_new['jobs_db']
    job_id = args['jobs_db'].insert(args_new)
    # print("inserted into db", args['jobs_db'].find_one({'_id': job_id}))
    return job_id


def update_progress(id, job_db, number):
    job_db.update_one(
        {'_id': id},
        {'$set': {'progress': progress[number]}}
    )
    print("Progress Update(", id, "): ", progress[number])
