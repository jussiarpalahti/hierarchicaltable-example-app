
import {Table, Dataset, ITable} from 'hierarchical-table';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {extable} from './extable'

import { observable, computed, action, reaction, toJS} from 'mobx';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

class DataTable {
    table:ITable
}

class DataSource {
    name:string;
    url:string;
    tables:[DataTable]
}

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
    @observable table:string;
    @observable view:string;

    constructor(table:string) {
        this.table = table;
        this.view = 'no view';
    }

    @action set_view(view:string) {
        this.view = view;
    }

    hydrate(dry_state:any) {
        // TODO: Make an interface that both Store and dry store could use for data
        this.table = dry_state.table;
        this.view = dry_state.view;
    }

    dehydrate():any {
        // TODO: Make an interface that both Store and dry store could use for data
        return {
            table: toJS(this.table),
            view: toJS(this.view)}
    }

}

// <Table data={extable} preview={true} />

// var App = ({store:Store, state_store:StateStore}) =>

@observer class App extends React.Component<{store:Store, state_store:StateStore}, {}> {
    render() {
        return (
            <div>
                <h1>Example app for hierarchical table library</h1>
                <div>
                    Current table and view: "{store.table}" and "{store.view}"
                </div>
                <div>Set view:
                    <input onChange={e => store.set_view(e.target.value)} value={store.view} />
                </div>
                <div>
                    Active state: {state_store.active_state} / {state_store.states.length}
                    <div>
                        {state_store.is_prev_state() ? "jee" : "noo"}
                        {state_store.is_next_state() ? "jee" : "noo"}
                    </div>
                </div>
                <div>
                    <button disabled={!state_store.is_prev_state() ? "disabled" : ""} onClick={() => state_store.previous()}>Prev</button>
                    <button disabled={!state_store.is_next_state() ? "disabled" : ""} onClick={() => state_store.next()}>Next</button>
                </div>
                <DevTools />
            </div>
        )
    };
}

const store = new Store('a table');

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
