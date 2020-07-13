# AnomalyDetector

A website and API tool for exploring anomlies in fNIRS data using both machine learning and statistical methods.

## Table of contents
1. [ Features of the tool. ](#features)
2. [ Why we created this tool. ](#backgound)
3. [ Code Structure. ](#codeStructure)
4. [ Structure of Postgres, MongoDb, and AWS Collections](#dbStructures)
5. [ Installing and running code from your device ](#installation)
6. [ Navigating the Website as a User ](#ui)
7. [ API functionality ](#api)
8. [ Known Bugs ](#bugs)
9. [ Future Development ](#future)

<a name="features"></a>
## 1. Features of this tool

The tool consists of a website and API, both of which have the same basic functionality: 
- Giving the user the option to smooth the submitted signal arrays using newly or previously trained LSTM-RNNs models (Long-Short Term Recurrent Neural Networks).
- Detecting anomalies of submitted signals (or smoothed signals) using one of the following methods:
    - Telemanom (Hundman et al, 2018)
    - Variation with Standard Deviation-based Threshold
    - Variation with Percentile-based Threshold
    - Variation of Variation with Standard Deviation-based Threshold
- Storing and visualizing the results of the anomaly detection

You can read more about LSTMs and the anomaly detection methods on my paper linked [here](https://drive.google.com/file/d/15DNh4O4GolQIT6FgowC0aPXs22uu56Cw/view?usp=sharing).

<a name="background"></a>
## 2. Why we created this tool

Functional near-infrared spectroscopy, or fNIRS, is an emerging hemodynamic neuroimaging technology that can be used to 
map brain activity (Ferrari & Quaresima, 2012). The technology gathers data about the amount
of oxygen flowing in parts of a patient’s brain, which helps scientists understand the level of activity in that part of 
the brain. fNIRS mapping is
becoming increasingly popular because of its ease of use and practicality with
more sensitive subjects such as kids and the elderly (Teresa Wilcox, 2015).
Among other applications, analyzing fNIRS data can potentially pave the
way for more streamlined Human-Computer Interaction and more intuitive
Brain-Computer Interfaces (BCI).

With any collection of data, there may be one or multiple data points that
deviate significantly from the rest of the data, called anomalies. Anomalies can
provide a lot of critical information about the data: technical incidents such
as a faulty sensor, new trends, etc. Knowing where the anomalous data points are can help scientists more accurately 
analyze their data. While more research and time has been devoted to analyzing data
produced by fMRIs (functional magnetic resonance imaging) or EEGs (electroencephalogram) leading to certain standards 
being developed, research that analyzes fNIRS data is much newer and less standardized (Lia M. Hocke, 2018). 

AnomalyDetector aims to bridge this gap by applying well-known and new anomaly
detection tools and models on fNIRS data and comparing the accuracy of
the results.


<a name="codeStructure"></a>
## 3. Code Structure

The code for this tool is organized into 6 folders and 7 files. 

### File Descriptions

The main file that starts the website is `app.py`. 
Then, `AnomalyDetector` is a class that represents an anomaly detection session. Only one `AnomalyDetector` is initialized 
per session, and this happens when `app.py` gets run. The `Job.py` file contains the Job class, which represents a single 
anomaly detection job within a session. The other files are not important to the structure of the application. 

### Folder Descriptions

#### Algorithms

The most important folder to the application is `algorithms`. This is where all classes and main functionality for all 
anomaly detection algorithms resides, as well as classes for various signal types (Raw, LSTM). The `Algorithm` class is 
inherited by `MLAlgorithm` (algorithm that requires machine learning), and all specific algorithms or signal types that do
not necessarily require machine learning to run. If they do, they are inherited by `MLAlgorithm` instead. See image below 
for more clarification. 
![Class Inheritances](_user_guide/imgs/class%20dependence.png)

`ProgressLogger` is a class originally intended to log the progress of a given job and save the logs for future use, 
however it was not fully implemented so it is not functional as of right now. 

#### Helpers

This folder contains various helper functions that are used across the application. Within the folder, `DbInteractions` 
has functions that store and receive information from MongoDb and Postgres databases. Server contains all the functions 
that are used by `app.py` to run the server side of the API and website. 
`Normalizer` and `Plotter` contain functions related to normalizing arrays and plotting data, while `api_helpers` only has 
helpers that pertain to the API aspect of the tool.  

#### Client

This folder contains all the client-side code of the website consisting of HTML, Javascript, and CSS. Each html file has 
a corresponding js file under the static folder. The flow of the website is shown on the image below: 

![Website flow](_user_guide/imgs/website flow.png)

#### User Guide and Config Files

The `_user_guide` folder contains a version of this readme in pdf form and all images of the readme.
`_config_files` contains .yaml files needed to configure the parameters of the LSTM model, if user chooses to train a new one. 


<a name="dbStructures"></a>
## 4. Structure of Postgres, MongoDb, and AWS Collections

This tool uses Postgres, MongoDb, and AWS S3 buckets to store and retrieve information. 

### Postgres

Postgres contains information on previous experiments conducted at the WPI HCI lab. The tool uses it to 
receive this information in case users want to run anomaly detection on the signal values of previous experiments. 
Although this collection is composed of many tables, not all of them are needed in this tool. The ones we use are `raw_data` and `raw_data_channel`. 

`raw_data` contains the following fields:
- `pk_data_id` (private key to identify unique datapoint)
- `fk_device_setup` (foreign key linking to another table)
- `fk_subject` (foreign key linking to private key of another table and identifying unique experiment subject)
- `fk_channel` (foreign key linking to private key of raw_data_channel and identifying unique channel)
- `time_ms` (the time after start of experiment when data point was recorded)
- `value` (the signal value of the data point)
- `time_source` (the device that recorded the time)

![Snippet of raw table](_user_guide/imgs/postgres%20raw%20data.png)


`raw_data_channel` contains the following fields:
- `pk_channel_id` (private key to identify each unique channel)
- `fk_source` (foreign key connecting the entry to another table)
- `fk_detector` (foreign key connecting the entry to another table)
- `power_from` (AC/DC/Ph denoting the type of current sent to that channel from the fNIRS device)
- `distance_mm` (determines location of channel on fNIRS cap)
- `wavelength_mm` (wavelength of signal received)
- `channel_name` (name of unique channel)

![Snippet of raw channel table](_user_guide/imgs/postgres%20raw%20data%20channel.png)


To receive the raw signal values and recorded time, given a subject and channel name, the tool follows these steps 
(defined in function `get_sig_val_as_arr` in `DbInteractions`):
1. Find entry with given channel name from `raw_data_channel`
2. Get `pk_channel_id` of that channel (this is the same as `fk_channel` in `raw_data`)
3. In `raw_data`, find entries whose `fk_subject` matches given subject name
4. Filter those entries so that `fk_channel` matches the retrieved private key from `raw_data_channel`
5. Get `time_ms` and `value` of selected entries as array
6. Order array in increasing order of `time_ms`

These two tables are also used to retrieve all channels given a subject name (`get_channels` function in `DbInteractions`). 

### MongoDb

The MongoDb Collections are used to store and retrieve information on anomaly detection jobs that either are currently 
running or have been completed. This project uses five Mongo Collections:
- `jobs`: stores all anomaly detection job information, whether it's a job in progress or completed. Each entry is a 
dictionary with the following keys:
 - `_id (String)`: Submission time of the job, which acts as a unique identifier for the job
 - `job_name (String)`: Contains the name of the job as entered by the user
 - `job_desc (String)`: The description of the job
 - `job_type (String)`: Type of algorithm used for the job. This can be one of the following: Telemanom, Variation with Standard Deviation-based Threshold, Variation with Percentile-based Threshold, Variation of Variation with Standard Deviation-based Threshold
 - `signal_type (String)`: The type of signal used for the job. This can be one of the following: Raw, LSTM-new, LSTM-prev
 - `progress (String)`: The progress of the anomaly detection job. This can be one of the following: 
  Processing user input, Preparing datasets, Job queued, Job initialized, Job in progress - preparing sets for LSTM,
  Job in progress - training / loading trained model, Job in progress - predicting output, Job in progress - calculating errors,
  Job in progress - calculating anomalies,  Job complete, Job interrupted - error
  - `params (Dictionary)`: Contains three keys: sets, times, and alg_params.
    - `sets (Dictionary)`: Contains information on the inputted datasets for analyzing. Contains three keys: 
      - `types (Dictionary)`: Contains information on whether user selected datasets from previously uploaded ones, or
         from local storage. Keys are train and test, and values either prev_datasets (sets previously uploaded) or user_uploads (new sets uploaded from user's local storage). 
      - `train (Array(Dictionary))`: an Array of information about each submitted dataset only for training the LSTM model.
         The anomalies of these datasets will not be analyzed. If the array
         is not empty (this happens when user decides to use raw signal to analyze anomalies), each element of the array is a dictionary containing the following keys:
        - `name (String)`: name of dataset (selected file)
        - `sig_vals (Array(Float))`: array of raw signal values of the dataset
          - `events (Array(Int))`: array of events of the dataset
      - `test (Array(Dictionary))`: an Array of information about submitted sets for testing. These are also the datasets
        whose anomalies will be analyzed. This array cannot be empty as there should always be a dataset whose signal the user 
        wants to analyze. The contents of this array have the same structure as the ones of the train key. 
    - `times (Dictionary)`: Starting and ending indexes of the part of the training set that user wants to use. 
      - `type (String)`: Will always be = "times". This is an old parameter that now serves no functionality but has not 
        been removed for fear of breaking a crucial part of the tool's flow. 
      - `param_1 (Integer)`: The index of the signal value where the training set section starts. A number between 0 and the total length of all submitted datasets-1.
      - `param_2 (Integer)`: The index of the signal value where the training set section ends. A number between 1 and 
      the total length of all submitted datasets. Has to be bigger than `param_0`. 
    - `alg_params (Dictionary)`: All parameters needed to run all algorithms that will be used in the job both to smooth 
    signal and to find anomalies. [This table](#paramTable) shows all possible keys and values depending on the selected algorithms.
    - `results (Dictionary)`: Is only added when job_progress is "Job complete". Contains the smoothed signal arrays if 
    LSTMs were selected, variation arrays if variation was selected, and the resulting arrays of anomalies for each submitted dataset. 
    Each key has the name of the submitted dataset. If there is a period in the name of the dataset, that is dropped because
     Mongo does not allow periods in the dictionary keys. The values of each key are as follows:
      - `smoothed_arr (Array(Float))`: Array of smoothed values of the dataset. Added only if user chose to use LSTMs
      - `variation_arr (Array(Float))`: Array of variation values of the testing dataset. Added only if user chose to use a variation-based algorithm.
      - `variation_variation_arr (Array(Float))`: Array of variation of variation values. Added only if user chose variation of variation as the anomaly detection algorithm. 
      - `anom_array (Array(Integer))`: Array of 0's and 1's corresponding to normal (0) and anomalous (1) points in the dataset. 
      - `num_anoms (Integer)`: Total anomalies in the dataset, calculated as sum of all 1's in `anom_array`.
    
        
- `lstm_queues`: Used when queuing jobs for completion. Only contains two entries that get updated by the code:
    - `first entry (Dictionary)`: Used for adding information about jobs that have yet to be initialized 
        - `id_ (String)`: 'to_do' 
        - `queue (Array)`: starts as null and gets updated with job information as user submits more jobs for analysis
    - `second entry (Dictionary)`: Used for adding information about jobs that have completed
        - `id_ (String)`: 'done'
        - `queue (Array)`: starts as null and gets updated with job information as more and more jobs complete

- `uploaded_datasets`: Contains information on all datasets that have been previously uploaded. 
These datasets are loaded when user is asked to select training and testing sets (on `pickJobParameters.js`). New
datasets that the user uploads on this page that are not contained in this collection already are also added to it. The
function that checks whether a dataset is already uploaded (`upload_new_datasets()` on `app.py`) does so by checking whether 
an entry with the same name and signal values exists (does not check for events and events are currently not uploaded to the database).
Each dataset in this collection is represented as a dictionary with the following values:
    - `_id (Object)`: Randomly generated ID by Mongo
    - `name (String)`: Name of the dataset
    - `data (Array)`: Array of signal values

![Sample Job entry in Mongo](_user_guide/imgs/sample%20mongo.png )

<a name="installation"></a>
## 5. Installing and running code from your device

The setup for this project is really easy and only requires a few steps: 

1. Import it from Github on your particular IDE. Some links on how to do that depending on your IDE:
[PyCharm](https://www.jetbrains.com/pycharm/guide/tips/create-project-from-github/), 
[Spyder (scroll down to "Working with Version Control")](https://docs.spyder-ide.org/projects.html), 
[Atom](https://atom.io/packages/import)

2. Make sure you are using Python 3.6 on the project. 

Python 3.7 will not support the necessary version of Tensorflow and will cause problems.
You can install this version of Python [here](https://www.python.org/downloads/release/python-360/). 
Instructions to include it in the project depending on the IDE:
[Pycharm](https://www.jetbrains.com/help/pycharm/project-interpreter.html), 
[Spyder](https://stackoverflow.com/questions/43592879/how-to-change-python-version-in-anaconda-spyder), 
[Atom (using the Script package - scroll to Usage)](https://atom.io/packages/script#usage)

3. Install `requirements.txt`
This installs all the packages required to properly run the code. 
If you have [pip](https://pip.pypa.io/en/stable/) installed, you just need to write `$ pip install -r requirements.txt` 
on your console and press enter.


4. Run app.py
Once all requirements are installed, all that is left to do is run the `app.py` file. To do so you can follow instructions below:
Pycharm - click on the file and press the Play button on the top right, 
[Spyder](https://fangohr.github.io/blog/spyder-the-python-ide.html), 
[Atom (using the Script package)](https://atom.io/packages/script)

5. Open the website or run the API

Copy the IP address that shows on your Run console. Then:

**Website**: Paste to your browser, and press enter to see the homepage of the site. 
**API**: Using an app like postman, paste the address on the header of a new request to prepare for sending or 
receiving requests in the future. 

<a name="ui"></a>
## 6. Navigating the Website as a User



<a name="api"></a>
## 7. API functionality

### Submitting a job

Let's demonstrate the API’s functionality by submitting a sample job running Variation with Standard Deviation-based 
Threshold on an LSTM-smoothed signal from a newly trained model. To do so we follow these steps:

1. Submit a request containing the information below to
the `/submitRequest` URL endpoint. 
![Submit job api](_user_guide/imgs/submit%20api.png)

Once the request is submitted, we receive the following result:
![Success job api](_user_guide/imgs/api%20success.png)

2. To understand how the job is being processed we can see the logs
outputted in the backend. First, we see the parameters below
will be used. Since we only added the B parameter, all others were set
as default.
![Parameters api](_user_guide/imgs/api%20parameters.png)

3. Then, we see a progress update followed by starting the LSTM.
![Starting job api](_user_guide/imgs/starting%20lstm%20api.png)

4. Afterwards, the model gets trained. After it is done training, it updates
progress and predicts outputs for the user-defined channels. We can see
this in the logs like below.
![LSTM ended api](_user_guide/imgs/lstm%20ended%20api.png)

5. Once predictions have been made, the smoothed arrays are sent to the
Variation with standard deviation method and anomalies are calculated
separately for each channel.
![Calculate anomalies API](_user_guide/imgs/lstm%20ended%20api.png)

6. Once this step is also completed, the job is finished. We can see
this through the following output as well.
![Job complete API](_user_guide/imgs/job%20complete%20api.png)

### Retreiving information about a job

In the meanwhile, the job has been saved to the database and we can
retrieve its information through the API through a POST request to
`/jobDetails`. 

Body of the request
![Job complete API](_user_guide/imgs/get%20job%20info%20request%20body%20api.png)

The returned response
![Job complete API](_user_guide/imgs/get%20job%20info%20request%20response.png)


<a name="bugs"></a>
## 8. Known Bugs


<a name="future"></a>
## 9. Future Development

<a name="paramTable"></a>
![Table of all algorithm parameters](_user_guide/imgs/algorithm%20parameters.png)

\\events functionality on datasets was never checked, updating that would be nice too. 
Handling events on the client side should be pretty much set but on the server side with uploading and receiving from database is not. 