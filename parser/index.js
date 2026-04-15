/** @type {parser.Parser<any, string[]>} */
function* eof(...expected) {
	const pos = yield* sourcePosition();
	yield {
		type: 'error',
		error: {
			type: 'eof',
			expected,
			pos
		}
	};
}

/** @type {parser.Parser<any, string[]>} */
function* expected(...expected) {
	const state = yield;
	const pos = yield* sourcePosition();
	yield {
		type: 'error',
		error: {
			type: 'expected',
			unexpected: state.str[state.index],
			expected,
			pos
		}
	};
}

/** @type {parser.Parser<any, [string, parser.SourcePosition?, parser.SourcePosition?]>} */
function* userError(message, start, end) {
	start ??= yield* sourcePosition();
	yield {
		type: 'error',
		error: {
			type: 'user',
			message,
			pos: start,
			end
		}
	};
}

/** @type {parser.Parser<any, [string, pos?]>} */
function* warn(message, pos) {
	pos ??= yield* sourcePosition();
	yield {
		type: 'warn',
		warning: {
			message,
			pos
		}
	};
}

/** @type {parser.Parser<string, [string]>} */
function* eat(str) {
	if (yield* match(str)) {
		const state = yield;
		state.index += str.length;
		return str;
	}
	yield* expected(str);
	return '';
}

/**
 * @template V
 * @template {ReadonlyArray<any>} [Args=[]]
 * @param {parser.Parser<V, Args>} parser
 * @param {Args} args
 * @returns {parser.Generator<V | null>}
 */
function* tryParser(parser, ...args) {
	const state = yield;
	const p = parser(...args);
	let result = p.next(state);
	while (!result.done) {
		if (result.value?.type === 'warn') {
			yield result.value;
		} else if (result.value?.type === 'error') {
			return null;
		}
		result = p.next(state);
	}
	return result.value;
}

/** @type {parser.Parser<boolean, [string]>} */
function* match(str) {
	const state = yield;
	if (str.length === 1) {
		return state.str[state.index] === str;
	}
	return state.str.startsWith(str, state.index);
}

/** @type {parser.Parser<boolean>} */
function* skipWhitespace() {
	const state = yield;
	const ws = /\s+/g;
	ws.lastIndex = state.index;
	const match = ws.exec(state.str);
	if (match && match.index === state.index) {
		state.index += match[0].length;
		return true;
	}
	return false;
}

/** @type {parser.Parser<string, [RegExp]>} */
function* eatUntil(regex) {
	const state = yield;
	if (state.index >= state.str.length) {
		yield* eof();
	}

	const start = state.index;
	regex.lastIndex = start;
	const match = regex.exec(state.str);

	if (match) {
		state.index = match.index;
		return state.str.slice(start, state.index);
	}

	state.index = state.str.length;
	return state.str.slice(start);
}

/** @type {parser.Parser<parser.SourcePosition>} */
function* sourcePosition() {
	const state = yield;
	for (const range of state.ranges) {
		if (state.index >= range.start && state.index < range.end) {
			return {
				line: range.line,
				column: state.index - range.start,
				index: state.index
			};
		}
	}
	yield* userError('unable to find range');
	return {line: -1, index: -1, column: -1};
}

/**
 * @template V
 * @template {ReadonlyArray<any>} Args
 * @param {parser.Parser<V, Args>} parser
 * @param {Args} args
 * @returns {parser.Generator<parser.SourceRegion<V>>}
 */
function* sourceRegion(parser, ...args) {
	const start = yield* sourcePosition();
	const value = yield* parser(...args);
	const end = yield* sourcePosition();
	return {
		start, value, end
	};
}

/** @type {parser.Parser<parser.Node | null>} */
function* current() {
	const state = yield;
	return state.stack.at(-1) ?? null;
}

/** @type {parser.Parser<void, [parser.Node]>} */
function* push(node) {
	const state = yield;
	state.nodes.push(node);
	if (!node.selfClosing) {
		state.stack.push(node);
	}
}

/** @type {parser.Parser<parser.Node | null>} */
function* pop() {
	const state = yield;
	return state.stack.pop() ?? null;
}

