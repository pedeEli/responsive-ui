import {Component, registerComponent} from './Component.js';

export class Text extends Component {
	text = '';
	textColor = 'black';
	n$fontSize = 20;
	/** @type {CanvasRenderingContext2D} */
	#ctx;
	#textHeight = 0;

	/** @param {CanvasRenderingContext2D} ctx */
	render(ctx) {
		const rect = this.transform.getWorldContentRect();
		ctx.font = `${this.n$fontSize}px system-ui`;
		ctx.fillStyle = this.textColor;
		ctx.fillText(this.text, rect.x, rect.y + this.#textHeight);
	}
	/** @param {CanvasRenderingContext2D} ctx */
	init(ctx) {
		this.#ctx = ctx;
		this.#computeSize();
	}

	#computeSize() {
		this.#ctx.font = `${this.n$fontSize}px system-ui`;
		const metrics = this.#ctx.measureText(this.text);
		this.#textHeight = metrics.actualBoundingBoxAscent;
		this.transform.n$minWidth = metrics.width + this.transform.e$padding.xaxis;
		this.transform.n$minHeight = metrics.actualBoundingBoxAscent + this.transform.e$padding.yaxis;
	}
}
Text.order = 3000;
registerComponent(Text);