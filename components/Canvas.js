/** @import {Transform} from './Transform.js' */
import {Component} from './Component.js'

export class Canvas extends Component {
	#dirty = false;

	/**
	 * @param {Transform} transform
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(transform, width, height) {
		super(transform);
		transform.setWidth(width);
		transform.setHeight(height);
		this.setDirty();
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	resize(width, height) {
		this.transform.setWidth(width);
		this.transform.setHeight(height);
		this.setDirty();
	}

	setDirty() {
		if (!this.#dirty) {
			this.#dirty = true;
			queueMicrotask(this.#layout.bind(this));
		}
	}

	#layout() {
		this.#dirty = false;

		Canvas.#resolveSize(this.transform, this.transform);
		Canvas.#resolveCyclicSize(this.transform, this.transform);
		Canvas.#resolvePosition(this.transform, this.transform);
	}

	/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	static #resolveSize(node, parent) {
		if (!node.hasWidth()) {
			if (node.s$width.isFixed()) {
				node.setWidth(node.s$width.value);
			} else if (node.s$width.isPercent() && parent.hasWidth()) {
				node.setWidth(parent.contentSize.x * node.s$width.value - node.e$margin.xaxis);
			}
		}
		if (!node.hasHeight()) {
			if (node.s$height.isFixed()) {
				node.setHeight(node.s$height.value);
			} else if (node.s$height.isPercent() && parent.hasHeight()) {
				node.setHeight(parent.contentSize.y * node.s$height.value - node.e$margin.yaxis);
			}
		}

		if (node.layout) {
			node.layout.resolveSize(node, Canvas.#resolveSize);
		} else {
			let width = 0;
			let height = 0;
			let hasWidth = false;
			let hasHeight = false;

			for (const child of node.children) {
				child.resetSize();
				Canvas.#resolveSize(child, node);
				width = Math.max(width, child.hasWidth() ? child.marginSize.x : child.n$minWidth);
				height = Math.max(height, child.hasHeight() ? child.marginSize.y : child.n$minHeight);
				if (child.hasWidth()) {
					hasWidth = true;
				}
				if (child.hasHeight()) {
					hasHeight = true;
				}
			}

			if (node.s$width.isAuto() && hasWidth) {
				node.setWidth(width + node.e$padding.xaxis);
			}
			if (node.s$height.isAuto() && hasHeight) {
				node.setHeight(height + node.e$padding.yaxis);
			}
		}
	}
	/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	static #resolveCyclicSize(node, parent) {
		if (!node.hasWidth()) {
			node.setWidth(parent.contentSize.x - node.e$margin.xaxis);
		}
		if (!node.hasHeight()) {
			node.setHeight(parent.contentSize.y - node.e$margin.yaxis);
		}

		for (const child of node.children) {
			Canvas.#resolveCyclicSize(child, node);
		}
	}
	/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	static #resolvePosition(node, parent) {
		node.computePosition(parent);
		node.computeWorldPosition();
		for (const child of node.children) {
			Canvas.#resolvePosition(child, node);
		}
	}
}