window.onload = function () {
    add_navbar();
    // gen_results_table();
};





//
// function gen_results_table() {
//     console.log("gen running");
//     tableHTML = document.getElementById('results-table').innerHTML;
//     tableHTML += '<tbody>';
//     url = '/get_jobs';
//     fetch(url, {
//         method: 'GET',
//         // headers: {'Content-type':'application-json'},
//     }).then(function (response) {
//         response.json().then(function (res) {
//             console.log(res);
//             let counter = 1;
//             for (job of res['jobs']) {
//                 tableHTML += '<tr>' +
//                     '<th scope="row">' + job["_id"] + '</th>' +
//                     '<td>' + job["alg_type"] + '</td>' +
//                     '<td>' + job["subject"] + '</td>' +
//                     '<td>' + job["channels"] + '</td>' +
//                     '<td>' + job["train_type"] + '</td>' +
//                     '<td>' + job["progress"] + '</td>' +
//                     '<td><button type="button" class="btn btn-primary" onclick="get_info(' + counter + ')">Get Info</button></td>' +
//                     '<td><button type="button" class="btn btn-danger" onclick="delete_row(' + counter + ')">Delete</button></td>' +
//                     '<td><input type="checkbox" class="form-check-input ml-3 my-0 mt-1" style="width:3vh;height:3vh;"/></td>' +
//                     '</tr>';
//                 counter++
//             }
//             tableHTML += '</tbody>';
//             document.getElementById('results-table').innerHTML = tableHTML
//
//         })
//     })
// }
//
// function delete_row(rowno) {
//     // console.log("i",i)
//     let i = document.getElementById('results-table').rows[rowno].cells[0].innerText;
//     console.log(i);
//     url = '/delete_entry';
//     fetch(url, {
//         method: 'POST',
//         headers: {'Content-type': 'application-json'},
//         body: JSON.stringify({'id': i})
//     }).then(function (res) {
//         console.log(rowno);
//         document.getElementById('results-table').deleteRow(rowno);
//         // let btns = document.getElementsByClassName("btn-primary");
//         // for (let i = 0; i < btns.length; i++) {
//         //     console.log(btns[i]);
//         //     btns[i].parentNode.innerHTML = '<td><button type="button" class="btn btn-primary" onclick="get_info(' + i + ')">Get Info</button></td>'
//         // }
//     }).then(function(){
//         document.getElementById("results-table").innerHTML = '<thead> ' +
//             '<tr> ' +
//             '<th scope="col">ID</th> ' +
//             '<th scope="col">Alg Type</th> ' +
//             '<th scope="col">Subject</th> ' +
//             '<th scope="col">Channels</th> ' +
//             '<th scope="col">Training Set</th> ' +
//             '<th scope="col">Status</th> ' +
//             '<th scope="col"></th> ' +
//             '<th scope="col"></th> ' +
//             '<th scope="col"><button type="button" class="btn btn-warning" onclick="compare_algs()">Compare</button></th> ' +
//             '</tr>' +
//             '</thead>';
//         gen_results_table()
//     })
// }
//
// function get_info(rowno) {
//     // console.log("i",i)
//     let i = document.getElementById('results-table').rows[rowno].cells[0].innerText;
//     console.log(i);
//     url = '/get_info/' + i;
//     fetch(url, {
//         method: 'GET',
//     }).then(function (res) {
//         window.location = url;
//     })
// }
//
// function compare_algs() {
//     function get_checked_boxes() {
//         checkboxes = document.getElementsByClassName('form-check-input');
//         clicked_array = [];
//         for (box of checkboxes) {
//             if (box.checked) {
//                 clicked_array.push(box.parentNode.parentElement.cells[0].innerText)
//             }
//         }
//         console.log(clicked_array);
//         return clicked_array
//     }
//
//     box_array = get_checked_boxes();
//     url = '/compare_algs/' + box_array;
//     fetch(url, {
//         method: 'GET'
//
//     }).then(function (res) {
//
//         res.json().then(function (data) {
//             url = '/post_comparison_data';
//             fetch(url, {
//                 method: "POST",
//                 headers: {'Content-type': 'application-json'},
//                 body: JSON.stringify({'ids': box_array})
//             }).then(function () {
//                 fetch('/get_comparison_data', {
//                     method: "GET"
//                 }).then(function () {
//                     console.log(data);
//                     window.location = '/compare_algs';
//                 })
//            })
//         })
//     })
// }