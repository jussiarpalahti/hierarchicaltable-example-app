
import {Table} from 'hierarchical-table';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {extable} from './extable'

import { observable, computed, action } from 'mobx';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';


const App = observer(({ store:{} }) => (
    <div>
        <h1>Example app for hierarchical table library</h1>
        <Table data={extable} preview={true} />
        <DevTools />
    </div>
));


ReactDOM.render(
  <div>
      <App store={{}} />
  </div>,
  document.getElementById('app'));
