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
		transform.setPaddingWidth(width);
		transform.setPaddingHeight(height);
		this.setDirty();
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	resize(width, height) {
		this.transform.setPaddingWidth(width);
		this.transform.setPaddingHeight(height);
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
				node.setPaddingWidth(node.s$width.value);
			} else if (node.s$width.isPercent() && parent.hasWidth()) {
				node.setPaddingWidth((parent.getContentSize().x - node.e$margin.xaxis) * node.s$width.value)
			}
		}
		if (!node.hasHeight()) {
			if (node.s$height.isFixed()) {
				node.setPaddingHeight(node.s$height.value);
			} else if (node.s$height.isPercent() && parent.hasHeight()) {
				node.setPaddingHeight((parent.getContentSize().y - node.e$margin.yaxis) * node.s$height.value);
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

				const marginSize = child.getMarginSize();
				width = Math.max(width, child.hasWidth() ? marginSize.x : child.n$minWidth);
				height = Math.max(height, child.hasHeight() ? marginSize.y : child.n$minHeight);
				if (child.hasWidth()) {
					hasWidth = true;
				}
				if (child.hasHeight()) {
					hasHeight = true;
				}
			}

			if (node.s$width.isAuto() && hasWidth) {
				node.setContentWidth(width);
			}
			if (node.s$height.isAuto() && hasHeight) {
				node.setContentHeight(height);
			}
		}
	}
	/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	static #resolveCyclicSize(node, parent) {
		if (!node.hasWidth()) {
			if (node.s$width.isAuto()) {
				node.setContentWidth(0);
			} else if (node.s$width.isPercent()) {
				node.setPaddingWidth((parent.getContentSize().x - node.e$margin.xaxis) * node.s$width.value);
			}
		}
		if (!node.hasHeight()) {
			if (node.s$height.isAuto()) {
				node.setContentHeight(0);
			} else if (node.s$height.isPercent()) {
				node.setPaddingHeight((parent.getContentSize().y - node.e$margin.yaxis) * node.s$height.value);
			}
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
		if (!node.layout) {
			const parentSize = parent.getContentSize();
			const anchorX = node.a$anchor.x * parentSize.x;
			const anchorY = node.a$anchor.y * parentSize.y;
	
			const marginSize = node.getMarginSize();
			const pivotX = node.a$pivot.x * marginSize.x;
			const pivotY = node.a$pivot.y * marginSize.y;
	
			node.position.x = anchorX - pivotX;
			node.position.y = anchorY - pivotY;
		}

		node.computeWorldPosition();
		for (const child of node.children) {
			Canvas.#resolvePosition(child, node);
		}
	}
}
Canvas.order = 0;