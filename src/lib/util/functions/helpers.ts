import { Emojis } from '#utils/constants';
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
