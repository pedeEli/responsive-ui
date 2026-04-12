declare namespace textarea {
	type LineInfo = {
		element: HTMLElement;
		start: number;
		end: number;
		length: number;
		children: Array<{
			node: Text;
			start: number;
			end: number;
		}>;
	};

	type Highlight = {
		type: 'string' | 'tag';
		region: parser.SourceRegion<null>;
	};
}