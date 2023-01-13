import { URL } from 'node:url';

export const rootFolder = new URL('../../../', import.meta.url);
export const srcFolder = new URL('src/', rootFolder);

export const ZeroWidthSpace = '\u200B';

export const enum Emojis {
	GreenTick = '<:greenTick:832292523418189908>',
	RedCross = '<:redCross:1047160911628091402>'
}

export const enum BrandingColors {
	Primary = 0x2563eb
}
