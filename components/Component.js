/** @import {Transform} from './Transform.js' */
export {registerComponent} from '../parser/attributes.js'

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

	createTransform() {
		return this.#transform.createTransform();
	}

	/** @param {CanvasRenderingContext2D} ctx */
	init(ctx) {}
	/** @param {CanvasRenderingContext2D} ctx */
	render(ctx) {}
}