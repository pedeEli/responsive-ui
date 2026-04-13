import {parse} from '../parser/index.js';

export class Textarea {
	/** @type {HTMLElement} */
	#root;
	/** @type {HTMLElement} */
	#textbox;
	/** @type {Cursor} */
	#cursor;

	#focused = false;
	#value = '';
	/** @type {textarea.LineInfo[]}} */
	#lines = [];

	#pointerdown = false;

	/** @type {null | ((nodes: parser.Node[]) => void)} */
	onupdate = null;
	
	/** @param {HTMLElement} root */
	constructor(root) {
		this.#root = root;
		this.#root.classList.add('textarea');
		this.#textbox = Textarea.#createTextarea();
		this.#root.append(this.#textbox);
		this.#cursor = new Cursor(Textarea.#createCursor(), this);
		this.#root.append(this.#cursor.element);

		window.addEventListener('pointerdown', this.#pointerdownHandle.bind(this));
		window.addEventListener('pointerup', this.#pointerupHandle.bind(this));
		window.addEventListener('pointermove', this.#pointermoveHandle.bind(this));
		window.addEventListener('keydown', this.#keydownHandle.bind(this));
	}

	/** @param {string} text */
	parse(text) {
		this.#value = text;

		for (const {element} of this.#lines) {
			element.remove();
		}
		this.#lines = [];

		const result = parse(text);

		for (const error of result.errors) {
			console.error(error);
		}
		for (const warning of result.warnings) {
			console.error(warning);
		}

		if (result.nodes.length === 0) {
			return result;
		}
		
		const lines = text.split('\n');

		/** @type {textarea.Highlight[][]} */
		const highlights = [];
		/**
		 * @param {parser.SourceRegion<any>} region
		 * @param {textarea.Highlight['type']} type
		 */
		function setHighlight(region, type) {
			let index = region.start.index;
			for (let line = region.start.line; line <= region.end.line; line++) {
				let highlight = highlights.at(line);
				if (!highlight) {
					highlight = [];
					highlights[line] = highlight;
				}
				const first = line === region.start.line;
				const last = line === region.end.line;
				/** @type {parser.SourcePosition} */
				const start = {
					index,
					line,
					column: first ? region.start.column : 0
				};
				index += lines[line].length + 1;
				if (first) {
					index -= region.start.column;
				}
				/** @type {parser.SourcePosition} */
				const end = {
					index: last ? region.end.index : index,
					line,
					column: last ? region.end.column : (lines[line].length + 1)
				};
				highlight.push({
					type,
					region: {
						value: null,
						start,
						end
					}
				})
			}
		}
		
		const nodes = [...result.nodes];
		while (nodes.length > 0) {
			const node = /** @type {parser.Node} */ (nodes.pop());

			setHighlight(node.name, 'tag');
			if (node.closingTag) {
				setHighlight(node.closingTag, 'tag');
			}
			
			for (const attr of node.attributes) {
				if (attr.value) {
					setHighlight(attr.value, 'string');
				}
			}

			if (node.children) {
				nodes.push(...node.children);
			}
		}

		let currentIndex = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const element = Textarea.#createLine();
			/** @type {textarea.LineInfo['children']} */
			const children = [];
			const elementStart = currentIndex;
			currentIndex += line.length + 1;
			const elementEnd = currentIndex;

			this.#lines.push({children, element, start: elementStart, end: elementEnd, length: line.length});
			this.#textbox.append(element);
			
			const highlight = highlights.at(i);
			if (!highlight) {
				if (line !== '') {
					const text = document.createTextNode(line);
					children.push({node: text, start: elementStart, end: elementEnd});
					element.append(text);
					continue;
				}
				element.append(document.createElement('br'));
				continue;
			}
			
			highlight.sort((a, b) => a.region.start.index - b.region.start.index);
			let index = 0;
			for (const {type, region} of highlight) {
				if (region.start.column !== 0) {
					const text = line.substring(index, region.start.column);
					const node = document.createTextNode(text);
					children.push({node, start: elementStart + index, end: region.start.index});
					element.append(node);
				}

				const span = document.createElement('span');
				span.dataset.highlight = type;
				span.dataset.type = 'segment';
				const text = line.substring(region.start.column, region.end.column);
				const node = document.createTextNode(text);
				span.append(node);
				let end = region.end.index;
				if (region.end.column === line.length) {
					end++;
				}
				children.push({node, start: region.start.index, end});
				element.append(span);
				index = region.end.column;
			}
			if (index < line.length) {
				const node = document.createTextNode(line.substring(index));
				children.push({node, start: elementStart + index, end: elementEnd});
				element.append(node);
			}
		}

		this.onupdate?.(result.nodes);
	}

	/** @returns {HTMLElement} */
	static #createLine() {
		const element = document.createElement('div');
		element.classList.add('line');
		element.dataset.type = 'line';
		return element;
	}

	#windowPointerupHandle() {
		this.#pointerdown = false;
	}

	/** @param {PointerEvent} event */
	#windowPointermoveHandle(event) {
		if (!this.#pointerdown) {
			return;
		}

		const pos = document.caretPositionFromPoint(event.x, event.y);
		if (!pos || !this.#textbox.contains(pos.offsetNode)) {
			return;
		}

		this.#cursor.index = this.#getIndexByNodeAndOffset(pos.offsetNode, pos.offset);
	}

