import {error, result} from '../utils.js'

const NONE = 0;
const TAG_START = 1;
const INSIDE_TAG = 2;
const INSIDE_END_TAG = 4;
const INSIDE_STRING = 8;
const ESCAPED_CHAR = 16;

const escaped = {
	'n': '\n',
	't': '\t',
	'"': '"',
	'\\': '\\',
};

/**
 * @param {string} str
 * @returns {Result<UINode, ParseError>}
 */
export function parse(str) {
	/** @type {UINode} */
	const root = {
		type: 'root',
		attributes: null,
		children: null,
		parent: null
	};

	let current = root;
	let state = NONE;
	let acc = '';

	let line = 1;
	let column = 0;

	/** @param {string} type */
	function pushTag(type) {
		/** @type {UINode} */
		const node = {
			type,
			attributes: null,
			children: null,
			parent: current
		};
		if (current.children) {
			current.children.push(node);
		} else {
			current.children = [node];
		}
		current = node;
	}

	/** @param {string} str */
	function pushAttribute(str) {
		const [key, value] = str.includes('=') ? str.split('=') : [str, ''];
		if (current.attributes) {
			current.attributes.set(key, value);
		} else {
			current.attributes = new Map([[key, value]]);
		}
	}

	/**
	 * @param {string} message
	 * @returns {Result<any, ParseError>}
	 */
	function createError(message) {
		return error({line, column, message});
	}

	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		
		column++;
		if (char === '\n') {
			column = 0;
			line++;
		}

		if (state === NONE) {
			if (char === '<') {
				state = TAG_START;
			}
			continue;
		}

		if (state === TAG_START) {
			if (acc === '' && char === '/') {
				state = INSIDE_END_TAG;
			} else if (char === '>') {
				if (acc === '') {
					return createError('empty tag not allowed');
				}
				pushTag(acc);
				acc = '';
				state = NONE;
			} else if (!/\s/.test(char)) {
				acc += char;
			} else {
				pushTag(acc);
				acc = '';
				state = INSIDE_TAG;
			}
			continue;
		}

		if (state === INSIDE_END_TAG) {
			if (char === '>') {
				if (acc === '') {
					return createError('empty tag not allowed');
				}
				if (current.type !== acc) {
					return createError('mismatch in open and close tag');
				}
				current = /** @type {UINode} */ (current.parent);
				acc = '';
				state = NONE;
			} else if (/\s/.test(char)) {
				return createError('whitespace is not allowed in closing tag');
			} else {
				acc += char;
			}
		}

		if (state & INSIDE_TAG) {
			if (state & INSIDE_STRING) {
				if (state & ESCAPED_CHAR) {
					if (char in escaped) {
						acc += /** @type {any} */ (escaped)[char];
						state &= ~ESCAPED_CHAR;
						continue;
					}
					return createError('unrecognized escaped character');
				}
				
				if (char === '\\') {
					state |= ESCAPED_CHAR;
				} else if (char === '"') {
					state &= ~INSIDE_STRING;
				} else if (char === '=') {
					return createError('equal sign is not allowed inside a string');
				} else {
					acc += char;
				}
				continue;
			}

			if (char === '>') {
				state = NONE;
				if (acc !== '') {
					pushAttribute(acc);
					acc = '';
				}
			} else if (char === '"') {
				state |= INSIDE_STRING;
			} else if (/\s/.test(char)) {
				if (acc !== '') {
					pushAttribute(acc);
					acc = '';
				}
			} else {
				acc += char;
			}
			continue;
		}

	}

	return result(root);
}