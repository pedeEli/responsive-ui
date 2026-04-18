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

/**
 * @param {Textarea} textarea
 * @param {parser.Node[]} nodes
 */
function setNodeHighlights(textarea, nodes) {
	const ns = [...nodes];
	while (ns.length !== 0) {
		const node = /** @type {parser.Node} */ (ns.pop());

		textarea.addModification(node.name.start.line, node.name.start.column, node.name.end.column, 'tag-name-highlight');
		if (node.closingTag) {
			textarea.addModification(node.closingTag.start.line, node.closingTag.start.column, node.closingTag.end.column, 'tag-name-highlight');
		}

		for (let attr of node.attributes) {
			if (attr.value) {
				textarea.addModification(attr.value.start.line, attr.value.start.column, attr.value.end.column, 'string-highlight');
			}
		}

		ns.push(...node.children);
	}
}
/**
 * @param {Textarea} textarea
 * @param {parser.Error[]} errors
 */
function setErrorHighlights(textarea, errors) {
	for (const error of errors) {
		let length = 1;
		if (error.type === 'user' && error.end) {
			length = error.end.column - error.pos.column;
		}
		textarea.addModification(error.pos.line, error.pos.column, error.pos.column + length, 'error-highlight');

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
		element.classList.add('error-hint');

		textarea.addHover(error.pos.line, error.pos.column, error.pos.column + length, element);
	}
}
/**
 * @param {Textarea} textarea
 * @param {parser.Warning[]} warnings
 */
function setWarningHighlights(textarea, warnings) {
	for (const warning of warnings) {
		textarea.addModification(warning.pos.line, warning.pos.column, warning.pos.column + 1, 'warning-highlight');

		const element = document.createElement('div');
		element.append(warning.message);
		element.classList.add('warning-hint');

		textarea.addHover(warning.pos.line, warning.pos.column, warning.pos.column + 1, element);
	}
}

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
		
		setNodeHighlights(textarea, result.nodes);
		setErrorHighlights(textarea, result.errors);
		setWarningHighlights(textarea, result.warnings);

		Canvas.build(result.nodes);
	}
	textarea.value = defaultXml;
	Canvas.run();
}
init();