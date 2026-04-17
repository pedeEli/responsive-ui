export class Textarea {
		/** @type {HTMLElement} */
	#root;
	/** @type {HTMLElement} */
	#textbox;
	/** @type {HTMLElement} */
	#lineNumbers;
	/** @type {HTMLElement} */
	#cursor;

	#focused = false;
	#pointerdown = false;

	/** @type {null | number} */
	#storedColumn = null;

	#value = '';

	/** @type {null | ((value: string) => void)} */
	onchange = null;

	/** @param {HTMLElement} root */
	constructor(root) {
		this.#root = root;
		this.#root.classList.add('textarea');

		this.#lineNumbers = document.createElement('div');
		this.#lineNumbers.classList.add('line-numbers');
		this.#root.append(this.#lineNumbers);

		this.#textbox = document.createElement('div');
		this.#textbox.classList.add('textbox');
		this.#textbox.role = 'textbox';
		// this.#textbox.addEventListener('paste', this.#pasteHandle.bind(this));
		this.#root.append(this.#textbox);

		this.#cursor = document.createElement('div');
		this.#cursor.classList.add('cursor');
		this.#cursor.ariaHidden = 'true';
		this.#cursor.hidden = true;
		this.#root.append(this.#cursor);

		window.addEventListener('pointerdown', this.#pointerdownHandle.bind(this));
		window.addEventListener('pointerup', this.#pointerupHandle.bind(this));
		window.addEventListener('pointermove', this.#pointermoveHandle.bind(this));
		window.addEventListener('keydown', this.#keydownHandle_CursorPosition.bind(this));
		window.addEventListener('keydown', this.#keydownHandle_ValueModification.bind(this));
	}

	/** @param {string} text */
	set value(text) {
		this.#value = text;

		this.#textbox.replaceChildren();
		this.#lineNumbers.replaceChildren();

		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const lineNumber = document.createElement('div');
			lineNumber.append(`${i + 1}`);
			this.#lineNumbers.append(lineNumber);
		}

		for (const line of lines) {
			const element = document.createElement('div');
			element.append(line === '' ? document.createElement('br') : line);
			this.#textbox.append(element);
		}

		this.onchange?.(text);

		for (let i = 0; i < text.length; i++) {
			const range = this.#getRangeFromIndex(i);
			if (range) {
				const index = this.#getIndex(range.startContainer, range.startOffset);
				if (i !== index) {
					debugger
				}
			}
		}
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
					
					this.#storedColumn ??= this.#getColumn(range.startContainer, range.startOffset);
					selection.modify(alter, 'backward', 'lineboundary');
					
					const line = this.#getLineNode(range.startContainer)?.previousElementSibling;
					if (!(line instanceof HTMLElement)) {
						break;
					}
	
					selection.modify(alter, 'backward', 'character');
					
					const length = line.textContent.length;
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
					
					const line = this.#getLineNode(range.startContainer)?.nextElementSibling;
					if (!(line instanceof HTMLElement)) {
						break;
					}
	
					selection.modify(alter, 'forward', 'character');
					
					const length = line.textContent.length;
					for (let i = 0; i < Math.min(length, this.#storedColumn); i++) {
						selection.modify(alter, 'forward', 'character');
					}
				}
				break;
		}

		if (selection.focusNode instanceof Element) {
			this.#setCursorWithRect(selection.focusNode.getBoundingClientRect());
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

		const isRemoveChar = event.key === 'Backspace' || event.key === 'Delete';
		if (event.key.length !== 1 && !isRemoveChar && event.key !== 'Enter') {
			return;
		}

		if (event.ctrlKey && !isRemoveChar) {
			return;
		}

		event.stopImmediatePropagation();
		event.preventDefault();

		const selection = window.getSelection();
		if (!selection) {
			return;
		}

		if (selection.type === 'Caret' && isRemoveChar) {
			const range = selection.getRangeAt(0);
			const index = this.#getIndex(range.startContainer, range.startOffset);
			if (
				event.key === 'Backspace' && index === 0 ||
				event.key === 'Delete' && index === this.#value.length
			) {
				return;
			}

			const direction = event.key === 'Backspace' ? 'backward' : 'forward';
			const granularity = event.ctrlKey ? 'word' : 'character';
			selection.modify('extend', direction, granularity);
		}
		
		this.#deleteSelection(selection);

		if (isRemoveChar) {
			return;
		}

		const range = selection.getRangeAt(0);
		let index = this.#getIndex(range.startContainer, range.startOffset);
		const char = event.key === 'Enter' ? '\n' : event.key;
		this.value = this.#value.substring(0, index) + char + this.#value.substring(index);

		this.#setCursorWithIndex(selection, index + 1);
	}

	// modification
	/**
	 * @param {number} line
	 * @param {number} start
	 * @param {number} end
	 * @param {string} cls
	 */
	addModification(line, start, end, cls) {
		if (line < 0 || line >= this.#textbox.children.length || start >= end) {
			return;
		}

		let currentIndex = 0;
		for (let i = 0; i < this.#textbox.children.length; i++) {
			const lineElement = /** @type {Element} */ (this.#textbox.children.item(i));
			if (i < line) {
				currentIndex += lineElement.textContent.length + 1;
				continue;
			}

			if (end > lineElement.textContent.length) {
				return;
			}

			const range = document.createRange();
			let iter = document.createNodeIterator(lineElement, NodeFilter.SHOW_TEXT);
			let node = iter.nextNode();
			let column = 0;
			while (node) {
				const s = column;
				let e = column + /** @type {Text} */ (node).textContent.length;
				const nextNode = iter.nextNode();
				if (!nextNode) {
					e++;
				}
				
				if (start >= s && start < e) {
					range.setStart(node, start - s);
				}
				if (end >= s && end < e) {
					range.setEnd(node, end - s);
				}

				column = e;
				node = nextNode;
			}

			if (range.startContainer === document || range.endContainer === document) {
				return;
			}

			const wrapper = document.createElement('span');
			wrapper.classList.add(cls);
			try {
				range.surroundContents(wrapper);
			} catch {
				wrapper.append(range.extractContents());
				range.insertNode(wrapper);
			}

			iter = document.createNodeIterator(lineElement, NodeFilter.SHOW_TEXT);
			node = iter.nextNode();
			while (node) {
				if (/** @type {Text} */ (node).textContent.length === 0) {
					/** @type {Text} */ (node).remove();
				}
				node = iter.nextNode();
			}

			return;
		}

	}

	// cursor utils
	#showCursor() {
		this.#cursor.hidden = true;
		this.#cursor.getBoundingClientRect();
		this.#cursor.hidden = false;
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
	/**
	 * @param {DOMRect} rect
	 * @param {'left' | 'right'} [side='left']
	 */
	#setCursorWithRect(rect, side = 'left') {
		const parent = this.#root.getBoundingClientRect();
		const left = rect[side] - parent.left;
		const top = rect.top - parent.top;
		this.#cursor.style.left = `${left}px`;
		this.#cursor.style.top = `${top}px`;
		this.#showCursor();
	}
	/** 
	 * @param {number} index
	 * @param {Selection} selection
	 */
	#setCursorWithIndex(selection, index) {
		const range = this.#getRangeFromIndex(index);
		if (!range) {
			return;
		}
		if (range.startContainer instanceof Element) {
			this.#setCursorWithRect(range.startContainer.getBoundingClientRect());
		} else {
			this.#setCursorWithRect(range.getBoundingClientRect());
		}
		selection.removeAllRanges();
		selection.addRange(range);
	}
	/** @param {number} index */
	#getRangeFromIndex(index) {
		let currentIndex = 0;
		for (const line of this.#textbox.children) {
			const start = currentIndex;
			const end = currentIndex + line.textContent.length + 1;
			if (index < start || index >= end) {
				currentIndex = end;
				continue;
			}

			if (line.textContent === '') {
				const range = document.createRange();
				range.setStart(line, 0);
				return range;
			}

			const iter = document.createNodeIterator(line, NodeFilter.SHOW_TEXT);
			let currentNode = iter.nextNode();
			while (currentNode) {
				const node = /** @type {Text} */ (currentNode);
				const start = currentIndex;
				let end = currentIndex + node.textContent.length;
				currentNode = iter.nextNode();
				if (!currentNode) {
					end++;
				}

				if (index < start || index >= end) {
					currentIndex = end;
					continue;
				}

				const range = document.createRange();
				range.setStart(node, index - start);
				return range;
			}
		}
		return null;
	}


	// utils
	/**
	 * @param {Node} node
	 * @param {number} offset
	 */
	#getColumn(node, offset = 0) {
		for (const line of this.#textbox.children) {
			if (!line.contains(node)) {
				continue;
			}

			let column = offset;
			const iter = document.createNodeIterator(line, NodeFilter.SHOW_TEXT);
			let currentNode = iter.nextNode();
			while (currentNode) {
				if (currentNode === node) {
					return column;
				}
				column += /** @type {Text} */ (currentNode).textContent.length;
				currentNode = iter.nextNode();
			}
		}

		return offset;
	}
	/** @param {Node} node */
	#getLineNode(node) {
		for (const line of this.#textbox.children) {
			if (line.contains(node)) {
				return line;
			}
		}
		return null;
	}
	/** @param {Selection} selection */
	#deleteSelection(selection) {
		if (selection.type === 'Caret') {
			return;
		}

		const range = selection.getRangeAt(0);
		const start = this.#getIndex(range.startContainer, range.startOffset);
		const end = this.#getIndex(range.endContainer, range.endOffset);
		this.value = this.#value.substring(0, start) + this.#value.substring(end);

		this.#setCursorWithIndex(selection, start);
	}
	/**
	 * @param {Node} node
	 * @param {number} [offset=0]
	 */
	#getIndex(node, offset = 0) {
		let index = offset;

		for (const line of this.#textbox.children) {
			if (!line.contains(node)) {
				index += line.textContent.length + 1;
				continue;
			}

			if (line === node) {
				return index;
			}

			const iter = document.createNodeIterator(line, NodeFilter.SHOW_TEXT);
			let currentNode = iter.nextNode();
			while (currentNode) {
				if (currentNode === node) {
					return index;
				}
				index += /** @type {Text} */ (currentNode).textContent.length;
				currentNode = iter.nextNode();
			}
		}

		return offset;
	}
}