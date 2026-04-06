import {RenderComponent, registerRenderComponent} from '../core/RenderComponent.js'

export class Border extends RenderComponent {
	s$border = 'white';

	render() {
		const rect = this.transform.getWorldPaddingRect();
		const rect2 = this.transform.getWorldMarginRect();
		const rect3 = this.transform.getWorldContentRect();
		this.ctx.strokeStyle = this.s$border;
		this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
		this.ctx.strokeRect(rect2.x, rect2.y, rect2.width, rect2.height);
		this.ctx.strokeRect(rect3.x, rect3.y, rect3.width, rect3.height);
	}
}
Border.order = 2000;
registerRenderComponent(Border);