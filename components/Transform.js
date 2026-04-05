/** @import {Component} from './Component.js' */
import {Size, Anchor, Edges, Vector, Rect, clamp} from '../utils.js'


/**
 * Actual getter functions return the object direct. Changes of this object are reflected on the transform.
 * Functions with the `get` prefix return a new object which will not influence the transform.
 */
export class Transform {
	// attributes
	/** Includes padding */
	s$width = Size.fill();
	/** Includes padding */
	s$height = Size.fill();

	/** Includes padding */
	n$minWidth = 0;
	/** Includes padding */
	n$minHeight = 0;
	/** Includes padding */
	n$maxWidth = Number.MAX_VALUE;
	/** Includes padding */
	n$maxHeight = Number.MAX_VALUE;

	e$padding = Edges.zero();
	e$margin = Edges.zero();

	a$anchor = Anchor.center();
	a$pivot = Anchor.center();

	// transforms are stored in a tree structure
	/** @type {Transform | null} */
	#parent = null;
	/** @type {Transform[]} */
	#children = [];
	/** @returns {ReadonlyArray<Transform>} */
	get children() {
		return this.#children;
	}
	get parent() {
		return this.#parent;
	}
	addChild() {
		const child = new Transform();
		child.#parent = this;
		this.#children.push(child);
		return child;
	}
	
	// components corresponding to this transform
	/** @type {Component[]} */
	#components = [];
	/** @type {Array<{order: number, index: number}>} */
	#componentsOrder = [];
	/**
	 * @template {Component} TComponent
	 * @template {any[]} Args
	 * @param {ComponentConstructor<TComponent, Args>} Component
	 * @param {Args} args
	 */
	addComponent(Component, ...args) {
		const component = new Component(this, ...args);
		const index = this.#components.length;
		this.#components.push(component);
		for (let i = 0; i < this.#componentsOrder.length; i++) {
			if (Component.order <= this.#componentsOrder[i].order) {
				this.#componentsOrder.splice(i, 0, {index, order: Component.order});
				return component;
			}
		}
		this.#componentsOrder.push({index, order: Component.order});
		return component;
	}

	// positioning
	#position = Vector.zero();
	#worldPosition = Vector.zero();
	/** Position of the top left corner including margin and padding. */
	get position() {
		return this.#position;
	}
	computeWorldPosition() {
		if (this.#parent) {
			const rect = this.#parent.getWorldContentRect();
			this.#worldPosition.x = rect.x + this.#position.x;
			this.#worldPosition.y = rect.y + this.#position.y;
		} else {
			this.#worldPosition.x = this.#position.x;
			this.#worldPosition.y = this.#position.y;
		}
	}

	// sizes
	#paddingSize = Vector.zero();
	getContentSize() {
		return new Vector(
			this.#paddingSize.x - this.e$padding.xaxis,
			this.#paddingSize.y - this.e$padding.yaxis
		);
	}
	getPaddingSize() {
		return new Vector(
			this.#paddingSize.x,
			this.#paddingSize.y
		);
	}
	getMarginSize() {
		return new Vector(
			this.#paddingSize.x + this.e$margin.xaxis,
			this.#paddingSize.y + this.e$margin.yaxis
		);
	}

	#hasWidth = false;
	#hasHeight = false;
	hasWidth() {
		return this.#hasWidth;
	}
	hasHeight() {
		return this.#hasHeight;
	}
	resetSize() {
		this.#hasWidth = false;
		this.#hasHeight = false;
	}

	/** @param {number} value */
	setContentWidth(value) {
		this.#hasWidth = true;
		this.#paddingSize.x = clamp(value + this.e$padding.xaxis, this.n$minWidth, this.n$maxWidth);	
	}
	/** @param {number} value */
	setContentHeight(value) {
		this.#hasHeight = true;
		this.#paddingSize.y = clamp(value + this.e$padding.yaxis, this.n$minHeight, this.n$maxHeight);	
	}
	/** @param {number} value */
	setPaddingWidth(value) {
		this.#hasWidth = true;
		this.#paddingSize.x = clamp(value, this.n$minWidth, this.n$maxWidth);
	}
	/** @param {number} value */
	setPaddingHeight(value) {
		this.#hasHeight = true;
		this.#paddingSize.y = clamp(value, this.n$minHeight, this.n$maxHeight);
	}
	/** @param {number} value */
	setMarginWidth(value) {
		this.#hasWidth = true;
		this.#paddingSize.x = clamp(value - this.e$margin.xaxis, this.n$minWidth, this.n$maxWidth);
	}
	/** @param {number} value */
	setMarginHeight(value) {
		this.#hasHeight = true;
		this.#paddingSize.y = clamp(value - this.e$margin.yaxis, this.n$minHeight, this.n$maxHeight);
	}

	getWorldContentRect() {
		const size = this.getContentSize();
		return new Rect(
			this.#worldPosition.x + this.e$margin.left + this.e$padding.left,
			this.#worldPosition.y + this.e$margin.top + this.e$padding.top,
			size.x,
			size.y
		)
	}
	getWorldPaddingRect() {
		return new Rect(
			this.#worldPosition.x + this.e$margin.left,
			this.#worldPosition.y + this.e$margin.top,
			this.#paddingSize.x,
			this.#paddingSize.y
		);
	}
	getWorldMarginRect() {
		const size = this.getMarginSize();
		return new Rect(
			this.#worldPosition.x,
			this.#worldPosition.y,
			size.x,
			size.y
		);
	}

	// layout
	/** @type {null | Layout} */
	#layout = null;
	/** @param {null | Layout} value */
	set layout(value) {
		this.#layout = value;
	}
	get layout() {
		return this.#layout;
	}

	/** @param {CanvasRenderingContext2D} ctx */
	render(ctx) {
		for (const {index} of this.#componentsOrder) {
			this.#components[index].render(ctx);
		}

		for (const child of this.#children) {
			child.render(ctx);
		}
	}
}