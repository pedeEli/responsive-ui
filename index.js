import './layout/index.js';
import './render/index.js';
import {Canvas} from './core/Canvas.js';
import {Textarea} from './textarea/Textarea.js';
import {parse} from './parser/index.js';


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
	textarea.onchange = (value) => {
		const result = parse(value);
		
		let nodes = [...result.nodes];
		while (nodes.length !== 0) {
			const node = /** @type {parser.Node} */ (nodes.pop());

			textarea.addModification(node.name.start.line, node.name.start.column, node.name.end.column, 'tag-name');
			if (node.closingTag) {
				textarea.addModification(node.closingTag.start.line, node.closingTag.start.column, node.closingTag.end.column, 'tag-name');
			}

			for (let attr of node.attributes) {
				if (attr.value) {
					textarea.addModification(attr.value.start.line, attr.value.start.column, attr.value.end.column, 'string');
				}
			}

			nodes.push(...node.children);
		}

		for (const error of result.errors) {
			console.log(error)
			let length = 1;
			if (error.type === 'user' && error.end) {
				length = error.end.column - error.pos.column;
			}
			textarea.addModification(error.pos.line, error.pos.column, error.pos.column + length, 'error');

			let text = '';
			if (error.type === 'user') {
				text = error.message;
			} else if (error.type === 'eof') {
				text = `unexpected end of line, expected: ${error.expected.join(', ')}`;
			} else if (error.type === 'expected') {
				text = `unexpected '${error.unexpected}', expected: ${error.expected.join(', ')}`;
			}

			const element = document.createElement('div');
			element.append(text);
			element.classList.add('error-hint')

			textarea.addHover(error.pos.line, error.pos.column, error.pos.column + length, element);
		}

		Canvas.build(result.nodes);
	}
	textarea.value = defaultXml;
	Canvas.run();
}
init();