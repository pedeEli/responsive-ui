/** @import {Component} from './Component.js' */
import {Size, Anchor, Edges, Vector, Rect, clamp} from '../utils.js'

/** @type {Component[]} */
const components = [];

export class Transform {
	s$width = Size.fill();
	s$height = Size.fill();

	n$minWidth = 0;
	n$minHeight = 0;
	n$maxWidth = Number.MAX_VALUE;
	n$maxHeight = Number.MAX_VALUE;

	a$anchor = Anchor.center();
	a$pivot = Anchor.center();

	e$padding = Edges.zero();
	e$margin = Edges.zero();

	/** @type {Transform[]} */
	#children = [];
	/** @type {null | Transform} */
	#parent = null;

	/** Position of the top left corner including margin and padding. */
	#position = new Vector(0, 0);
	#worldPosition = new Vector(0, 0);

	/** The size with padding and without margin. */
	#paddingSize = new Vector(0, 0);

	#hasWidth = false;
	#hasHeight = false;
	/**
	 * Position of the top left corner including margin and padding.
	 * @type {null | Vector}
	 */
	#overridePosition = null;

	/** @type {Layout | null} */
	#layout = null;

	get contentSize() {
		return new Vector(
			this.#paddingSize.x - this.e$padding.xaxis,
			this.#paddingSize.y - this.e$padding.yaxis
		);
	}
	get paddingSize() {
		return this.#paddingSize
	}
	get marginSize() {
		return new Vector(
			this.#paddingSize.x + this.e$margin.xaxis,
			this.#paddingSize.y + this.e$margin.yaxis
		);
	}

	get worldMarginRect() {
		return new Rect(
			this.#worldPosition.x,
			this.#worldPosition.y,
			this.marginSize.x,
			this.marginSize.y
		);
	}
	get worldPaddingRect() {
		return new Rect(
			this.#worldPosition.x + this.e$margin.left,
			this.#worldPosition.y + this.e$margin.top,
			this.paddingSize.x,
			this.paddingSize.y
		);
	}
	get worldContentRect() {
		return new Rect(
			this.#worldPosition.x + this.e$margin.left + this.e$padding.left,
			this.#worldPosition.y + this.e$margin.top + this.e$padding.top,
			this.contentSize.x,
			this.contentSize.y
		);
	}

	/** @returns {ReadonlyArray<Transform>} */
	get children() {
		return this.#children;
	}
	get parent() {
		return this.#parent;
	}

	createTransform() {
		const t = new Transform();
		t.#parent = this;
		this.#children.push(t);
		return t;
	}
	/**
	 * @template {Component} C
	 * @template {any[]} Args
	 * @param {{ new(transform: Transform, ...args: Args): C }} component
	 * @param {Args} args
	 */
	addComponent(component, ...args) {
		const c = new component(this, ...args);
		components.push(c);
		return c;
	}

	/** @param {null | Layout} value */
	set layout(value) {
		this.#layout = value;
	}
	get layout() {
		return this.#layout;
	}

	/**
	 * Position of the top left corner including margin and padding.
	 * @param {Vector} value
	 */
	set overridePosition(value) {
		this.#overridePosition = value;
	}

	hasWidth() {
		return this.#hasWidth;
	}
	hasHeight() {
		return this.#hasHeight;
	}

	/**
	 * Sets the width including padding applying min and max width
	 * @param {number} value
	 */
	setWidth(value) {
			this.#hasWidth = true;
			this.#paddingSize.x = clamp(value, this.n$minWidth, this.n$maxWidth);
	}
	/** 
	 * Sets the height including padding applying min and max height
	 * @param {number} value
	 */
	setHeight(value) {
		this.#hasHeight = true;
		this.#paddingSize.y = clamp(value, this.n$minHeight, this.n$maxHeight);
	}

	resetSize() {
		this.#hasWidth = false;
		this.#hasHeight = false;
		this.#overridePosition = null;
	}

	/** @param {Transform} parent */
	computePosition(parent) {
		if (this.#overridePosition) {
			this.#position = this.#overridePosition;
			return
		}
		const anchorX = this.a$anchor.x * parent.contentSize.x;
		const anchorY = this.a$anchor.y * parent.contentSize.y;

		const pivotX = this.a$pivot.x * this.marginSize.x;
		const pivotY = this.a$pivot.y * this.marginSize.y;

		this.#position.x = anchorX - pivotX;
		this.#position.y = anchorY - pivotY;
	}

	get worldContentOrigin() {
		return new Vector(
			this.#worldPosition.x + this.e$margin.left + this.e$padding.left,
			this.#worldPosition.y + this.e$margin.top + this.e$padding.top
		);
	}

	computeWorldPosition() {
		if (this.#parent) {
			this.#worldPosition.x = this.#parent.worldContentOrigin.x + this.#position.x;
			this.#worldPosition.y = this.#parent.worldContentOrigin.y + this.#position.y;
		} else {
			this.#worldPosition.x = this.#position.x;
			this.#worldPosition.y = this.#position.y;
		}
	}

	/** @param {CanvasRenderingContext2D} ctx */
	static renderComponents(ctx) {
		for (const component of components) {
			component.render(ctx);
		}
	}
}