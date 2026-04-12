import {parse} from '../parser/index.js';

export class Textarea {
	/** @type {HTMLElement} */
	#root;
	/** @type {HTMLElement} */
	#cursor;
	/** @type {HTMLElement} */
	#textbox;

	#focused = false;
	#value = '';
	#cursorIndex = 0;
	/** @type {textarea.LineInfo[]}} */
	#lines = [];
	
	/** @param {HTMLElement} root */
	constructor(root) {
		this.#root = root;
		this.#root.classList.add('textarea');
		this.#textbox = Textarea.#createTextarea();
		this.#root.append(this.#textbox);
		this.#cursor = Textarea.#createCursor();
		this.#root.append(this.#cursor);

		window.addEventListener('pointerdown', this.#windowPointerdownHandle.bind(this));
		window.addEventListener('keydown', this.#windowKeydownHandle.bind(this));
	}

	/** @param {string} text */
	parse(text) {
		this.#value = text;

		for (const {element} of this.#lines) {
			element.remove();
		}
		this.#lines = [];

		const result = parse(text);
		if (result.nodes.length === 0) {
			return result;
		}

		/** @type {textarea.Highlight[][]} */
		const highlights = [];
		/**
		 * @param {parser.SourceRegion<any>} region
		 * @param {textarea.Highlight['type']} type
		 */
		function setHighlight(region, type) {
			let highlight = highlights.at(region.start.line);
			if (!highlight) {
				highlight = [];
				highlights[region.start.line] = highlight;
			}
			highlight.push({start: region.start.column, end: region.end.column, type});
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
		const lines = text.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const element = Textarea.#createLine();
			/** @type {textarea.LineInfo['children']} */
			const children = [];
			const elementStart = currentIndex;
			currentIndex += line.length + 1;
			const elementEnd = currentIndex;

			this.#lines.push({children, element, start: elementStart, end: elementEnd});
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
			
			highlight.sort((a, b) => a.start - b.start);
			let index = 0;
			for (const {start, end, type} of highlight) {
				if (start !== 0) {
					const text = document.createTextNode(line.substring(index, start));
					children.push({node: text, start: elementStart + index, end: elementStart + start});
					element.append(text);
				}

				const span = document.createElement('span');
				span.dataset.type = type;
				const text = document.createTextNode(line.substring(start, end));
				span.append(text);
				children.push({node: text, start: elementStart + start, end: elementStart + end});
				element.append(span);
				index = end;
			}
			if (index < line.length) {
				const text = document.createTextNode(line.substring(index));
				children.push({node: text, start: elementStart + index, end: elementEnd});
				element.append(text);
			}
		}

		return result;
	}

	/** @returns {HTMLElement} */
	static #createLine() {
		const element = document.createElement('div');
		element.classList.add('line');
		return element;
	}

	/** @param {PointerEvent} event */
	#windowPointerdownHandle(event) {
		if (!(event.target instanceof Node)) {
			return;
		}

		if (this.#root.contains(event.target)) {
			this.#pointerdown(event.x, event.y);
		} else {
			this.#blur();
		}
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	#pointerdown(x, y) {
		if (!this.#focused) {
			this.#focused = true;
		}
		this.#cursor.hidden = true;
		this.#cursor.getBoundingClientRect();
		this.#cursor.hidden = false;
		
		const pos = document.caretPositionFromPoint(x, y);
		const rect = pos?.offsetNode instanceof Element ? pos.offsetNode.getBoundingClientRect() : pos?.getClientRect(); 
		if (!pos || !rect) {
			return;
		}

		const parent = this.#root.getBoundingClientRect();
		this.#cursor.style.top = `${rect.top - parent.top}px`;
		this.#cursor.style.left = `${rect.left - parent.left}px`;

		for (const line of this.#lines) {
			if (line.element.contains(pos.offsetNode)) {
				let start = line.start;
				for (const child of line.children) {
					if (child.node.contains(pos.offsetNode)) {
						start += pos.offset;
						break;
					}
					start = child.end;
				}
				this.#cursorIndex = start;
				break;
			}
		}
	}

	#blur() {
		if (!this.#focused) {
			return;
		}

		this.#focused = false;
		this.#cursor.hidden = true;
	}

	/** @param {KeyboardEvent} event */
	#windowKeydownHandle(event) {
		if (!this.#focused) {
			return;
		}

		if (event.key === 'Enter') {

		} else if (event.key === 'Backspace') {

		} else {
			const front = this.#value.substring(0, this.#cursorIndex);
			const end = this.#value.substring(this.#cursorIndex);
			const newValue = front + event.key + end;
			
			this.parse(newValue);
			this.#cursorIndex++;
			for (const line of this.#lines) {
				if (this.#cursorIndex >= line.start && this.#cursorIndex < line.end) {
					for (const child of line.children) {
						if (this.#cursorIndex < child.start || this.#cursorIndex >= child.end) {
							continue;
						}

						const offset = this.#cursorIndex - child.start;
						const range = document.createRange();
						range.setStart(child.node, 0);
						range.setEnd(child.node, offset);
						const parent = this.#textbox.getBoundingClientRect();
						const rect = range.getBoundingClientRect();
						this.#cursor.style.top = `${rect.top - parent.top}px`;
						this.#cursor.style.left = `${rect.right - parent.left}px`;
						this.#cursor.hidden = true;
						this.#cursor.getBoundingClientRect();
						this.#cursor.hidden = false;
						break;
					}
					break;
				}
			}
		}
	}

	/** @param {number} index */
	#updateCursor(index) {

	}

	static #createCursor() {
		const cursor = document.createElement('div');
		cursor.classList.add('cursor');
		cursor.ariaHidden = 'true';
		cursor.hidden = true;
		return cursor;
	}

	static #createTextarea() {
		const area = document.createElement('div');
		area.role = 'textbox';
		area.classList.add('textbox');
		return area;
	}
}