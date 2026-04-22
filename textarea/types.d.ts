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

	type History = {
		value: string;
		cursor: number;
		selection: null | {
			start: number;
			end: number;
		};
	};

	namespace Action {
		type Remove = 'Backspace' | 'Delete';
		type History = 'z' | 'Z' | 'y';
		type Move = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';
	}
}