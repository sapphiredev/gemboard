import { URL } from 'node:url';

export const rootFolder = new URL('../../../', import.meta.url);
export const srcFolder = new URL('src/', rootFolder);

export const enum BrandingColors {
	Primary = 0x2563eb,
	ReferencedMessage = 0x303136
}

export const enum ErrorIdentifiers {
	UserNotFoundInDatabase = 'userNotFoundInDatabase',
	MessageNotFoundInDatabase = 'messageNotFoundInDatabase',
	StarboardChannelNotFound = 'starboardChannelNotFound',
	UserAlreadyStarredMessage = 'userAlreadyStarredMessage',
	UserHasNotStarredMessage = 'userHasNotStarredMessage',
	CannotReceiveLeaderboard = 'cannotReceiveLeaderboard'
}

export const StarboardChannelId = process.env.NODE_ENV === 'development' ? '1063577068127916073' : '750076466099912804';
export const StarboardThreshold = process.env.NODE_ENV === 'development' ? 2 : 3;

export const bannedChannels = new Set([
	// Sapphire
	StarboardChannelId, // ⭐ Starboard
	'737142021084413973', // Welcome!
	'917524171150471178', // Get-A-Role!
	'737142071319855105', // Announcements
	'737455952332062808', // suggestions
	'868616234571268186', // Mod Announcements
	'749981849153044480', // Discord Community - Announcements
	'883793936412454943', // Helpers Shelter
	'868616042174369873', // Mod Discussions and Deliberations
	'868830230503100426', // #!/mod/bot-commands
	'911641690547302487', // Welcome New Members
	'737452979162054717', // #!bot-commands
	'792132881903386664', // Mature Chat
	'768153232136077334', // Controversial
	'1049447386491138160', // raid-barrier
	'1038884471811879096', // answer-overflow-consent
	'1055032566975057970', // discord-developer-updates
	'1055032566975057970', // Changelogs
	'737143305347006564', // GitHub Logs
	'826930829564444732', // Moderation Logs
	'826930903049306163', // Member Logs
	'924831614096265226', // Message Delete Logs
	'969916120247189514', // Automod Logs
	// Testing Playground
	'940336888957521990' // restricted
]);
