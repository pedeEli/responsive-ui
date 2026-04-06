import {result, error} from './utils.js';

/**
 * @param {string} str
 * @returns {core.Result<core.XMLNode[], core.ParseError>}
 */
export function parse(str) {
	let i = 0;
	let line = 1;
	let column = 0;

	/**
	 * @param {string[]} expected
	 * @returns {core.Result<any, core.ParseError>}
	 */
	function expected(...expected) {
		let message = 'unexpected ';
		if (i >= str.length) {
			message += 'eof';
		} else if (/\s/.test(str[i])) {
			message += 'whitespace';
		} else {
			message += `character '${str[i]}'`
		}

		if (expected.length !== 0) {
			message += ', expected ';
			if (expected.length === 1) {
				message += expected[0];
			} else if (expected.length === 2) {
				message += `${expected[0]} or ${expected[1]}`;
			} else {
				message += expected.slice(0, -1).join(', ');
				message += ` or ${expected.at(-1)}`;
			}
		}
		return error({column, line, message});
	}

	function advance() {
		i++;

		column++;
		if (str[i] === '\n') {
			column = 0;
			line++;
		}
	}

	function skipWhitespace() {
		while (/\s/.test(str[i])) {
			advance();
		}
	}

	/** @returns {core.Result<core.XMLNode, core.ParseError>} */
	function node() {
		if (str[i] !== '<') {
			return expected('<');
		}
		advance();
		
		let type = '';
		while (i < str.length && /[a-z]/.test(str[i])) {
			type += str[i];
			advance();
		}

		if (type === '') {
			return expected('a-z');
		}

		if (!/\s|>|\//.test(str[i])) {
			return expected('whitespace', '>', '/');
		}

		skipWhitespace();

		// attributes
		/** @type {Map<string, string>} */
		const attributes = new Map();
		while (str[i] !== '/' && str[i] !== '>') {
			let attrName = '';
			while (i < str.length && /[a-zA-Z]/.test(str[i])) {
				attrName += str[i];
				advance();
			}

			if (attrName === '') {
				return expected('a-z', '/', '>');
			}

			if (/\s|\/|>/.test(str[i])) {
				attributes.set(attrName, '');
				skipWhitespace();
				continue;
			}

			if (str[i] !== '=') {
				return expected('whitespace', '=', '/', '>');
			}
			advance();

			if (str[i] !== '"') {
				return expected('"');
			}
			advance();

			let attrValue = '';
			while (i < str.length && str[i] !== '"') {
				if (str[i] === '\\') {
					advance();
					if (str[i] === '"') {
						attrValue += '"';
					} else if (str[i] === 't') {
						attrValue += '\t';
					} else if (str[i] === 'n') {
						attrValue += '\n';
					} else if (str[i] === '\\') {
						attrValue += '\\';
					} else {
						return expected('"', 't', 'n', '\\');
					}
					advance();
					continue;
				}
				attrValue += str[i];
				advance();
			}

			if (str[i] !== '"') {
				return expected('"');
			}
			advance();
			
			attributes.set(attrName, attrValue);
			skipWhitespace();
		}

		if (str[i] === '/') {
			advance();
			if (str[i] !== '>') {
				return expected('>');
			}
			advance();
			return result({type, attributes, children: []});
		}

		if (str[i] !== '>') {
			return expected('>');
		}
		advance()

		/** @type {core.XMLNode[]} */
		const children = [];
		skipWhitespace();
		while (i + 1 < str.length && str[i + 1] !== '/') {
			const child = node();
			if (!child.success) {
				return child;
			}
			children.push(child.v);
			skipWhitespace();
		}

		if (str[i] !== '<') {
			return expected('<');
		}
		advance();

		if (str[i] !== '/') {
			return expected('/');
		}
		advance();

		const closingTypeLine = line;
		const closingTypeColumn = column;
		let closingType = '';
		while (i < str.length && /[a-z]/.test(str[i])) {
			closingType += str[i];
			advance();
		}

		if (closingType === '') {
			return expected('a-z');
		}

		skipWhitespace();
		if (str[i] !== '>') {
			return expected('>');
		}
		advance();

		if (type !== closingType) {
			return error({
				line: closingTypeLine,
				column: closingTypeColumn,
				message: `unexpected closing tag, expected '</${type}>'`
			});
		}

		return result({
			type,
			attributes,
			children
		});
	}

	/** @type {core.XMLNode[]} */
	const nodes = [];

	skipWhitespace();
	while (i < str.length) {
		const child = node();
		if (!child.success) {
			return child;
		}
		nodes.push(child.v);
		skipWhitespace();
	}

	return result(nodes);
}