	/** @param {PointerEvent} event */
	#windowPointerdownHandle(event) {
		if (!(event.target instanceof Node)) {
			return;
		}

		if (this.#root.contains(event.target)) {
			this.#pointerdownHandle(event.x, event.y);
		} else {
			this.#blurHandle();
		}
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	#pointerdownHandle(x, y) {
		this.#pointerdown = true;
		if (!this.#focused) {
			this.#focused = true;
		}

		document.body.style.userSelect = 'none';
		this.#cursor.show();
		
		const pos = document.caretPositionFromPoint(x, y);
		if (!pos) {
			return;
		}

		const index = this.#getIndexByNodeAndOffset(pos.offsetNode, pos.offset);
		if (index !== -1) {
			this.#cursor.index = index;
		}
	}

	#blurHandle() {
		if (!this.#focused) {
			return;
		}

		document.body.style.userSelect = 'text';

		this.#focused = false;
		this.#cursor.hide();
	}

	/**
	 * @param {Node} node
	 * @param {number} offset
	 */
	#getIndexByNodeAndOffset(node, offset) {
		let index = -1;
		for (const line of this.#lines) {
			if (line.element.contains(node)) {
				index = line.start;
				for (const child of line.children) {
					if (child.node.contains(node)) {
						index += offset;
						break;
					}
					index = child.end;
				}
				break;
			}
		}
		return index;
	}

	/** @param {KeyboardEvent} event */
	#windowKeydownHandle(event) {
		if (!this.#focused) {
			return;
		}

		if (event.key.length === 1 || event.key === 'Enter') {
			let index = this.#cursor.index;
			const selection = this.#getSelection();
			if (selection) {
				index = this.#removeRange(index, selection.start, selection.end);
			}

			const front = this.#value.substring(0, index);
			const key = event.key === 'Enter' ? '\n' : event.key;
			const back = this.#value.substring(index);
			this.parse(front + key + back);
			this.#cursor.index = index + 1;
		} else if (event.key === 'Backspace' || event.key === 'Delete') {
			let index = this.#cursor.index;
			const selection = this.#getSelection();
			if (selection) {
				index = this.#removeRange(index, selection.start, selection.end);
				this.parse(this.#value);
			} else {
				if (event.key === 'Delete') {
					index++;
				}
				const front = this.#value.substring(0, index - 1);
				const back = this.#value.substring(index);
				this.#value = front + back;
				index--;
			}
			this.parse(this.#value);
			this.#cursor.index = index;
		} else if (event.key === 'ArrowLeft') {
			this.#cursor.index--;
			if (!event.shiftKey) {
				this.#setRangeStart();
			}
		} else if (event.key === 'ArrowRight') {
			this.#cursor.index++;
			if (!event.shiftKey) {
				this.#setRangeStart();
			}
		} else if (event.key === 'ArrowUp') {
			this.#cursor.up();
			if (!event.shiftKey) {
				this.#setRangeStart();
			}
		} else if (event.key === 'ArrowDown') {
			this.#cursor.down();
			if (!event.shiftKey) {
				this.#setRangeStart();
			}
		}
	}

	#getSelection() {
		const ranges = document.getSelection()?.getComposedRanges();
		if (!ranges || ranges.length === 0) {
			return null;
		}
		const start = this.#getIndexByNodeAndOffset(ranges[0].startContainer, ranges[0].startOffset);
		const end = this.#getIndexByNodeAndOffset(ranges[0].endContainer, ranges[0].endOffset);
		if (start === end) {
			return null;
		}
		return {start, end};
	}

	/**
	 * @param {number} index
	 * @param {number} start
	 * @param {number} end
	 * @returns {number}
	 */
	#removeRange(index, start, end) {
		this.#value = this.#value.substring(0, start) + this.#value.substring(end);
		if (index > end) {
			index -= end - start;
		} else if (index > start) {
			index = start;
		}
		return index;
	}

	#setRangeStart() {
		const selection = document.getSelection();
		const node = this.#cursor.node;
		if (!selection || !node) {
			return;
		}

		const range = document.createRange();
		range.setStart(node, this.#cursor.offset);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	static #createCursor() {
		const element = document.createElement('div');
		element.classList.add('cursor');
		element.ariaHidden = 'true';
		element.hidden = true;
		return element;
	}

	static #createTextarea() {
		const area = document.createElement('div');
		area.role = 'textbox';
		area.classList.add('textbox');
		area.dataset.type = 'textbox';
		return area;
	}

	get textbox() {
		return this.#textbox;
	}
	/** @returns {ReadonlyArray<textarea.LineInfo>} */
	get lines() {
		return this.#lines;
	}
}

