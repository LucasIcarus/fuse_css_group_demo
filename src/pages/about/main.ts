import { get } from 'lodash';

import './components/header.scss';

const AboutDemo: { key: string } = {
    key: 'about'
};

console.log(get(AboutDemo, 'key', 'null'));