import './layout/index.js';
import './render/index.js';
import {Canvas} from './core/Canvas.js';


const defaultXml = `<div bg="orange" layout="flex" gap="20" justify="center" align="center">
  <div width="100px" padding="20 15" fontSize="30" height="100px" bg="lightblue" text="hello" />
  <div width="100px" padding="20 15" fontSize="30" height="100px" bg="lightblue" text="hello" />
</div>`;

function init() {
	/** @type {HTMLCanvasElement | null} */
	const canvas = document.querySelector('#canvas');
	/** @type {HTMLTextAreaElement | null} */
	const xmlInput = document.querySelector('#xml-input');

	if (!canvas || !xmlInput) {
		console.error('something went wrong');
		return;
	}

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		console.log('could not get canvas 2d context');
		return;
	}

	xmlInput.value = defaultXml;

	Canvas.init(canvas, ctx);
	Canvas.build(defaultXml);
	Canvas.run();

	xmlInput.addEventListener('input', async () => {
		const output = Canvas.build(xmlInput.value);
		console.log(output);
		Canvas.run();
	})
	

}
init();