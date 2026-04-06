/** @import {Transform} from './Transform.js' */

export class Component {
	/** @type {Transform} */
	#transform

	/** @param {Transform} transform */
	constructor(transform) {
		this.#transform = transform;
	}

	get transform() {
		return this.#transform;
	}
}