/** @type {parser.Parser<string>} */
function* parseString() {
	yield* eat('"');

	if (yield* match('"')) {
		yield* eat('"');
		return '';
	}

	let value = yield* eatUntil(/[^\\]"/g);
	const state = yield;
	if (state.index >= state.str.length) {
		yield* eof();
	}
	value += state.str[state.index++];
	yield* eat('"');
	
	value = value.replaceAll('\\n', '\n');
	value = value.replaceAll('\\t', '\t');
	value = value.replaceAll('\\\\', '\\');
	value = value.replaceAll('\\"', '"');
	return value;
}

/** @type {parser.Parser}>} */
function* node() {
	yield* skipWhitespace();
	if (!(yield* match('<'))) {
		const text = yield* sourceRegion(eatUntil, /\s|</g);
		yield* userError('text outside of tag', text.start, text.end);
	}

	yield* eat('<');

	const closing = yield* match('/');
	if (closing) {
		yield* eat('/');
	}

	const beforeNamePos = yield* sourcePosition();
	const wsBeforeName = yield* skipWhitespace();

	const name = yield* sourceRegion(eatUntil, /\s|\/|>/g);
	if (name.value.length === 0) {
		yield* tryParser(eat, '/');
		yield* eat('>');
		yield* userError('expected tag name');
	}
	
	if (wsBeforeName) {
		yield* warn('expected tag name', beforeNamePos);
	}

	yield* skipWhitespace();

	if (closing) {
		yield* eat('>');
		const node = yield* current();
		if (!node) {
			yield* userError('no matching opening tag');
			return;
		}
		yield* pop();
		if (node.name.value !== name.value) {
			yield* userError('wrong closing tag', name.start, name.end);
		}
		node.closingTag = name;
		yield* skipWhitespace();
		return;
	}

	/** @type {parser.Node} */
	const node = {
		name,
		attributes: [],
		children: [],
		parent: null,
		selfClosing: false,
		closingTag: null
	};

	while (!(yield* match('>')) && !(yield* match('/'))) {
		const name = yield* sourceRegion(eatUntil, /\s|\/|>|=/g);

		if (yield* match('=')) {
			yield* eat('=');
			const value = yield* tryParser(sourceRegion, parseString);
			if (!value) {
				yield* warn('expected attribute value');
			}
			node.attributes.push({
				name,
				value
			});
		} else {
			node.attributes.push({
				name,
				value: null
			});
		}

		yield* skipWhitespace();
	}
	
	node.selfClosing = (yield* tryParser(eat, '/')) === '/';
	yield* eat('>');
	
	const parent = yield* current();
	if (parent) {
		parent.children.push(node);
		node.parent = parent;
	}
	
	yield* push(node);
	yield* skipWhitespace();
}

/**
 * @template V
 * @param {parser.Parser<V>} parser
 * @param {parser.ParserState} state
 * @returns {{success: true, warnings: parser.Warning[], value: V} | {success: false, warnings: parser.Warning[], error: parser.Error}}
 */
function run(parser, state) {
	/** @type {parser.Warning[]} */
	const warnings = [];

	const p = parser();
	
	let result = p.next(state);
	while (!result.done) {
		if (result.value?.type === 'error') {
			p.return(/** @type {V} */ (null));
			return {success: false, warnings, error: result.value.error};
		} else if (result.value?.type === 'warn') {
			warnings.push(result.value.warning);
		}
		result = p.next(state);
	}
	return {success: true, warnings, value: result.value};
}

/**
 * @param {string} template
 */
export function parse(template) {
	let rangesStart = 0;
	const ranges = template.split('\n').map((line, i) => {
		const start = rangesStart;
		const end = rangesStart = start + line.length + 1;
		/** @type {parser.Range} */
		const range = {line: i, start, end};
		return range;
	})


	/** @type {parser.ParserState} */
	const state = {
		index: 0,
		str: template,
		ranges,
		stack: [],
		nodes: []
	};

	/** @type {parser.Warning[]} */
	const warnings = [];
	/** @type {parser.Error[]} */
	const errors = [];

	while (state.index < state.str.length) {
		const result = run(node, state);
		warnings.push(...result.warnings);
		if (!result.success) {
			errors.push(result.error);
		}
	}

	for (const node of state.stack) {
		errors.push({
			type: 'user',
			message: 'tag needs to be closed',
			pos: node.name.start,
			end: node.name.end
		});
	}

	return {
		nodes: state.nodes.filter(node => !node.parent),
		warnings,
		errors
	}
}