import { Emojis } from '#utils/constants';

export function getStarEmojiForAmount(amountOfStarsForMessage: number): string {
	if (amountOfStarsForMessage <= 10) return '⭐';
	if (amountOfStarsForMessage <= 20) return '🌟';
	if (amountOfStarsForMessage <= 30) return '✨';
	if (amountOfStarsForMessage <= 40) return '💫';

	return Emojis.Minior;
}
