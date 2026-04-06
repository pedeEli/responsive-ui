import {RenderComponent, registerRenderComponent} from '../core/RenderComponent.js';

export class Background extends RenderComponent {
	s$bg = 'white';

	render() {
		const rect = this.transform.getWorldPaddingRect();
		this.ctx.fillStyle = this.s$bg;
		this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
	}
}
Background.order = 1000;
registerRenderComponent(Background);