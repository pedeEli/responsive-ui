export class Splitpanel {
	/** @type {HTMLElement} */
	#root;
	/** @type {HTMLElement} */
	#left;
	/** @type {HTMLElement} */
	#right;
	/** @type {HTMLElement} */
	#divider;
	/** @type {HTMLElement} */
	#switch;
	/** @type {HTMLElement} */
	#switchInput;
	/** @type {HTMLElement} */
	#switchOutput;
	/** @type {HTMLInputElement} */
	#switchCheckbox;

	#pointerdown = false;
	
	/**
	 * @param {HTMLElement} root
	 * @param {HTMLElement} left
	 * @param {HTMLElement} right
	*/
	constructor(root, left, right) {
		this.#root = root;
		this.#root.classList.add('splitpanel');
		
		this.#left = left;
		this.#left.classList.add('panel', 'left');
		this.#right = right;
		this.#right.classList.add('panel', 'right');

		this.#divider = document.createElement('div');
		this.#divider.classList.add('divider');
		this.#divider.addEventListener('pointerdown', this.#pointerdownHandle.bind(this));
		this.#divider.addEventListener('scroll', event => event.preventDefault());

		this.#switch = document.createElement('label');
		this.#switch.classList.add('switch');
		this.#switchCheckbox = document.createElement('input');
		this.#switchCheckbox.classList.add('checkbox');
		this.#switchCheckbox.type = 'checkbox';
		this.#switchCheckbox.addEventListener('input', this.#switchHandle.bind(this));
		this.#switchInput = document.createElement('span');
		this.#switchInput.textContent = 'input';
		this.#switchInput.ariaCurrent = 'true';
		this.#switchOutput = document.createElement('span');
		this.#switchOutput.textContent = 'output';
		this.#switchOutput.ariaCurrent = 'false';
		this.#switch.append(this.#switchInput, this.#switchCheckbox, this.#switchOutput);

		window.addEventListener('pointerup', this.#pointerupHandle.bind(this));
		window.addEventListener('pointermove', this.#pointermoveHandle.bind(this));

		this.#root.replaceChildren(this.#left, this.#divider, this.#switch, this.#right);
	}

	/** @param {PointerEvent} event */
	#pointerdownHandle(event) {
		event.preventDefault();
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
		const v = event.x - rect.x;
		this.#root.style.setProperty('--grid-template-columns', `${v}fr auto ${rect.width - v}fr`);
	}
	#switchHandle() {
		this.#switchInput.ariaCurrent = `${!this.#switchCheckbox.checked}`;
		this.#switchOutput.ariaCurrent = `${this.#switchCheckbox.checked}`;
	}
}