import { ErrorIdentifiers, StarboardThreshold } from '#utils/constants';
import {
	deleteMessageFromStarboard,
	replySuccessfullyStarredMessage,
	replySuccessfullyUnstarredMessage,
	sendMessageToStarboard
} from '#utils/functions/starboard-modifiers';
import { getGuildIds } from '#utils/utils';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, UserError } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { ApplicationCommandType, type MessageContextMenuCommandInteraction } from 'discord.js';

@ApplyOptions<Command.Options>({
	preconditions: ['IsMessageContextMenuCommand', 'NoSelfStar', 'NoBotStar', 'ValidServer', 'ValidChannel']
})
export class SlashCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerContextMenuCommand(
			(builder) =>
				builder //
					.setName('Unstar Message')
					// @ts-expect-error temporarily ignore the error because discord.js broke types
					.setType(ApplicationCommandType.Message),

			{ guildIds: getGuildIds() }
		);
	}

	public override async contextMenuRun(interaction: MessageContextMenuCommandInteraction) {
		const messageToUnStar = BigInt(interaction.targetId);
		const userWhoUnStarred = BigInt(interaction.user.id);

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

		let starboardMessageWasDeleted = false;
		if (amountOfStarsForMessage >= StarboardThreshold) {
			const editedStarboardMessage = await sendMessageToStarboard(
				interaction.channelId,
				interaction.guild!,
				interaction.targetId,
				interaction.targetMessage,
				amountOfStarsForMessage
			);
			return replySuccessfullyStarredMessage(interaction, amountOfStarsForMessage, editedStarboardMessage);
		} else if (amountOfStarsForMessage === 0) {
			await this.container.prisma.message.delete({ where: { snowflake: messageToUnStar } });
			starboardMessageWasDeleted = await deleteMessageFromStarboard(
				interaction.channelId,
				interaction.guild!,
				interaction.targetId,
				interaction.targetMessage
			);
		}

		const amountOfStarsByUser = await this.container.prisma.userMessage.count({ where: { userId: userWhoUnStarred } });

		if (amountOfStarsByUser === 0) {
			await this.container.prisma.user.delete({ where: { snowflake: userWhoUnStarred } });
		}

		return replySuccessfullyUnstarredMessage(interaction, amountOfStarsForMessage, starboardMessageWasDeleted);
	}
}
