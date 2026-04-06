import './layout/index.js';
import './render/index.js';
import {Canvas} from './core/Canvas.js';

const canvas = document.querySelector('canvas');
if (!canvas) {
	throw new Error('canvas not found!');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
	throw new Error('could not get context from canvas');
}

Canvas.init(canvas, ctx);

const result = Canvas.build(`
	<div bg="orange" layout="flex" gap="20" justify="center" align="center">
		<div width="100px" padding="20 15" fontSize="30" height="100px" bg="lightblue" text="hello" />
		<div width="100px" padding="20 15" fontSize="30" height="100px" bg="lightblue" text="hello" />
	</div>
`);

if (!result.success) {
	console.error(result.e);
	throw null;
}

for (const warning of result.v) {
	console.warn(warning);
}

Canvas.run();