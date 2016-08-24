
import {Table} from 'hierarchical-table';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {extable} from './extable'

ReactDOM.render(
  <div>
      <h1>Example app for hierarchical table library</h1>
      <Table data={extable} preview={true} />
  </div>,
  document.getElementById('app'));
