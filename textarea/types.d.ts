declare namespace textarea {
	type LineInfo = {
		element: HTMLElement;
		start: number;
		end: number;
		children: Array<{
			node: Text;
			start: number;
			end: number;
		}>;
	};

	type Highlight = {
		type: 'string' | 'tag';
		start: number;
		end: number;
	};
}