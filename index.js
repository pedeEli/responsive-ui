import {parseAndBuild} from './parser/index.js'


const canvas = document.querySelector('canvas');
if (!canvas) {
	throw new Error('canvas not found!');
}

const ctx_ = canvas.getContext('2d');
if (!ctx_) {
	throw new Error('could not get context from canvas');
}
const ctx = ctx_;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
});


const result = parseAndBuild(ctx, `
	<div bg=lightblue>
		<div text="hello world" fontSize=40 width=auto height=auto padding=30 bg=orange></div>
	</div>
`);

if (!result.success) {
	console.error(result.e);
	throw new Error();
}

const root = result.v;

function loop() {
	root.render(ctx)
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);