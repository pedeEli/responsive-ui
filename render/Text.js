import {RenderComponent, registerRenderComponent} from '../core/RenderComponent.js';

export class Text extends RenderComponent {
	s$text = '';
	s$textColor = 'black';
	n$fontSize = 20;
	
	#textHeight = 0;

	render() {
		const rect = this.transform.getWorldContentRect();
		this.ctx.font = `${this.n$fontSize}px system-ui`;
		this.ctx.fillStyle = this.s$textColor;
		this.ctx.fillText(this.s$text, rect.x, rect.y + this.#textHeight);
	}

	init() {
		this.#computeSize();
	}

	#computeSize() {
		this.ctx.font = `${this.n$fontSize}px system-ui`;
		const metrics = this.ctx.measureText(this.s$text);
		this.#textHeight = metrics.actualBoundingBoxAscent;
		this.transform.n$minWidth = metrics.width + this.transform.edges$padding.xaxis;
		this.transform.n$minHeight = metrics.actualBoundingBoxAscent + this.transform.edges$padding.yaxis;
	}
}
Text.order = 3000;
registerRenderComponent(Text);