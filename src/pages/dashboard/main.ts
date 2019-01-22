import { isPlainObject } from 'lodash';

import { CHAIN_KEY } from '../../components/base';

import './style.scss';
import './components/dash.scss';
import 'normalize.css';

const plainObject = {};

console.log(isPlainObject(plainObject));
console.log(isPlainObject(CHAIN_KEY));