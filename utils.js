import {registerParser} from './parser/attributes.js'

/**
 * @template V
 * @param {V} v
 * @returns {Result<V, any>}
 */
export function result(v) {
	return {
		success: true,
		v,
	};
}

/**
 * @template [E=string]
 * @param {E} e
 * @returns {Result<any, E>}
 */
export function error(e) {
	return {
		success: false,
		e,
	};
}

/**
 * @param {string} str
 * @returns {Result<number>}
 */
export function parseNumber(str) {
	if (/^0|-?([1-9][0-9]*(\.[0-9]*[1-9])?|[0-9]?\.[0-9]*[1-9])$/.test(str)) {
		return result(parseFloat(str));
	}
	return error('invalid number');
}
registerParser('n', parseNumber);

export class Size {
	/** @type {'fixed' | 'auto' | 'percent'} */
	type = 'fixed';
	value = 0;

	isFixed() {
		return this.type === 'fixed';
	}
	isAuto() {
		return this.type === 'auto';
	}
	isPercent() {
		return this.type === 'percent';
	}

	static auto() {
		const size = new Size();
		size.type = 'auto';
		return size;
	}
	static fill() {
		const size = new Size();
		size.type = 'percent';
		size.value = 1;
		return size;
	}
	/** @param {number} value */
	static fixed(value) {
		const size = new Size();
		size.type = 'fixed';
		size.value = value;
		return size;
	}
	/** @param {number} value */
	static percent(value) {
		const size = new Size();
		size.type = 'percent';
		size.value = value;
		return size;
	}

	/**
	 * @param {string} str
	 * @returns {Result<Size>}
	 */
	static parse(str) {
		str = str.toLowerCase();
		if (str === 'auto') {
			return result(Size.auto());
		}
		if (str === 'fill') {
			return result(Size.fill());
		}
		if (str.endsWith('%')) {
			const v = parseNumber(str.slice(0, -1));
			if (!v.success) {
				return v;
			}
			return result(Size.percent(v.v / 100));
		}
		if (str.endsWith('px')) {
			const v = parseNumber(str.slice(0, -2));
			if (!v.success) {
				return v;
			}
			return result(Size.fixed(v.v));
		}
		return error('unknown size unit');
	}
}
registerParser('s', Size.parse);

export class Vector {
	x = 0;
	y = 0;

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	/**
	 * @param {string} str
	 * @returns {Result<Vector>}
	 */
	static parse(str) {
		const [a, b = ''] = str.trim().split(/\s+/);
		if (a === '') {
			return error('empty vector');
		}
		const av = parseNumber(a);
		if (!av.success) {
			return error(`invalid vector: ${av.e}`);
		}
		if (b === '') {
			return result(new Vector(av.v, av.v));
		}
		const bv = parseNumber(b);
		if (!bv.success) {
			return error(`invalid vector: ${bv.e}`);
		}
		return result(new Vector(av.v, bv.v));
	}
}
registerParser('v', Size.parse);

export const Anchor = Object.freeze({
	center: () => new Vector(0.5, 0.5),
	topleft: () => new Vector(0, 0),
	topright: () => new Vector(1, 0),
	bottomleft: () => new Vector(0, 1),
	bottomright: () => new Vector(1, 1),
	top: () => new Vector(0.5, 0),
	bottom: () => new Vector(0.5, 1),
	left: () => new Vector(0, 0.5),
	right: () => new Vector(1, 0.5)
});
/**
 * @param {string} str
 * @returns {Result<Vector>}
 */
export function parseAnchor(str) {
	if (str in Anchor) {
		return result(Anchor[/** @type {keyof typeof Anchor} */ (str)]());
	}
	return Vector.parse(str);
}
registerParser('a', parseAnchor);

export class Edges {
	top = 0;
	right = 0;
	bottom = 0;
	left = 0;

	/**
	 * @param {number} top
	 * @param {number} right
	 * @param {number} bottom
	 * @param {number} left
	 */
	constructor(top, right, bottom, left) {
		this.top = top;
		this.right = right;
		this.bottom = bottom;
		this.left = left;
	}

	get xaxis() {
		return this.left + this.right;
	}
	get yaxis() {
		return this.top + this.bottom;
	}

	static zero() {
		return new Edges(0, 0, 0, 0);
	}

	/**
	 * @param {string} str
	 * @returns {Result<Edges>}
	 */
	static parse(str) {
		const parts = str.trim().split(/\s+/);
		if (parts.length === 1) {
			const v = parseNumber(parts[0]);
			return v.success ? result(new Edges(v.v, v.v, v.v, v.v)) : error(`invalid edges: ${v.e}`);
		} else if (parts.length === 2) {
			const x = parseNumber(parts[0]);
			const y = parseNumber(parts[1]);
			return !x.success ?
				error(`invalid edges: ${x.e}`) :
				!y.success ?
					error(`invalied edges: ${y.e}`) :
					result(new Edges(y.v, x.v, y.v, x.v));
		} else if (parts.length === 4) {
			const t = parseNumber(parts[0]);
			const r = parseNumber(parts[1]);
			const b = parseNumber(parts[2]);
			const l = parseNumber(parts[3]);
			if (!t.success || !r.success || !b.success || !l.success) {
				let e = '';
				for (const v of [t, r, b, l]) {
					if (!v.success) {
						e = v.e;
						break;	
					}
				}
				return error(`invalid edges: ${e}`);
			}
			return result(new Edges(t.v, r.v, b.v, l.v));
		}
		return error('invalid edges');
	}
}
registerParser('e', Edges.parse);

export class Rect {
	x = 0;
	y = 0;
	width = 0;
	height = 0;

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}

	get top() { return this.y; }
	get left() { return this.x; }
	get right() { return this.x + this.width; }
	get bottom() { return this.y + this.height; }
}

/**
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
export function clamp(v, min, max) {
	return Math.max(min, Math.min(v, max));
}