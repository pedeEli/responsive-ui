export class Splitpanel {
	/** @type {HTMLElement} */
	#root;
	/** @type {HTMLElement} */
	#first;
	/** @type {HTMLElement} */
	#last;
	/** @type {HTMLElement} */
	#divider;

	#pointerdown = false;
	/** @type {'row' | 'column'} */
	#direction = 'column';

	#rowTemplate = '1fr auto 1fr';
	#columnTemplate = '1fr auto 1fr';
	
	/**
	 * @param {HTMLElement} root
	 * @param {HTMLElement} first
	 * @param {HTMLElement} last
	*/
	constructor(root, first, last) {
		this.#root = root;
		this.#root.classList.add('splitpanel');
		this.#root.dataset.direction = this.#direction;
		
		this.#first = first;
		this.#last = last;

		this.#divider = document.createElement('div');
		this.#divider.classList.add('divider');
		this.#divider.addEventListener('pointerdown', this.#pointerdownHandle.bind(this));
		this.#divider.addEventListener('scroll', event => event.preventDefault());

		window.addEventListener('pointerup', this.#pointerupHandle.bind(this));
		window.addEventListener('pointermove', this.#pointermoveHandle.bind(this));

		this.#appendElements();
		this.#setTemplateStr();

		new ResizeObserver(this.#resizeHandle.bind(this)).observe(this.#root);
	}

	#setTemplateStr() {
		if (this.#direction === 'row') {
			this.#root.style.gridTemplateColumns = this.#rowTemplate;
			this.#root.style.gridTemplateRows = '1fr';
		} else {
			this.#root.style.gridTemplateColumns = '1fr';
			this.#root.style.gridTemplateRows = this.#columnTemplate;
		}
	}

	#appendElements() {
		if (this.#direction === 'row') {
			this.#root.replaceChildren(this.#first, this.#divider, this.#last);
		} else {
			this.#root.replaceChildren(this.#last, this.#divider, this.#first);
		}
	}

	/** @param {'row' | 'column'} value */
	set direction(value) {
		if (this.#direction === value) {
			return;
		}

		this.#root.dataset.direction = value;
		this.#direction = value;
		this.#appendElements();
		this.#setTemplateStr();
	}

	/** @param {PointerEvent} event */
	#pointerdownHandle(event) {
		event.preventDefault();
		this.#root.style.cursor = this.#direction === 'row' ? 'w-resize' : 'n-resize';
		this.#pointerdown = true;
	}
	#pointerupHandle() {
		this.#root.style.cursor = 'auto';
		this.#pointerdown = false;
	}
	/** @param {PointerEvent} event */
	#pointermoveHandle(event) {
		if (!this.#pointerdown) {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();

		const rect = this.#root.getBoundingClientRect();
		const size = this.#direction === 'row' ? rect.width : rect.height;
		const key = this.#direction === 'row' ? 'x' : 'y';
		const v = event[key] - rect[key];
		const str = `${v}fr auto ${size - v}fr`;
		if (this.#direction === 'row') {
			this.#rowTemplate = str;
			this.#root.style.gridTemplateColumns = str;
		} else {
			this.#columnTemplate = str;
			this.#root.style.gridTemplateRows = str;
		}
	}
	/** @param {ResizeObserverEntry[]} entries */
	#resizeHandle([entry]) {
		if (entry.contentRect.width < 500) {
			this.direction = 'column';
		} else {
			this.direction = 'row';
		}
	}
}