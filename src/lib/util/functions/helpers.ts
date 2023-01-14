import { Emojis } from '#utils/constants';
import { tryParseURL } from '@sapphire/utilities';
import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

export function getStarEmojiForAmount(amountOfStarsForMessage: number): string {
	if (amountOfStarsForMessage <= 10) return '⭐';
	if (amountOfStarsForMessage <= 20) return '🌟';
	if (amountOfStarsForMessage <= 30) return '✨';
	if (amountOfStarsForMessage <= 40) return '💫';

	return Emojis.Minior;
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

interface ExtractImageUrl {
	imageUrl: string | undefined;
	contentWithoutImageUrl: string;
}
