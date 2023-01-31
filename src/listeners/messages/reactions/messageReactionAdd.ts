import { bannedCommandChannels, bannedStarChannels, ErrorIdentifiers, StarboardThreshold } from '#utils/constants';
import { getStarEmojiForAmount, getStarPluralizedString, messageReactionListenerPreflightChecks } from '#utils/functions/helpers';
import { Events, Listener, UserError } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import { MessageReaction, User } from 'discord.js';

export class UserListener extends Listener<typeof Events.MessageReactionAdd> {
	public async run(messageReaction: MessageReaction, user: User) {
		if (messageReactionListenerPreflightChecks(messageReaction, user)) return;

		// Prevent reactions in banned channels
		if (bannedCommandChannels.has(messageReaction.message.channelId) || bannedStarChannels.has(messageReaction.message.channelId)) return;

		const messageToStar = BigInt(messageReaction.message.id);
		const userWhoStarred = BigInt(messageReaction.message.author!.id);

		let userFromDatabase = await this.container.prisma.user.findFirst({ where: { snowflake: userWhoStarred } });

		if (isNullish(userFromDatabase)) {
			userFromDatabase = await this.container.prisma.user.create({ data: { snowflake: userWhoStarred } });
		}

		const messageFromDatabase = await this.container.prisma.message.findFirst({ where: { snowflake: messageToStar } });

		if (messageFromDatabase) {
			const userMessageLink = await this.container.prisma.userMessage.findFirst({
				where: {
					messageId: messageToStar,
					userId: userWhoStarred
				}
			});

			if (isNullish(userMessageLink)) {
				await this.container.prisma.userMessage.create({
					data: {
						messageId: messageToStar,
						userId: userWhoStarred
					}
				});
			} else {
				await messageReaction.remove();

				throw new UserError({
					identifier: ErrorIdentifiers.UserAlreadyStarredMessage,
					message: `You already starred this message, so I removed your reaction.`
				});
			}
		} else {
			await this.container.prisma.message.create({
				data: {
					snowflake: messageToStar,
					UserMessage: {
						create: {
							userId: userWhoStarred
						}
					}
				}
			});
		}

		const amountOfStarsForMessage = await this.container.prisma.userMessage.count({ where: { messageId: messageToStar } });

		if (amountOfStarsForMessage >= StarboardThreshold) {
			return sendMessageToStarboard(interaction, amountOfStarsForMessage);
		}
	}
}
