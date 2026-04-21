export class Textarea {
		/** @type {HTMLElement} */
	#root;
	/** @type {HTMLElement} */
	#textbox;
	/** @type {HTMLElement} */
	#lineNumbers;
	/** @type {HTMLElement} */
	#hovers;
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
		this.#textbox.tabIndex = 0;
		this.#textbox.contentEditable = 'true';
		this.#textbox.ariaMultiLine = 'true';
		this.#textbox.spellcheck = false;
		this.#textbox.autocapitalize = 'none';
		this.#textbox.autocorrect = false;
		this.#textbox.writingSuggestions = 'false';
		this.#textbox.translate = false;
		this.#textbox.ariaAutoComplete = 'list';
		this.#textbox.addEventListener('paste', this.#pasteHandle.bind(this));
		this.#textbox.addEventListener('copy', this.#copyHandle.bind(this));
		this.#textbox.addEventListener('cut', this.#cutHandle.bind(this));
		this.#root.append(this.#textbox);

		this.#cursor = document.createElement('div');
		this.#cursor.classList.add('cursor');
		this.#cursor.ariaHidden = 'true';
		this.#cursor.hidden = true;
		this.#root.append(this.#cursor);

		this.#hovers = document.createElement('div');
		this.#hovers.classList.add('hovers');
		this.#root.append(this.#hovers);

		window.addEventListener('pointerdown', this.#pointerdownHandle.bind(this));
		window.addEventListener('pointerup', this.#pointerupHandle.bind(this));
		window.addEventListener('pointermove', this.#pointermoveHandle.bind(this));
		window.addEventListener('keydown', this.#keydownHandle_CursorPosition.bind(this));
		window.addEventListener('keydown', this.#keydownHandle_ValueModification.bind(this));

		document.addEventListener('selectionchange', this.#selectionchangeHandle.bind(this));
	}

	/** @param {string} text */
	set value(text) {
		text = text.replaceAll(' ', '\u00a0');
		this.#value = text;

		this.#textbox.replaceChildren();
		this.#lineNumbers.replaceChildren();
		this.#hovers.replaceChildren();

		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const lineNumber = document.createElement('div');
			lineNumber.append(`${i + 1}`);
			this.#lineNumbers.append(lineNumber);
		}

		for (const line of lines) {
			const element = document.createElement('div');
			if (line !== '') {
				element.append(line + '\n');
			} else
				element.append(document.createElement('br'));
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

		if (!this.#textbox.contains(event.target)) {
			this.#cursor.hidden = true;
			this.#focused = false;
			return;
		}

		this.#pointerdown = true;
		this.#focused = true;
		this.#storedColumn = null;
		this.#showCursor();
	}
	#pointerupHandle() {
		this.#pointerdown = false;
	}
	#pointermoveHandle() {
		const selection = window.getSelection();
		if (this.#pointerdown && selection && selection.rangeCount !== 0) {
			this.#setCursorWithSelection(selection);
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
					
					const length = line.textContent.length - 1;
					for (let i = length; i > this.#storedColumn; i--) {
						selection.modify(alter, 'backward', 'character');
					}
				}
				break;
			case 'ArrowDown':
				{
					const range = selection.getRangeAt(0).cloneRange();
					range.collapse(selection.direction === 'backward');
					
					this.#storedColumn ??= this.#getColumn(range.startContainer, range.startOffset);
					selection.modify(alter, 'forward', 'lineboundary');
					
					const line = this.#getLineNode(range.startContainer)?.nextElementSibling;
					if (!(line instanceof HTMLElement)) {
						break;
					}
	
					selection.modify(alter, 'forward', 'character');
					
					const length = line.textContent.length - 1;
					for (let i = 0; i < Math.min(length, this.#storedColumn); i++) {
						selection.modify(alter, 'forward', 'character');
					}
				}
				break;
		}
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

		const cursorRange = this.#getRangeFromIndex(index + 1);
		if (cursorRange) {
			selection.removeAllRanges();
			selection.addRange(cursorRange);
		}
	}
	#selectionchangeHandle() {
		const selection = window.getSelection();
		if (selection) {
			this.#setCursorWithSelection(selection);
		}
	}
	/** @param {ClipboardEvent} event */
	#pasteHandle(event) {
		event.preventDefault();
		const selection = window.getSelection();
		const data = event.clipboardData?.getData('text');
		if (!data || !selection) {
			return;
		}

		this.#deleteSelection(selection);

		const range = selection.getRangeAt(0);
		let index = this.#getIndex(range.startContainer, range.startOffset);
		this.value = this.#value.substring(0, index) + data + this.#value.substring(index);

		const cursorRange = this.#getRangeFromIndex(index + data.length);
		if (cursorRange) {
			selection.removeAllRanges();
			selection.addRange(cursorRange);
		}
	}
	/** @param {ClipboardEvent} event */
	#copyHandle(event) {
		const selection = window.getSelection();
		if (selection && event.clipboardData) {
			const text = selection.toString();
			event.clipboardData.setData('text/plain', text);
			event.preventDefault();
		}
	}
	/** @param {ClipboardEvent} event */
	#cutHandle(event) {
		this.#copyHandle(event);

		const selection = window.getSelection();
		if (selection) {
			this.#deleteSelection(selection);
		}
	}

	// modification
	/**
	 * @param {number} lineIndex
	 * @param {number} columnStart
	 * @param {number} columnEnd
	 * @param {string} cls
	 */
	addModification(lineIndex, columnStart, columnEnd, cls) {
		const range = this.#getRange(lineIndex, columnStart, columnEnd);
		if (!range) {
			return;
		}

		const wrapper = this.#surroundRange(range);
		wrapper.classList.add(cls);
	}
	/**
	 * @param {number} lineIndex
	 * @param {number} columnStart
	 * @param {number} columnEnd
	 * @param {HTMLElement} popover
	 */
	addHover(lineIndex, columnStart, columnEnd, popover) {
		const range = this.#getRange(lineIndex, columnStart, columnEnd);
		if (!range) {
			return;
		}

		const wrapper = this.#surroundRange(range);

		popover.popover = 'hint';
		this.#hovers.append(popover);

		let timeout = 0;

		wrapper.addEventListener('pointerover', () => {
			clearTimeout(timeout);
			popover.showPopover({source: wrapper});
		});
		wrapper.addEventListener('pointerout', () => {
			timeout = setTimeout(() => popover.hidePopover(), 200);
		});
		popover.addEventListener('pointerover', () => {
			clearTimeout(timeout);
			popover.showPopover({source: wrapper});
		});
		popover.addEventListener('pointerout', () => {
			timeout = setTimeout(() => popover.hidePopover(), 200);
		});
	}

	// cursor utils
	#showCursor() {
		this.#cursor.hidden = true;
		this.#cursor.getBoundingClientRect();
		this.#cursor.hidden = false;
	}
	/** @param {Selection} selection */
	#setCursorWithSelection(selection) {
		const range = selection.getRangeAt(0);
		/** @type {Node} */
		let container;
		let offset = 0;
		if (selection.direction === 'forward') {
			container = range.endContainer;
			offset = range.endOffset;
		} else {
			container = range.startContainer;
			offset = range.startOffset;
		}

		if (container instanceof Element) {
			this.#setCursorWithRect(container.getBoundingClientRect());
			return;
		}

		const cursorRange = document.createRange();
		cursorRange.setStart(container, offset);
		const rect = cursorRange.getBoundingClientRect();
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
	/** @param {number} index */
	#getRangeFromIndex(index) {
		let currentIndex = 0;
		for (const line of this.#textbox.children) {
			const start = currentIndex;
			const end = currentIndex + (line.textContent.length === 0 ? 1 : line.textContent.length);
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

		const cursorRange = this.#getRangeFromIndex(start);
		if (cursorRange) {
			selection.removeAllRanges();
			selection.addRange(cursorRange);
		}
	}
	/**
	 * @param {Node} node
	 * @param {number} [offset=0]
	 */
	#getIndex(node, offset = 0) {
		let index = offset;

		for (const line of this.#textbox.children) {
			if (!line.contains(node)) {
				if (line.textContent.length === 0) {
					index++;
				} else {
					index += line.textContent.length;
				}
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
	/**
	 * @param {number} lineIndex
	 * @param {number} columnStart
	 * @param {number} columnEnd
	 * @returns {null | Range}
	 */
	#getRange(lineIndex, columnStart, columnEnd) {
		if (lineIndex < 0 || lineIndex >= this.#textbox.children.length || columnStart >= columnEnd) {
			return null;
		}

		let currentIndex = 0;
		for (let i = 0; i < this.#textbox.children.length; i++) {
			const line = /** @type {Element} */ (this.#textbox.children.item(i));
			if (i < lineIndex) {
				currentIndex += line.textContent.length;
				continue;
			}

			if (columnEnd > line.textContent.length) {
				return null;
			}

			const range = document.createRange();
			let iter = document.createNodeIterator(line, NodeFilter.SHOW_TEXT);
			let node = iter.nextNode();
			let column = 0;
			while (node) {
				const start = column;
				let end = column + /** @type {Text} */ (node).textContent.length;
				const nextNode = iter.nextNode();
				if (!nextNode) {
					end++;
				}
				
				if (columnStart >= start && columnStart < end) {
					range.setStart(node, columnStart - start);
				}
				if (columnEnd >= start && columnEnd < end) {
					range.setEnd(node, columnEnd - start);
				}

				column = end;
				node = nextNode;
			}

			if (range.startContainer === document || range.endContainer === document) {
				return null;
			}

			return range;
		}
		return null;
	}
	/** @param {Range} range */
	#surroundRange(range) {
		if (
			range.startContainer === range.endContainer &&
			range.startOffset === 0 &&
			range.endOffset === range.startContainer.textContent?.length
		) {
			return /** @type {HTMLElement} */ (range.startContainer.parentElement);
		}

		const wrapper = document.createElement('span');
		try {
			range.surroundContents(wrapper);
		} catch {
			wrapper.append(range.extractContents());
			range.insertNode(wrapper);
		}

		const iter = document.createNodeIterator(/** @type {Element} */ (wrapper.parentElement), NodeFilter.SHOW_TEXT);
		let node = iter.nextNode();
		while (node) {
			if (/** @type {Text} */ (node).textContent.length === 0) {
				/** @type {Text} */ (node).remove();
			}
			node = iter.nextNode();
		}

		return wrapper;
	}
}