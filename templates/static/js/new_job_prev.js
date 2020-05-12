let storage = get_sessionStorage();
window.onload = function () {
    console.log('session storage', get_sessionStorage());
    storage.job_type = 'LSTM-prev';
    add_navbar();
    init_progress_bar(1.0);
    let url = "/get_saved_models";
    fetch(url, {
        method: 'GET',
    }).then(res => res.json().then(res => {
        console.log('res body', res);
        load_accordion(res)
    }))

};

function load_accordion(input) {
    console.log('input is', input);

    for (let i = 0; i < input.length; i++) {
        console.log('cur input', input[i]);

        let card = document.createElement('div');
        card.classList.add('card');

        let card_div = document.createElement('div');
        card_div.classList.add('card-header');
        card_div.setAttribute('id', 'heading' + String(i));

        let h2 = document.createElement('h2');
        h2.classList.add('mb-0');

        let btn = document.createElement('button');
        btn.classList.add('btn');
        btn.classList.add('btn-block');
        btn.classList.add('btn-info');
        btn.setAttribute('id', input[i]['_id']);
        btn.setAttribute('type', 'button');
        btn.setAttribute('data-toggle', 'collapse');
        btn.setAttribute('data-target', '#collapse' + String[i]);
        btn.innerText = input[i].job_name;
        btn.addEventListener('click', e => {
            console.log('clicked', btn.id);
            document.getElementById('next-btn').disabled = false;
            storage.prev_model_id = btn.id;
            sessionStorage.cur_submission = JSON.stringify(storage)
        });

        let collapse = document.createElement('div');
        collapse.classList.add('collapse');
        collapse.classList.add('show');
        collapse.setAttribute('id', 'collapse' + String(i));
        collapse.setAttribute('data-parent', '#accordionExample');

        let all_train = "";
        for (let atrain of input[i].params.sets.train) {
            all_train += atrain.name[0] + " (" + atrain.sig_vals.length + "), "
        }
        all_train.slice(0, all_train.length - 2);

        let all_param = "";
        for (let aparam of Object.keys(input[i].params.alg_params)) {
            all_param += '<i>' + aparam + ':</i> ' + input[i].params.alg_params[aparam] + ", "
        }
        all_param.slice(0, all_param.length - 2);


        let collapse_body = document.createElement('div');
        collapse_body.classList.add('card-body');
        collapse_body.innerHTML = "<p><b>Description: </b>" + input[i].job_desc + "<br/>" +
            "<b>Trained on: </b>" + all_train + "<br/>" +
            "<b>Parameters: </b>" + all_param + "</p><br/>";

        document.getElementById('accordionExample').appendChild(card);
        card.appendChild(card_div);
        card_div.appendChild(h2);
        h2.appendChild(btn);
        card_div.appendChild(collapse);
        collapse.appendChild(collapse_body);
        console.log('accordion loaded')
    }


    //   <div class="card">
    //   <!--<div class="card-header" id="headingOne">-->
    //     <!--<h2 class="mb-0">-->
    //       <!--<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">-->
    //         <!--Collapsible Group Item #1-->
    //       <!--</button>-->
    //     <!--</h2>-->
    //   <!--</div>-->
    //
    //   <!--<div id="collapseOne" class="collapse show" aria-labelledby="headingOne" data-parent="#accordionExample">-->
    //     <!--<div class="card-body">-->
    //       <!--Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid. 3 wolf moon officia aute, non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt laborum eiusmod. Brunch 3 wolf moon tempor, sunt aliqua put a bird on it squid single-origin coffee nulla assumenda shoreditch et. Nihil anim keffiyeh helvetica, craft beer labore wes anderson cred nesciunt sapiente ea proident. Ad vegan excepteur butcher vice lomo. Leggings occaecat craft beer farm-to-table, raw denim aesthetic synth nesciunt you probably haven't heard of them accusamus labore sustainable VHS.-->
    //     <!--</div>-->
    //   <!--</div>-->
    // </div>
}