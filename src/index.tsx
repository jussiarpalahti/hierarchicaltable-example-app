
import {Table, Dataset, ITable} from 'hierarchical-table';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {extable} from './extable'

import { observable, computed, action, reaction, toJS, runInAction} from 'mobx';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';


// INTERFACES

// DataTable is a combination of original dataset and its selected headers
class DataTable {
    constructor(
        public table:Dataset,
        public view?:{string: [string]}) {}
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
    states:string[] = [];
    @observable active_state:number = 0;

    @action add_state(state:string) {
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
            datasources: toJS(this.datasources)
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

}

// <Table data={extable} preview={true} />

// var App = ({store:Store, state_store:StateStore}) =>
// <input onChange={e => store.set_view(e.target.value)} value={store.view} />
// APP

const Menu = ({heading, items}) => {
    let menu_items = items.map(
        (item, index) => {
            return <li
                key={heading + "_" + index}
                className="pure-menu-item">
                <a href="#" className="pure-menu-link">{item}</a>
            </li>
        });

    return (<div className="header_menu">
        <div className="pure-menu pure-menu-scrollable custom-restricted">
            <a href="#" className="pure-menu-link pure-menu-heading">{heading}</a>

            <ul className="pure-menu-list">
                {menu_items}
            </ul>
        </div></div>);
};

const TableSelect = ({table}) => {
    return (<div>
        <div>{table.heading.map((heading, index) => <span key={index}><Menu heading={heading} items={table.levels[heading]} /></span>)}</div>
        <div>{table.stub.map((stub, index) => <span key={index}><Menu heading={stub} items={table.levels[stub]} /></span>)}</div>
    </div>)
};

const TableList = ({source, activate}) => {
    let tables = source.data;
    if (tables.length > 0) {
        let resp = tables.map(({table}) => {
            return (<li key={table.name} onClick={() => activate(table)}>{table.name}</li>)
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
                <div>
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
                <div>
                    {!store.is_loading && store.active_source ? <TableList source={store.active_source} activate={(table) => store.activate_table(table)} /> : store.is_loading ? "..loading" : "no source"}
                </div>
                <div>
                    {store.active_table ? <TableSelect table={store.active_table} /> : null}
                </div>
                <div id="toolbar">
                    <span>
                        Active state: {state_store.active_state} / {state_store.states.length}
                    </span>
                    <span>
                        <button disabled={!state_store.is_prev_state() ? "disabled" : ""} onClick={() => state_store.previous()}>Prev</button>
                        <button disabled={!state_store.is_next_state() ? "disabled" : ""} onClick={() => state_store.next()}>Next</button>
                    </span>
                </div>
                <DevTools />
            </div>
        )
    };
}


// INITIALIZATION

const sources = [new DataSource("My data", "http://localhost:8000/", [])];

const store = new Store(sources);

const state_store = new StateStore();

reaction(
    () => store.dehydrate(),
    (dry_state) => {
        state_store.add_state(dry_state);
});

reaction(
    () => state_store.state,
    (dry_state) => {
        store.hydrate(dry_state);
    }
);

ReactDOM.render(
  <div>
      <App store={store} state_store={state_store} />
  </div>,
  document.getElementById('app'));
