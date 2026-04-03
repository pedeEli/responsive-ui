import {Transform} from './components/Transform.js'
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
	<div bg=lightblue dir=column align=center gap=70 justify=center>
		<div width=80% height=300px gap=20 border=black padding=10 dir=row>
			<div bg=darkred width=100%></div>
			<div bg=orange width=100%></div>
		</div>
	</div>
`);

if (!result.success) {
	console.error(result.e);
}


function loop() {
	Transform.renderComponents(ctx);
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);