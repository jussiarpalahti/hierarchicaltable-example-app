
import {Table, Dataset, ITable} from 'hierarchical-table';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

declare var require: any;
var Lockr = require('lockr');

import {extable} from './extable'

import {observable, computed, action, toJS, runInAction, transaction, asMap, ObservableMap} from 'mobx';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';


// INTERFACES

// DataTable is a combination of original dataset and its selected headers
class DataTable {

    @observable table: Dataset;
    @observable view: any; // TODO: asMap type?
    @observable view_matrix: [string[]];

    constructor(table, view?, view_matrix?) {
        this.table = table;
        if (view) {
            this.view = asMap(view);
        } else {
            this.view = asMap({});
            for (let key in this.table.levels) {
                this.view[key] = observable([]);
            }
        }
        this.view_matrix = view_matrix;
    }

    @action add_selection(heading:string, index:number) {
        let prev = this.view[heading].indexOf(index);
        if (prev == -1) this.view[heading].push(index);
        else this.view[heading].remove(index);
    }

    @computed get selected() {
        return this.view;
    }
}

// Collection of DataTables
class DataSource {
    constructor(
        public name:string,
        public url:string,
        public data:DataTable[]) {}
}


// STORES

class StateStore {

    name = 'statestore';
    states:{}[] = [];
    @observable active_state:number = 0;

    @action add_state(state:{}) {
        if (!(this.active_state < this.states.length - 1)) {
            this.states.push(state);
            this.active_state = this.states.length - 1;
        }
    }

    @computed get state() {
        return this.active_state ? this.states[this.active_state]: '';
    }

    is_prev_state() {
        return this.states.length > 1 && this.active_state > 0;
    }

    is_next_state() {
        return this.states.length > 1 && this.active_state + 1 < this.states.length;
    }

    @action previous() {
        this.active_state--;
    }

    @action next() {
        this.active_state++;
    }

}

class Store {

    name = "store";
    @observable datasources:any;
    @observable active_source:DataSource;
    @observable active_table:DataTable;
    @observable is_loading:boolean;

    constructor(data) {
        this.datasources = data;
    }

    hydrate(dry_state:any) {
        // TODO: Make an interface that both Store and dry store could use for data
        this.datasources = dry_state.datasources;
    }

    dehydrate():any {
        // TODO: Make an interface that both Store and dry store could use for data
        return {
            datasources: toJS(this.datasources),
            active_source: toJS(this.active_source),
            active_table: toJS(this.active_table)
        };
    }

    @action activate_source(source:DataSource) {
        this.active_source = source;
        this._load(
            this.active_source.url,
            (data) => this.active_source.data = data.pxdocs.map(doc => new DataTable(doc)));
    }

    @action activate_table(table:DataTable) {
        this.active_table = table;
    }

    @action async _load(url, update) {
        this.is_loading = true;
        try {
            let response = await fetch(url);
            let data = await response.json();
            runInAction("update state after fetching data", () => {
                update(data);
                this.is_loading = false;
            });
        } catch (e) {
            console.log("error", e.message);
        }
    }

    @action update_table(heading:string, index:number) {
        this.active_table.add_selection(heading, index);
    }

}

// var App = ({store:Store, state_store:StateStore}) =>
// <input onChange={e => store.set_view(e.target.value)} value={store.view} />
// APP

interface MenuProps {
    heading: string;
    items: string[]
}

@observer class Menu extends React.Component<MenuProps, {}> {

    select(heading, index) {
        store.update_table(heading, index);
    }

    render() {
        let {heading, items} = this.props;
        let menu_items = items.map(
            (item, index) => {
                let selected = store.active_table.selected[heading].indexOf(index) !== -1;
                return <li
                    onClick={this.select.bind(this, heading, index)}
                    key={heading + "_" + index}
                    className="pure-menu-item">
                    <a href="#" className="pure-menu-link">{selected  ? "\u2713" : "\u2717"} {item}</a>
                </li>
            });

        return (<div className="header_menu">
            <div className="pure-menu pure-menu-scrollable custom-restricted">
                <a href="#" className="pure-menu-link pure-menu-heading">{heading}</a>

                <ul className="pure-menu-list">
                    {menu_items}
                </ul>
            </div>
        </div>);
    }
}

