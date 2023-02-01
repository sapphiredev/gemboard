import { bannedCommandChannels, bannedStarChannels, BrandingColors } from '#utils/constants';
import { isNullish, tryParseURL } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import { DiscordAPIError, formatEmoji, Message, MessageReaction, RESTJSONErrorCodes, User } from 'discord.js';

export function getStarEmojiForAmount(amountOfStarsForMessage: number): string {
	if (amountOfStarsForMessage <= 10) return '⭐';
	if (amountOfStarsForMessage <= 20) return '🌟';
	if (amountOfStarsForMessage <= 30) return '✨';
	if (amountOfStarsForMessage <= 40) return '💫';

	return formatEmoji('1063574124171100190', true);
}

export function getEmbedColorForAmount(amountOfStarsForMessage: number | undefined): number {
	if (isNullish(amountOfStarsForMessage)) return BrandingColors.Primary;

	if (amountOfStarsForMessage <= 10) return 0xf1ee8e;
	if (amountOfStarsForMessage <= 20) return 0xece75f;
	if (amountOfStarsForMessage <= 30) return 0xe8e337;
	if (amountOfStarsForMessage <= 40) return 0xe5de00;

	return 0xe6cc00;
}

export function getStarPluralizedString(amountOfStarsForMessage: number) {
	return amountOfStarsForMessage === 1 ? 'star' : 'stars';
}

export async function resolveOnErrorCodes<T>(promise: Promise<T>, ...codes: readonly RESTJSONErrorCodes[]) {
	try {
		return await promise;
	} catch (error) {
		if (error instanceof DiscordAPIError && codes.includes(error.code as RESTJSONErrorCodes)) return null;
		throw error;
	}
}

const IMAGE_EXTENSION = /\.(bmp|jpe?g|png|gif|webp)$/i;
/**
 * Parses an URL and checks if the extension is valid.
 * @param url The url to check
 */
export function getImageUrl(url: string | undefined): string | undefined {
	if (!url) return undefined;

	const parsed = tryParseURL(url);
	return parsed && IMAGE_EXTENSION.test(parsed.pathname) ? parsed.href : undefined;
}

const ImageUrlExtractionRegex = /(?<url>http(?:s)?:?(?:\/\/[^"' ]*\.(bmp|jpe?g|png|gif|webp)))/gi;
export function extractImageUrl(content: string): ExtractImageUrl | undefined {
	const match = ImageUrlExtractionRegex.exec(content)?.groups?.url;

	if (!match) return undefined;
	return {
		imageUrl: getImageUrl(match),
		contentWithoutImageUrl: content.replace(new RegExp(`${match} ?`), '')
	};
}

export function messageReactionListenerPreflightChecks(messageReaction: MessageReaction, user: User, message: Message) {
	// Bypass reactions that are not a star
	if (messageReaction.emoji.name !== '⭐') return true;

	// Prevent bots from starring
	if (user.bot) return true;

	// If there is no message author then return
	if (!message.author) return true;

	// Prevent bot messages to be starred
	if (message.author.bot) return true;

	// Prevent users from self-starring
	if (user.id === message.author.id) return true;

	// Prevent reactions in unverified servers
	if (message.guildId !== envParseString('COMMAND_GUILD_ID')) return true;

	// Prevent reactions in banned channels
	if (bannedCommandChannels.has(message.channelId) || bannedStarChannels.has(message.channelId)) return true;

	return false;
}

interface ExtractImageUrl {
	imageUrl: string | undefined;
	contentWithoutImageUrl: string;
}
