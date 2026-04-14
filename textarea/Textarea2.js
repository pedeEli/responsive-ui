import {parse} from '../parser/index.js';

export class Textarea {
	/** @type {HTMLElement} */
	#root;
	/** @type {HTMLElement} */
	#textbox;
	/** @type {HTMLElement} */
	#cursor;

	#focused = false;
	#pointerdown = false;

	/** @type {null | number} */
	#storedColumn = null;

	#value = '';

	/** @type {null | ((nodes: parser.Node[]) => void)} */
	onupdate = null;

	/** @param {HTMLElement} root */
	constructor(root) {
		this.#root = root;
		this.#root.classList.add('textarea');

		this.#textbox = document.createElement('div');
		this.#textbox.classList.add('textbox');
		this.#textbox.role = 'textbox';
		this.#textbox.dataset.type = 'textbox';
		this.#root.append(this.#textbox);

		this.#cursor = document.createElement('div');
		this.#cursor.classList.add('cursor');
		this.#cursor.dataset.type = 'cursor';
		this.#cursor.ariaHidden = 'true';
		this.#cursor.hidden = true;
		this.#root.append(this.#cursor);

		window.addEventListener('pointerdown', this.#pointerdownHandle.bind(this));
		window.addEventListener('pointerup', this.#pointerupHandle.bind(this));
		window.addEventListener('pointermove', this.#pointermoveHandle.bind(this));
		window.addEventListener('keydown', this.#keydownHandle_CursorPosition.bind(this));
		window.addEventListener('keydown', this.#keydownHandle_ValueModification.bind(this));
	}

	/** @param {PointerEvent} event */
	#pointerdownHandle(event) {
		if (!(event.target instanceof Node)) {
			return;
		}

		if (!this.#root.contains(event.target)) {
			this.#cursor.hidden = true;
			this.#focused = false;
			return;
		}

		this.#pointerdown = true;
		this.#focused = true;
		this.#showCursor();

		this.#setCursorWithPoint(event.x, event.y);
	}

	#pointerupHandle() {
		this.#pointerdown = false;
	}

	/** @param {PointerEvent} event */
	#pointermoveHandle(event) {
		if (this.#pointerdown) {
			this.#setCursorWithPoint(event.x, event.y);
		}
	}

	/** @param {KeyboardEvent} event */
	#keydownHandle_CursorPosition(event) {
		if (!this.#focused) {
			return;
		}

		if (!/home|end|arrow/i.test(event.key)) {
			return;
		}

		event.stopImmediatePropagation();
		event.preventDefault();
		const selection = window.getSelection();
		if (!selection) {
			return;
		}

		const alter = event.shiftKey ? 'extend' : 'move';
		const granularity = event.ctrlKey ? 'word' : 'character';

		switch (event.key) {
			case 'ArrowLeft':
				this.#storedColumn = null;
				selection.modify(alter, 'backward', granularity);
				break;
			case 'ArrowRight':
				this.#storedColumn = null;
				selection.modify(alter, 'forward', granularity);
				break;
			case 'Home':
				this.#storedColumn = null;
				selection.modify(alter, 'backward', 'lineboundary');
				break;
			case 'End':
				this.#storedColumn = null;
				selection.modify(alter, 'forward', 'lineboundary');
				break;
			case 'ArrowUp':
				{
					const range = selection.getRangeAt(0).cloneRange();
					range.collapse(selection.direction === 'backward');
					
					this.#storedColumn ??= this.#getColumn(range.startContainer) + range.startOffset;
					selection.modify(alter, 'backward', 'lineboundary');
					
					const line = this.#getLine(range.startContainer).previousElementSibling;
					if (!(line instanceof HTMLElement)) {
						break;
					}
	
					selection.modify(alter, 'backward', 'character');
					
					const length = this.#getLength(line) - 1;
					for (let i = length; i > this.#storedColumn; i--) {
						selection.modify(alter, 'backward', 'character');
					}
				}
				break;
			case 'ArrowDown':
				{
					const range = selection.getRangeAt(0).cloneRange();
					range.collapse(selection.direction === 'backward');
					
					this.#storedColumn ??= this.#getColumn(range.startContainer) + range.startOffset;
					selection.modify(alter, 'forward', 'lineboundary');
					
					const line = this.#getLine(range.startContainer).nextElementSibling;
					if (!(line instanceof HTMLElement)) {
						break;
					}
	
					selection.modify(alter, 'forward', 'character');
					
					const length = this.#getLength(line) - 1;
					for (let i = 0; i < Math.min(length, this.#storedColumn); i++) {
						selection.modify(alter, 'forward', 'character');
					}
				}
				break;
		}

		if (selection.anchorNode instanceof Element) {
			this.#setCursorWithRect(selection.anchorNode.getBoundingClientRect());
			return;
		}

		const range = selection.getRangeAt(0).cloneRange();
		range.collapse(selection.direction === 'backward');
		this.#setCursorWithRect(range.getBoundingClientRect());
	}
	
	/** @param {KeyboardEvent} event */
	#keydownHandle_ValueModification(event) {
		if (!this.#focused) {
			return;
		}

		if (event.key.length !== 1 && !/enter|backspace|delete/i.test(event.key)) {
			return;
		}

		event.stopImmediatePropagation();
		event.preventDefault();

		const selection = window.getSelection();
		if (!selection) {
			return;
		}

		const range = selection.getRangeAt(0);
		const hasSelection = range.startContainer !== range.endContainer || range.startOffset !== range.endOffset;

		if (hasSelection) {
			// delete selection
			const start = this.#getStart(range.startContainer) + range.startOffset;
			const end = this.#getStart(range.endContainer) + range.endOffset;
			this.value = this.#value.substring(0, start) + this.#value.substring(end);

			let r = this.#getRangeFromIndex(start);
			if (r) {
				if (r.startContainer instanceof Element) {
					this.#setCursorWithRect(r.startContainer.getBoundingClientRect());
				} else {
					this.#setCursorWithRect(r.getBoundingClientRect());
				}
				selection.removeAllRanges();
				selection.addRange(r);
			}
		}

		if (hasSelection && /backspace|delete/i.test(event.key)) {
			return;
		}

		let index = this.#getStart(range.startContainer) + range.startOffset;

		if (event.key === 'Backspace') {
			this.value = this.#value.substring(0, index - 1) + this.#value.substring(index);
			index--;
		} else if (event.key === 'Delete') {
			this.value = this.#value.substring(0, index) + this.#value.substring(index + 1);
		} else {
			const char = event.key === 'Enter' ? '\n' : event.key;
			this.value = this.#value.substring(0, index) + char + this.#value.substring(index);
			index++;
		}

		const r = this.#getRangeFromIndex(index);
		if (r) {
			if (r.startContainer instanceof Element) {
				this.#setCursorWithRect(r.startContainer.getBoundingClientRect());
			} else {
				this.#setCursorWithRect(r.getBoundingClientRect());
			}
			selection.removeAllRanges();
			selection.addRange(r);
		}
	}


	/** @param {string} v */
	set value(v) {
		this.#value = v;

		while (this.#textbox.firstChild) {
			this.#textbox.firstChild.remove();
		}

		const result = parse(this.#value);
		for (const error of result.errors) {
			console.error(error);
		}
		for (const warning of result.warnings) {
			console.error(warning);
		}

		this.onupdate?.(result.nodes);
		if (result.nodes.length === 0) {
			return;
		}

		const lines = this.#value.split('\n');

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

			nodes.push(...node.children);
		}

		let currentIndex = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineStartIndex = currentIndex;
			const lineLength = line.length + 1;
			const lineEndIndex = currentIndex = currentIndex + lineLength;

			const lineElement = document.createElement('div');
			lineElement.classList.add('line');
			lineElement.dataset.type = 'line';
			lineElement.dataset.length = `${lineLength}`;
			lineElement.dataset.start = `${lineStartIndex}`;
			lineElement.dataset.end = `${lineEndIndex}`;
			this.#textbox.append(lineElement);

			const highlight = highlights.at(i);
			if (!highlight) {
				const lineSegment = document.createElement('span');
				lineSegment.dataset.type = 'segment';
				lineSegment.dataset.start = `${lineStartIndex}`;
				lineSegment.dataset.end = `${lineEndIndex}`;
				lineSegment.dataset.length = `${lineLength}`;
				lineSegment.dataset.column = '0';

				if (line === '') {
					lineSegment.append(document.createElement('br'));
				} else {
					lineSegment.append(line)
				}
				lineElement.append(lineSegment);
				continue;
			}

			highlight.sort((a, b) => a.region.start.index - b.region.start.index);

			let column = 0;
			let index = lineStartIndex;
			for (const {type, region} of highlight) {
				if (region.start.column !== 0) {
					const start = index;
					const end = region.start.index;

					const lineSegment = document.createElement('span');
					lineSegment.dataset.type = 'segment';
					lineSegment.dataset.start = `${start}`;
					lineSegment.dataset.end = `${end}`;
					lineSegment.dataset.length = `${end - start}`;
					lineSegment.dataset.column = `${column}`;
					lineSegment.append(line.substring(column, region.start.column));
					lineElement.append(lineSegment);
				}

				const start = region.start.index;
				let end = region.end.index;
				if (region.end.column === line.length) {
					end++;
				}

				const lineSegment = document.createElement('span');
				lineSegment.dataset.type = 'segment';
				lineSegment.dataset.highlight = type;
				lineSegment.dataset.start = `${start}`;
				lineSegment.dataset.end = `${end}`;
				lineSegment.dataset.length = `${end - start}`;
				lineSegment.dataset.column = `${region.start.column}`;
				lineSegment.append(line.substring(region.start.column, region.end.column));
				lineElement.append(lineSegment);

				column = region.end.column;
				index = region.end.index;
			}
			if (column < line.length) {
				const text = line.substring(column);

				const lineSegment = document.createElement('span');
				lineSegment.dataset.type = 'segment';
				lineSegment.dataset.start = `${index}`;
				lineSegment.dataset.end = `${lineEndIndex}`;
				lineSegment.dataset.length = `${lineEndIndex - index}`;
				lineSegment.dataset.column = `${column}`;
				lineSegment.append(text);
				lineElement.append(lineSegment);
			}
		}
	}