const TableSelect = ({data}) => {
    return (<div>
        <div>{data.table.heading.map((heading, index) => <span key={index}><Menu heading={heading} items={data.table.levels[heading]} /></span>)}</div>
        <div>{data.table.stub.map((stub, index) => <span key={index}><Menu heading={stub} items={data.table.levels[stub]} /></span>)}</div>
    </div>)
};

const TableList = ({source, activate}) => {
    let tables = source.data;
    if (tables.length > 0) {
        let resp = tables.map((data) => {
            return (<li key={data.table.name} onClick={() => activate(data)}>{data.table.name}</li>)
            });
        return <ul>{resp}</ul>;
    } else {
        return null;
    }
};

@observer class App extends React.Component<{store:Store, state_store:StateStore}, {}> {
    render() {
        return (
            <div>
                <h1>Example app for hierarchical table library</h1>
                <div id="datasources">
                    <ul>
                    {store.datasources.map(source => {
                            return (
                                <li key={source.name}>
                                {source.name} <button
                                    onClick={() => store.activate_source(source)}>
                                    Select source</button>
                            </li>);
                        })}
                    </ul>
                </div>
                <div id="tablelist">
                    {!store.is_loading && store.active_source ?
                        <TableList source={store.active_source} activate={(table) => store.activate_table(table)} />
                        : store.is_loading ? "..loading" : "no source"}
                </div>
                <div id="tableselect">
                    {store.active_table ? <TableSelect data={store.active_table} /> : null}
                </div>
                <div id="table">
                    {store.active_table && !store.active_table.view ? <Table data={store.active_table.table} preview={true} /> : null}
                </div>
                <div id="toolbar">
                    <h1>State Toolbar</h1>
                    <button onClick={() => export_state()}>Export state</button>
                    <button onClick={() => import_state(state_store)}>Import state</button>
                    <button onClick={() => save_state(state_store)}>Save state</button>
                    <button onClick={() => import_state(get_state())}>Load state</button>
                    <button onClick={() => clear_state()}>Clear saved state</button>
                </div>
                <DevTools />
            </div>
        )
    };
}


// INITIALIZATION

const sources = [new DataSource("My data", "http://localhost:8000/", [])];

const store = new Store(sources);

const state_store = {
    datasources: toJS(store.datasources),
    active_source: null,
    active_table: null
};

function export_state() {
    state_store.datasources = toJS(store.datasources);
    state_store.active_source = toJS(store.active_source);
    state_store.active_table = toJS(store.active_table);
    console.log("state is", state_store);
}


function import_state(saved_state) {
    transaction(() => {
        store.datasources = saved_state.datasources.map(
            (source) => {
                return new DataSource(
                    source.name,
                    source.url,
                    source.data.map(
                        (datatable) => new DataTable(datatable.table, datatable.view))
                );
            });
        store.active_source = new DataSource(
            saved_state.active_source.name,
            saved_state.active_source.url,
            saved_state.active_source.data.map(
                (datatable) => new DataTable(datatable.table, datatable.view))
        );
        store.active_table = new DataTable(
            saved_state.active_table.table,
            saved_state.active_table.view,
            saved_state.active_table.view_matrix);
    });
}


function save_state(state, name='state') {
    Lockr.set(name, state);
}

function get_state(name='state') {
    return Lockr.get(name);
}

function clear_state(name='state') {
    Lockr.rm(name);
}

//
// reaction(
//     () => store.active_source,
//     (active_source) => {
//         state_store.active_source = toJS(active_source);
//         save_state(state_store);
//     });
//
// reaction(
//     () => store.active_table,
//     (active_table) => {
//         state_store.active_table = toJS(active_table);
//         save_state(state_store);
//     });
//
// reaction(
//     () => store.datasources,
//     (datasources) => {
//         state_store.datasources = toJS(datasources);
//         state_store.datasources.data = datasources.data.map(item => toJS(item));
//         save_state(state_store);
//     });

//
// reaction(
//     () => state_store.state,
//     (dry_state) => {
//         store.hydrate(dry_state);
//     }
// );

ReactDOM.render(
  <div>
      <App store={store} state_store={state_store} />
  </div>,
  document.getElementById('app'));
