import './layout/index.js';
import './render/index.js';
import {Canvas} from './core/Canvas.js';
import {Textarea} from './textarea/Textarea2.js';


const defaultXml = `<div
  bg="orange" layout="flex" gap="20"
  justify="center" align="center"
>
  <div
    width="100px" height="100px" padding="20 15"
    fontSize="30" bg="lightblue" text="hello"
  />

  <div
    width="100px" height="100px" padding="20 15"
    fontSize="30" bg="lightblue" text="hello"
  />
</div>`;

function init() {
	/** @type {HTMLCanvasElement | null} */
	const canvas = document.querySelector('#canvas');
	/** @type {HTMLElement | null} */
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

	Canvas.init(canvas, ctx);
	
	const textarea = new Textarea(xmlInput);
	textarea.onupdate = (nodes) => {
		Canvas.build(nodes);
	}
	textarea.value = defaultXml;
	Canvas.run();
}
init();