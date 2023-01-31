import { ErrorIdentifiers, StarboardThreshold } from '#utils/constants';
import { getStarEmojiForAmount, getStarPluralizedString } from '#utils/functions/helpers';
import { replySuccessfullyStarredMessage, sendMessageToStarboard } from '#utils/functions/starboard-modifiers';
import { getGuildIds } from '#utils/utils';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, UserError } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { ApplicationCommandType, type Message, type MessageContextMenuCommandInteraction } from 'discord.js';

@ApplyOptions<Command.Options>({
	preconditions: ['IsMessageContextMenuCommand', 'NoSelfStar', 'NoBotStar', 'ValidServer', 'ValidChannel']
})
export class SlashCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerContextMenuCommand(
			(builder) =>
				builder //
					.setName('Star Message')
					.setType(ApplicationCommandType.Message),

			{ guildIds: getGuildIds() }
		);
	}

	public override async contextMenuRun(interaction: MessageContextMenuCommandInteraction) {
		const messageToStar = BigInt(interaction.targetId);
		const userWhoStarred = BigInt(interaction.user.id);

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
				const amountOfStarsForMessage = await this.container.prisma.userMessage.count({ where: { messageId: messageToStar } });
				const starEmoji = getStarEmojiForAmount(amountOfStarsForMessage);
				const starPluralized = getStarPluralizedString(amountOfStarsForMessage);

				throw new UserError({
					identifier: ErrorIdentifiers.UserAlreadyStarredMessage,
					message: `You already starred this message! It now has ${starEmoji} ${amountOfStarsForMessage} ${starPluralized}.`
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

		let editedStarboardMessage: Message<true> | null = null;
		if (amountOfStarsForMessage >= StarboardThreshold) {
			editedStarboardMessage = await sendMessageToStarboard(
				interaction.channelId,
				interaction.guild!,
				interaction.targetId,
				interaction.targetMessage,
				amountOfStarsForMessage
			);
		}

		return replySuccessfullyStarredMessage(interaction, amountOfStarsForMessage, editedStarboardMessage);
	}
}
