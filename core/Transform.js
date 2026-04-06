/** @import {Layout} from './Layout.js' */
/** @import {RenderComponent} from './RenderComponent.js' */
import {Size, Edges, Vector, Rect, clamp} from './utils.js'
import {extractAttributeInfos} from './RenderComponent.js';


/**
 * Actual getter functions return the object direct. Changes of this object are reflected on the transform.
 * Functions with the `get` prefix return a new object which will not influence the transform.
 */
export class Transform {
	// attributes
	/** Includes padding */
	size$width = Size.fill();
	/** Includes padding */
	size$height = Size.fill();

	/** Includes padding */
	n$minWidth = 0;
	/** Includes padding */
	n$minHeight = 0;
	/** Includes padding */
	n$maxWidth = Number.MAX_VALUE;
	/** Includes padding */
	n$maxHeight = Number.MAX_VALUE;

	edges$padding = Edges.zero();
	edges$margin = Edges.zero();

	// layout
	/** @type {Layout} */
	layout;
	/** @param {Layout} layout */
	constructor(layout) {
		this.layout = layout;
	}

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
	/** @param {Layout} layout */
	addChild(layout) {
		const child = new Transform(layout);
		child.#parent = this;
		this.#children.push(child);
		return child;
	}
	
	// components corresponding to this transform
	/** @type {RenderComponent[]} */
	#components = [];
	/** @type {Array<{order: number, index: number}>} */
	#componentsOrder = [];
	/**
	 * @param {core.RenderComponentConstructor} Component
	 * @param {CanvasRenderingContext2D} ctx
	 */
	addComponent(Component, ctx) {
		const component = new Component(this, ctx);
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
	/** Position of the top left corner including margin and padding. */
	#overridePosition = false;
	#position = Vector.zero();
	#worldPosition = Vector.zero();
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
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	setPosition(x, y) {
		if (!this.#overridePosition) {
			this.#position.x = x;
			this.#position.y = y;
		}
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	overridePosition(x, y) {
		this.#overridePosition = true;
		this.#position.x = x;
		this.#position.y = y;
	}


	// sizes
	#paddingSize = Vector.zero();
	getContentSize() {
		return new Vector(
			this.#paddingSize.x - this.edges$padding.xaxis,
			this.#paddingSize.y - this.edges$padding.yaxis
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
			this.#paddingSize.x + this.edges$margin.xaxis,
			this.#paddingSize.y + this.edges$margin.yaxis
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

	reset() {
		this.#overridePosition = false;
		this.#hasWidth = false;
		this.#hasHeight = false;
	}

	/** @param {number} value */
	setContentWidth(value) {
		this.#hasWidth = true;
		this.#paddingSize.x = clamp(value + this.edges$padding.xaxis, this.n$minWidth, this.n$maxWidth);	
	}
	/** @param {number} value */
	setContentHeight(value) {
		this.#hasHeight = true;
		this.#paddingSize.y = clamp(value + this.edges$padding.yaxis, this.n$minHeight, this.n$maxHeight);	
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
		this.#paddingSize.x = clamp(value - this.edges$margin.xaxis, this.n$minWidth, this.n$maxWidth);
	}
	/** @param {number} value */
	setMarginHeight(value) {
		this.#hasHeight = true;
		this.#paddingSize.y = clamp(value - this.edges$margin.yaxis, this.n$minHeight, this.n$maxHeight);
	}

	getWorldContentRect() {
		const size = this.getContentSize();
		return new Rect(
			this.#worldPosition.x + this.edges$margin.left + this.edges$padding.left,
			this.#worldPosition.y + this.edges$margin.top + this.edges$padding.top,
			size.x,
			size.y
		)
	}
	getWorldPaddingRect() {
		return new Rect(
			this.#worldPosition.x + this.edges$margin.left,
			this.#worldPosition.y + this.edges$margin.top,
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

	init() {
		for (const component of this.#components) {
			component.init();
		}
		for (const child of this.#children) {
			child.init();
		}
	}
	render() {
		for (const {index} of this.#componentsOrder) {
			this.#components[index].render();
		}

		for (const child of this.#children) {
			child.render();
		}
	}
}

export const transformAttributeInfos = extractAttributeInfos(new Transform(/** @type {any} */ (null)));