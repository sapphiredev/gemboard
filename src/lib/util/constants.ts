import { envParseString } from '@skyra/env-utilities';
import { URL } from 'node:url';

export const rootFolder = new URL('../../../', import.meta.url);
export const srcFolder = new URL('src/', rootFolder);

export const ZeroWidthSpace = '\u200B';

export const enum Emojis {
	GreenTick = '<:greenTick:832292523418189908>',
	RedCross = '<:redCross:1047160911628091402>',
	Minior = '<a:minior:1063574124171100190>'
}

export const enum BrandingColors {
	Primary = 0x2563eb
}

export const enum ErrorIdentifiers {
	UserNotFoundInDatabase = 'userNotFoundInDatabase',
	MessageNotFoundInDatabase = 'messageNotFoundInDatabase',
	NotInCommandGuildIds = 'notInCommandGuildIds',
	BannedChannel = 'bannedChannel',
	StarboardChannelNotFound = 'starboardChannelNotFound',
	UserAlreadyStarredMessage = 'userAlreadyStarredMessage',
	StarboardMessageNotFoundInDatabase = 'starboardMessageNotFoundInDatabase'
}

export const StarboardChannelId = envParseString('NODE_ENV') === 'development' ? '1063577068127916073' : '750076466099912804';
export const StarboardThreshold = envParseString('NODE_ENV') === 'development' ? 2 : 3;