class Cursor {
	#index = 0;
	#line = 0;
	#column = 0;
	
	/** @type {null | Node} */
	#node = null;
	#offset = 0;

	/** @type {HTMLElement} */
	element;
	/** @type {Textarea} */
	textarea;

	/**
	 * @param {HTMLElement} element
	 * @param {Textarea} textarea
	 */
	constructor(element, textarea) {
		this.element = element;
		this.textarea = textarea;
	}

	show() {
		this.element.hidden = true;
		this.element.getBoundingClientRect();
		this.element.hidden = false;
	}

	hide() {
		this.element.hidden = true;
	}

	get index() {
		return this.#index;
	}
	/** @param {number} value */
	set index(value) {
		this.#index = value;
		const lines = this.textarea.lines;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (this.#index >= line.start && this.#index < line.end) {
				this.#column = this.#index - line.start;
				this.#line = i;
				this.#updatePosition(line);
				break;
			}
		}
	}

	up() {
		if (this.#line === 0) {
			return;
		}
		this.#line--;
		this.#updatePositionByLine();
	}
	down() {
		if (this.#line === this.textarea.lines.length - 1) {
			return;
		}
		this.#line++;
		this.#updatePositionByLine();
	}
	#updatePositionByLine() {
		const line = this.textarea.lines[this.#line];
		const column = Math.min(line.length, this.#column);
		this.#index = line.start + column;
		this.#updatePosition(line);	
	}

	/** @param {textarea.LineInfo} line */
	#updatePosition(line) {
		const parent = this.textarea.textbox.getBoundingClientRect();
		let left = 0;
		let top = 0;
		let positionSet = false;

		for (const child of line.children) {
			if (this.#index < child.start || this.#index >= child.end) {
				continue;
			}

			positionSet = true;
			const offset = this.#index - child.start;
			const range = document.createRange();
			range.setStart(child.node, 0);
			range.setEnd(child.node, offset);
			const rect = range.getBoundingClientRect();
			left = rect.right - parent.left;
			top = rect.top - parent.top;
			
			this.#node = child.node;
			this.#offset = offset;
			
			break;
		}

		if (!positionSet) {
			this.#offset = 0;
			this.#node = line.element;

			const rect = line.element.getBoundingClientRect();
			top = rect.top - parent.top;
			left = rect.left - parent.left;
		}
		
		this.element.style.left = `${left}px`;
		this.element.style.top = `${top}px`;
		this.show();
	}


	get node() {
		return this.#node;
	}
	get offset() {
		return this.#offset;
	}
	
}