	// cursor ======================================================
	#showCursor() {
		this.#cursor.hidden = true;
		this.#cursor.getBoundingClientRect();
		this.#cursor.hidden = false;
	}
	/**
	 * @param {DOMRect} rect
	 * @param {'left' | 'right'} [side='left']
	 */
	#setCursorWithRect(rect, side = 'left') {
		const parent = this.#textbox.getBoundingClientRect();
		const left = rect[side] - parent.left;
		const top = rect.top - parent.top;
		this.#cursor.style.left = `${left}px`;
		this.#cursor.style.top = `${top}px`;
		this.#showCursor();
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	#setCursorWithPoint(x, y) {
		const pos = document.caretPositionFromPoint(x, y);
		if (!pos || !this.#textbox.contains(pos.offsetNode)) {
			return;
		}

		if (pos.offsetNode instanceof Element) {
			this.#setCursorWithRect(pos.offsetNode.getBoundingClientRect());
			return;
		}

		const range = document.createRange();
		range.setStart(pos.offsetNode, pos.offset);
		const rect = range.getBoundingClientRect();
		this.#setCursorWithRect(rect);
	}
	/** @param {number} index */
	#getRangeFromIndex(index) {
		for (const line of this.#textbox.children) {
			const start = this.#getStart(line);
			const end = this.#getEnd(line);
			if (index < start || index >= end) {
				continue;
			}

			if (start + 1 === end) {
				const range = document.createRange();
				range.setStart(line, 0);
				return range;
			}

			for (const segment of line.children) {
				const start = this.#getStart(segment);
				const end = this.#getEnd(segment);
				if (index < start || index >= end) {
					continue;
				}

				const range = document.createRange();
				range.setStart( /** @type {Node} */ (segment.firstChild), index - start);
				return range;
			}
		}
		return null;
	}

	// dataset helpers =============================================
	/** @param {Node} node */
	#getColumn(node) {
		if (node instanceof Text) {
			const segment = node.parentElement;
			if (segment && segment.dataset.column) {
				return parseInt(segment.dataset.column);
			}
		}
		return 0;
	}
	/** @param {Node} node */
	#getStart(node) {
		if (node instanceof Text) {
			const segment = node.parentElement;
			if (segment && segment.dataset.start) {
				return parseInt(segment.dataset.start);
			}
		}
		if (node instanceof HTMLElement && node.dataset.start) {
			return parseInt(node.dataset.start);
		}
		return 0;
	}
	/** @param {Node} node */
	#getEnd(node) {
		if (node instanceof Text) {
			const segment = node.parentElement;
			if (segment && segment.dataset.end) {
				return parseInt(segment.dataset.end);
			}
		}
		if (node instanceof HTMLElement && node.dataset.end) {
			return parseInt(node.dataset.end);
		}
		return 0;
	}
	/** @param {Node} node */
	#getLine(node) {
		if (node instanceof Text) {
			return /** @type {HTMLElement} */ (node.parentElement?.parentElement);
		}
		return /** @type {HTMLElement} */ (node.parentElement);
	}
	/** @param {HTMLElement} element */
	#getLength(element) {
		if (element.dataset.length) {
			return parseInt(element.dataset.length);
		}
		return 0;
	}
}