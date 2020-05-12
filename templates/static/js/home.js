// window.onload = function () {
//     add_navbar();
//     type_logo();
//     load_subject_list();
//     load_train_size();
//     load_train_anoms();
//     document.getElementById("form").addEventListener("submit", function (event) {
//         event.preventDefault();
//         submit_alg_request()
//     });
//     document.getElementById("form").addEventListener("change", function (event) {
//         form_change()})
// };
//
// function form_change(){
//         let subject = document.getElementsByClassName('form-control')['subject']['value'];
//         chans = get_chans();
//         if (subject !== "" && chans.length > 0) {
//             load_graph(subject, chans)
//         }
// }
//
// function submit_alg_request() {
//     /*
//     submits request to run lstms
//      */
//     let alg = get_alg_type();
//     let subject = document.getElementsByClassName('form-control')['subject']['value'];
//     let chans = get_chans();
//     let train_type = get_train_type();
//
//     let url = "/submit_request";
//     let json = {
//         'alg_type': alg.toString(),
//         'subject_name': subject.toString(),
//         'channel': chans,
//         'split_type': train_type
//     };
//     console.log(JSON.stringify(json));
//     post_to_server(url, json);
//     document.getElementById('here').innerHTML = "<p>Submitted anomaly detection job. Click 'See completed jobs' to check progress</p>";
//     return "ok"
// }
//
//
// function load_channels(subject_name) {
//     let url = "/get_channels/" + subject_name;
//     fetch(url, {
//         method: 'GET',
//         // headers: {'Content-type':'application-json'},
//     }).then(function (response) {
//         response.json().then(function (res) {
//             let chans = res['chan_array'];
//             // console.log(chans)
//             let all_chan_html = document.getElementById("channel").innerHTML;
//             for (let chan of chans) {
//                 all_chan_html = all_chan_html + "<option>" + chan + "</option>"
//             }
//             document.getElementById("channel").innerHTML = all_chan_html
//         })
//     })
// }
//
//
// function load_graph(subject_name, chan_arr) {
//     url = "/get_graph";
//     json = {
//         'subject_name': subject_name,
//         'chan_arr': chan_arr
//     };
//     fetch(url, {
//         method: 'POST',
//         headers: {'Content-type': 'application-json'},
//         body: JSON.stringify(json)
//     }).then(function (response) {
//         response.json().then(function (res) {
//             console.log("get graph response", res);
//             times = res['times'];
//             vals = res['sig_vals'];
//             names = res['chans'];
//             if(document.getElementById("chart").innerHTML!=="") {
//                 document.getElementById("chart").innerHTML=""
//             }
//             make_d3_graph(times, vals, names)
//         })
//     })
// }
//
// //------------------------------------------------------------------------------
// //-------------------------- Helper Functions ----------------------------------
//
// function post_to_server(url, json) {
//     fetch(url, {
//         method: 'POST',
//         headers: {'Content-type': 'application-json'},
//         body: JSON.stringify(json)
//     })
// }
//
// function get_alg_type(){
//     let alg_type = document.getElementsByClassName('form-control')['alg-type']['value'];
//     switch (alg_type) {
//         case 'LSTM':
//             return 'lstm';
//         case 'One-Class SVM':
//             return 'oc-svm'
//     }
// }
//
// function get_chans(){
//     let chans = [], chan;
//     let sel = document.getElementsByClassName('form-control')['channel']['value'];
//         // console.log("sel", sel)
//         if (sel !== "") {
//             sel = document.getElementsByClassName('form-control')['channel'];
//             for (let i = 0, len = sel.options.length; i < len; i++) {
//                 chan = sel.options[i];
//                 if (chan.selected) { // check if selected
//                     chans.push(chan['value']); // add to array of option elements to return from this function
//                 }
//             }
//         }
//         return chans
// }
//
// function get_train_type(){
//     let train_type = "";
//     let train_size = document.getElementsByClassName('form-control')['train-size']['value'];
//     let train_anoms = document.getElementsByClassName('form-control')['train-anoms']['value'];
//     switch (train_size) {
//         case 'Small':
//             train_type += 'small';
//             break;
//         case 'Medium':
//             train_type += 'med';
//             break;
//         case 'Large':
//             train_type += 'large';
//             break;
//         case 'X-Large':
//             train_type += 'xlarge';
//             break
//     }
//     switch (train_anoms) {
//         case 'Minimal':
//             train_type += '_min';
//             break;
//         case 'Some':
//             train_type += '_avg';
//             break;
//         case 'Many':
//             train_type += '_many';
//             break
//     }
//     return train_type
// }
//
// function make_d3_graph(x_vals, y_vals, names) {
//     console.log('x_vals', x_vals);
//     console.log('y_vals', y_vals);
//     console.log('len y_vals', Object.keys(y_vals).length);
//     console.log('names', names);
//
//     let all_one = [];
//     for (i = 0; i < Object.keys(y_vals).length; i++) {
//         for (j = 0; j < y_vals[Object.keys(y_vals)[i]].length; j++) {
//             all_one.push(y_vals[Object.keys(y_vals)[i]][j])
//         }
//     }
//
//     // Reformat data to make it more copasetic for d3
//     // data = An array of objects
//     // data = An array of three objects, each of which contains an array of objects
//     var data = names.map(function (category) {
//         return {
//             category: category,
//             vals: { x: x_vals, y: y_vals[category] }
//         };
//     });
//     console.log("data", data);
//
//
//     // Define margins
//     var margin = {top: 20, right: 80, bottom: 30, left: 50},
//         width = parseInt(d3.select("#chart").style("width")) - margin.left - margin.right,
//         height = parseInt(d3.select("#chart").style("height")) - margin.top - margin.bottom;
//
//     // Define scales
//     let xScale = d3.scaleLinear().range([0, width]);
//     let yScale = d3.scaleLinear().range([height, 0]);
//     let color = d3.scaleOrdinal().range(d3.schemeCategory10);
//
//     // Define axes
//     let xAxis = d3.axisBottom().scale(xScale);
//     let yAxis = d3.axisLeft().scale(yScale);
//
//
//     // Set the color domain equal to the three product categories
//     color.domain(d3.keys(names));
//
//     // Set the domain of the axes
//     // Set the domain of the axes
//     xScale.domain(d3.extent(x_vals));
//     yScale.domain(d3.extent(all_one));
//
//     // Place the axes on the chart
//     // Define svg canvas
//     var svg = d3
//         .select("#chart")
//         .attr("width", width + margin.left + margin.right)
//         .attr("height", height + margin.left + margin.right)
//         .append("g")
//         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//
//     svg
//         .append("g")
//         .attr("class", "x axis")
//         .attr("transform", "translate(0," + height + ")")
//         .call(xAxis);
//
//     svg
//         .append("g")
//         .attr("class", "y axis")
//         .call(yAxis)
//         .append("text")
//         .attr("class", "label")
//         .attr("y", 6)
//         .attr("dy", ".71em")
//         .attr("dx", ".71em")
//         .style("text-anchor", "beginning")
//         .text("Signal Values");
//
//     var products = svg
//         .selectAll(".category")
//         .data(data)
//         .enter()
//         .append("g")
//         .attr("class", "category");
//
//
//     products
//         .append("path")
//         .attr("class", "line")
//         .attr("d", function (d) {
//             console.log("d",d);
//             return d3.line()
//                 .x(function(e,i){return d.vals.x[i]})
//                 .y(function(e,i){return d.vals.y[i]})
//                 .curve(d3.curveMonotoneX)
//                 (Array(d.vals.x.length))
//         })
//         .style("stroke", function (d) {
//             return color(d.category);
//         })
// ;
//
//     console.log("d3 concentr",d3.values(data)); // to view the structure
//
//     // Define responsive behavior
// function resize() {
//   var width =
//       parseInt(d3.select("#chart").style("width")) - margin.left - margin.right,
//     height =
//       parseInt(d3.select("#chart").style("height")) -
//       margin.top -
//       margin.bottom;
//
//   // Update the range of the scale with new width/height
//   xScale.range([0, width]);
//   yScale.range([height, 0]);
//
//   // Update the axis and text with the new scale
//   svg
//     .select(".x.axis")
//     .attr("transform", "translate(0," + height + ")")
//     .call(xAxis);
//
//   svg.select(".y.axis").call(yAxis);
//
//   // Force D3 to recalculate and update the line
//   svg.selectAll(".line").attr("d", function(d) {
//     return d3.line()
//             .x(function(e,i){return xScale(d.vals.x[i])})
//             .y(function(e,i){return yScale(d.vals.y[i])})
//             .curve(d3.curveMonotoneX)
//             (Array(d.vals.x.length))
//   });
//
//   // Update the tick marks
//   xAxis.ticks(Math.max(width / 75, 2));
//   yAxis.ticks(Math.max(height / 50, 2));
// }
// // Call the resize function whenever a resize event occurs
// d3.select(window).on("resize", resize);
// // Call the resize function
// resize();
// }
//
//
// function load_subject_list(){
//     document.getElementById("subject").innerHTML = ' <option value="" disabled selected>Choose a subject</option>' +
//         '<option>101-SART-June2018-AS</option>' +
//         '<option>102-SART-June2018-AS</option>' +
//         '<option>105-SART-June2018-VC</option>' +
//         '<option>109-SART-June2018-NT</option>' +
//         '<option>111-SART-June2018-MO</option>' +
//         '<option>113-SART-June2018-TN</option>' +
//         '<option>116-SART-June2018-MD</option>' +
//         '<option>106-SART-June2018-MH</option>' +
//         '<option>119-SART-June2018-YA</option> '
// }
//
// function load_train_size(){
//     document.getElementById("train-size").innerHTML = '<option value="" disabled selected>Choose your train size</option>' +
//     '<option>Small</option>' +
//     '<option>Medium</option>' +
//     '<option>Large</option>' +
//     '<option>X-Large</option>'
// }
//
// function load_train_anoms(){
//     document.getElementById("train-anoms").innerHTML = ' <option value="" disabled selected>Choose your anomaly levels</option>' +
//     '<option>Minimal</option>' +
//     '<option>Some</option>' +
//     '<option>Many</option>'
// }
