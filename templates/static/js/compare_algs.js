window.onload = function () {
    add_navbar();
    get_comparison_data()
};

function get_comparison_data() {
    url = '/get_comparison_data';
    fetch(url, {
        method: "GET"
    }).then(function (res) {
        res.json().then(function (res) {
            console.log("This is res", res);
            document.getElementById("res").innerHTML = '<p>res 0:' + JSON.stringify(res[0])+ '<br/><br/>' + 'res 1:' + JSON.stringify(res[1])+'</p>'
        })
    })
}