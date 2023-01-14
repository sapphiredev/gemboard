import { URL } from 'node:url';

export const rootFolder = new URL('../../../', import.meta.url);
export const srcFolder = new URL('src/', rootFolder);

export const enum Emojis {
	GreenTick = '<:greenTick:832292523418189908>',
	RedCross = '<:redCross:1047160911628091402>',
	Minior = '<a:minior:1063574124171100190>'
}

export const enum BrandingColors {
	Primary = 0x2563eb,
	ReferencedMessage = 0x303136
}

export const enum ErrorIdentifiers {
	UserNotFoundInDatabase = 'userNotFoundInDatabase',
	MessageNotFoundInDatabase = 'messageNotFoundInDatabase',
	StarboardChannelNotFound = 'starboardChannelNotFound',
	UserAlreadyStarredMessage = 'userAlreadyStarredMessage',
	UserHasNotStarredMessage = 'userHasNotStarredMessage'
}

export const StarboardChannelId = process.env.NODE_ENV === 'development' ? '1063577068127916073' : '750076466099912804';
export const StarboardThreshold = process.env.NODE_ENV === 'development' ? 2 : 3;
