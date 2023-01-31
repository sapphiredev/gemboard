import { StarboardThreshold } from '#utils/constants';
import { messageReactionListenerPreflightChecks } from '#utils/functions/helpers';
import { sendMessageToStarboard } from '#utils/functions/starboard-modifiers';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { MessageReaction, PartialMessageReaction, User } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.MessageReactionAdd
})
export class UserListener extends Listener<typeof Events.MessageReactionAdd> {
	public async run(partialMessageReaction: MessageReaction | PartialMessageReaction, user: User) {
		const messageReaction = await partialMessageReaction.fetch();
		const targetMessage = await messageReaction.message.fetch();

		if (messageReactionListenerPreflightChecks(messageReaction, user, targetMessage)) return;

		const messageToStar = BigInt(targetMessage.id);
		const userWhoStarred = BigInt(user.id);

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
			await sendMessageToStarboard(targetMessage.channelId, targetMessage.guild!, targetMessage.id, targetMessage, amountOfStarsForMessage);
		}
	}
}
