import { ErrorIdentifiers, StarboardThreshold } from '#utils/constants';
import { messageReactionListenerPreflightChecks } from '#utils/functions/helpers';
import { deleteMessageFromStarboard, sendMessageToStarboard } from '#utils/functions/starboard-modifiers';
import { Events, Listener, UserError } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { MessageReaction, User } from 'discord.js';

export class UserListener extends Listener<typeof Events.MessageReactionRemove> {
	public async run(messageReaction: MessageReaction, user: User) {
		const targetMessage = await messageReaction.message.fetch();

		if (messageReactionListenerPreflightChecks(messageReaction, user, targetMessage)) return;

		const messageToUnStar = BigInt(targetMessage.id);
		const userWhoUnStarred = BigInt(targetMessage.author.id);

		const userFromDatabase = await this.container.prisma.user.findFirst({ where: { snowflake: userWhoUnStarred } });

		if (isNullish(userFromDatabase)) {
			throw new UserError({
				identifier: ErrorIdentifiers.UserNotFoundInDatabase,
				message: 'Looks like you never starred a message before, how about you star something first?'
			});
		}

		const messageFromDatabase = await this.container.prisma.message.findFirst({ where: { snowflake: messageToUnStar } });

		if (isNullish(messageFromDatabase)) {
			throw new UserError({
				identifier: ErrorIdentifiers.MessageNotFoundInDatabase,
				message: "Looks like that message hasn't been starred yet by anyone, will you be the first?"
			});
		}

		const userHasStarredMessage = await this.container.prisma.userMessage.findFirst({
			where: {
				userId: userWhoUnStarred,
				messageId: messageToUnStar
			}
		});

		if (isNullish(userHasStarredMessage)) {
			throw new UserError({
				identifier: ErrorIdentifiers.UserHasNotStarredMessage,
				message: 'You have not yet starred that message, why not do so now?'
			});
		}

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
