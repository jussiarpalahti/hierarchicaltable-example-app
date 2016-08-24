
import {Table} from 'hierarchical-table';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {extable} from './extable'

import { observable, computed, action } from 'mobx';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

class Store {

    @observable table:string;
    @observable view:string;

    constructor(table:string) {
        this.table = table;
        this.view = 'no view';
    }

    @action set_view(view:string) {
        this.view = view;
    }

}

const App = observer(({ store:{} }) => (
    // <Table data={extable} preview={true} />
    <div>
        <h1>Example app for hierarchical table library</h1>
        <div>
            Current table and view: "{store.table}" and "{store.view}"
        </div>
        <div>Set view:
            <input onChange={e => store.set_view(e.target.value)} defaultValue={store.view} />
        </div>
        <DevTools />
    </div>
));

const store = new Store('a table');

ReactDOM.render(
  <div>
      <App store={store} />
  </div>,
  document.getElementById('app'));
