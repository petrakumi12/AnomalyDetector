# AnomalyDetector

A website and API tool for exploring anomlies in fNIRS data using both machine learning and statistical methods.

## Table of contents
1. [ Features of the tool. ](#features)
2. [ Why we created this tool. ](#backgound)
3. [ Code Structure. ](#codeStructure)
4. [ Structure of Postgres and MongoDb Collections](#dbStructures)
5. [ Installing and running code from your device ](#installation)
6. [ Website User Interface ](#ui)
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
being developed, research
that analyzes fNIRS data is much newer and less standardized (Lia M. Hocke,
2018). 

AnomalyDetector to bridge this gap by applying well-known and new anomaly
detection tools and models on fNIRS data and comparing the accuracy of
the results.


<a name="codeStructure"></a>
## 3. Code Structure

The code for this tool is organized into 6 folders and 7 files. 

### File Descriptions

The main file that starts the website is app.py. 
Then, AnomalyDetector is a class that represents an anomaly detection session. Only one AnomalyDetector is initialized 
per session, and this happens when app.py gets run. The Job.py file contains the Job class, which represents a single 
anomaly detection job within a session. The other files are not important to the structure of the application. 

### Folder Descriptions

#### Algorithms

The most important folder to the application is algorithms. This is where all classes and main functionality for all 
anomaly detection algorithms resides, as well as classes for various signal types (Raw, LSTM). The Algorithm class is 
inherited by MLAlgorithm (algorithm that requires machine learning), and all specific algorithms or signal types that do
not necessarily require machine learning to run. If they do, they are inherited by MLAlgorithm instead. See image below 
for more clarification. 
![Class Inheritances](_user_guide/imgs/class%20dependence.png)

ProgressLogger is a class originally intended to log the progress of a given job and save the logs for future use, 
however it was not fully implemented so it is not functional as of right now. 

#### Helpers

This folder contains various helper functions that are used across the application. Within the folder, DbInteractions 
has functions that store and receive information from MongoDb and Postgres databases. Server contains all the functions 
that are used by app.py to run the server side of the API and website. 
Normalizer and plotter contain functions related to normalizing arrays and plotting data, while api_helpers only has 
helpers that pertain to the API aspect of the tool.  

#### Client

This folder contains all the client-side code of the website consisting of HTML, Javascript, and CSS. Each html file has 
a corresponding js file under the static folder. The flow of the website is shown on the image below: 
![Website flow](_user_guide/imgs/website flow.png)

#### User Guide and Config Files

The _user_guide folder contains a version of this readme in pdf form and all images of the readme.
_config_files contains .yaml files needed to configure the parameters of the LSTM model, if user chooses to train a new one. 


<a name="dbStructures"></a>
## 4. Structure of Postgres and MongoDb Collections


<a name="installation"></a>
## 5. Installing and running code from your device


<a name="ui"></a>
## 6. Website User Interface


<a name="api"></a>
## 7. API functionality


<a name="bugs"></a>
## 8. Known Bugs


<a name="future"></a>
## 8. Future Development

