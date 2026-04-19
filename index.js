import './layout/index.js';
import './render/index.js';
import {Canvas} from './core/Canvas.js';
import {Textarea} from './textarea/Textarea.js';
import {parse} from './parser/index.js';
import {Splitpanel} from './splitpanel/Splitpanel.js';


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
/** @param {parser.Error} error */
function errorToMessage(error) {
	if (error.type === 'user') {
		return error.message;
	} else if (error.type === 'eof') {
		return `unexpected end of string, expected: ${error.expected.join(', ')}`;
	} else if (error.type === 'expected') {
		return `unexpected '${error.unexpected}', expected: ${error.expected.join(', ')}`;
	}
	return '';
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

		const element = document.createElement('div');
		element.append(errorToMessage(error));
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

function createLastElements() {
	const last = document.createElement('div');
	
	const canvas = document.createElement('canvas');
	last.append(canvas);
	
	const errors = document.createElement('div');
	errors.classList.add('errors');
	errors.hidden = true;
	last.append(errors);
	
	const errorsHeader = document.createElement('h2');
	errorsHeader.append('Errors');
	errors.append(errorsHeader);
	
	const errorsList = document.createElement('ul');
	errors.append(errorsList);

	return {last, errors, canvas, errorsList};
}

function init() {
	const splitpanelRoot = document.getElementById('splitpanel')

	if (!splitpanelRoot) {
		console.error('splitpanel root not found');
		return;
	}

	const first = document.createElement('div');
	const {last, canvas, errors, errorsList} = createLastElements();

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		console.log('could not get canvas 2d context');
		return;
	}

	Canvas.init(canvas, ctx);
	
	const textarea = new Textarea(first);
	textarea.onchange = (value) => {
		const result = parse(value);
		
		setNodeHighlights(textarea, result.nodes);
		setErrorHighlights(textarea, result.errors);
		setWarningHighlights(textarea, result.warnings);

		if (result.errors.length === 0) {
			canvas.hidden = false;
			errors.hidden = true;
			Canvas.build(result.nodes);
			return;
		}

		canvas.hidden = true;
		errors.hidden = false;
		errorsList.replaceChildren();
		for (const error of result.errors) {
			const element = document.createElement('li');
			element.append(errorToMessage(error));
			errorsList.append(element);
		}


	}
	textarea.value = defaultXml;
	Canvas.run();

	new Splitpanel(splitpanelRoot, first, last);
}
init();