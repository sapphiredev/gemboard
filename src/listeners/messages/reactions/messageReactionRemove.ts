import { StarboardThreshold } from '#utils/constants';
import { messageReactionListenerPreflightChecks } from '#utils/functions/helpers';
import { deleteMessageFromStarboard, sendMessageToStarboard } from '#utils/functions/starboard-modifiers';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { MessageReaction, PartialMessageReaction, User } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.MessageReactionRemove
})
export class UserListener extends Listener<typeof Events.MessageReactionRemove> {
	public async run(partialMessageReaction: MessageReaction | PartialMessageReaction, user: User) {
		const messageReaction = await partialMessageReaction.fetch();
		const targetMessage = await messageReaction.message.fetch();

		if (messageReactionListenerPreflightChecks(messageReaction, user, targetMessage)) return;

		const messageToUnStar = BigInt(targetMessage.id);
		const userWhoUnStarred = BigInt(user.id);

		const userFromDatabase = await this.container.prisma.user.findFirst({ where: { snowflake: userWhoUnStarred } });

		if (isNullish(userFromDatabase)) return;

		const messageFromDatabase = await this.container.prisma.message.findFirst({ where: { snowflake: messageToUnStar } });

		if (isNullish(messageFromDatabase)) return;

		const userHasStarredMessage = await this.container.prisma.userMessage.findFirst({
			where: {
				userId: userWhoUnStarred,
				messageId: messageToUnStar
			}
		});

		if (isNullish(userHasStarredMessage)) return;

		await this.container.prisma.userMessage.delete({
			where: {
				userId_messageId: {
					userId: userWhoUnStarred,
					messageId: messageToUnStar
				}
			}
		});

		const amountOfStarsForMessage = await this.container.prisma.userMessage.count({ where: { messageId: messageToUnStar } });

		if (amountOfStarsForMessage >= StarboardThreshold) {
			await sendMessageToStarboard(targetMessage.channelId, targetMessage.guild!, targetMessage.id, targetMessage, amountOfStarsForMessage);
		} else if (amountOfStarsForMessage === 0) {
			await this.container.prisma.message.delete({ where: { snowflake: messageToUnStar } });
		}

		const amountOfStarsByUser = await this.container.prisma.userMessage.count({ where: { userId: userWhoUnStarred } });

		if (amountOfStarsByUser === 0) {
			await this.container.prisma.user.delete({ where: { snowflake: userWhoUnStarred } });
		}

		await deleteMessageFromStarboard(targetMessage.channelId, targetMessage.guild!, targetMessage.id, targetMessage);
	}
}
