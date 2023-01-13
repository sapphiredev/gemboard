import { BrandingColors, ErrorIdentifiers, StarboardChannelId, StarboardThreshold } from '#utils/constants';
import { getStarEmojiForAmount } from '#utils/functions/helpers';
import { getGuildIds } from '#utils/utils';
import { ActionRowBuilder, ButtonBuilder, channelMention, EmbedBuilder } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, UserError } from '@sapphire/framework';
import { isNullish, Nullish } from '@sapphire/utilities';
import { ApplicationCommandType, ButtonStyle, GuildBasedChannel, MessageContextMenuCommandInteraction } from 'discord.js';

@ApplyOptions<Command.Options>({
	preconditions: ['ValidServer', 'ValidChannel']
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

	public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		if (interaction.isMessageContextMenuCommand()) {
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
					const starPluralized = amountOfStarsForMessage === 1 ? 'star' : 'stars';

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

			if (amountOfStarsForMessage >= StarboardThreshold) {
				await this.sendMessageToStarboard(interaction, amountOfStarsForMessage);
			}

			const starEmoji = getStarEmojiForAmount(amountOfStarsForMessage);
			const starPluralized = amountOfStarsForMessage === 1 ? 'star' : 'stars';
			return interaction.reply({
				content: `You just starred a message! It now has ${starEmoji} ${amountOfStarsForMessage} ${starPluralized}.`,
				ephemeral: true
			});
		}

		throw new UserError({
			identifier: ErrorIdentifiers.ContextMenuCommandTriggeredOnUserContextMenu,
			message: 'Woaw, you somehow triggered this action from a User context menu, that should not be possible.'
		});
	}

	private async sendMessageToStarboard(interaction: MessageContextMenuCommandInteraction, amountOfStarsForMessage: number) {
		const embedOfStarredMessage = this.buildEmbed(interaction.targetMessage);
		const content = `${getStarEmojiForAmount(amountOfStarsForMessage)} **${amountOfStarsForMessage}** | ${channelMention(interaction.channelId)}`;
		const starboardChannel = await interaction.guild?.channels.fetch(StarboardChannelId);

		if (amountOfStarsForMessage === StarboardThreshold) {
			return this.postMessage(interaction, starboardChannel, embedOfStarredMessage, content);
		}

		const alreadyPostedMessage = await this.container.prisma.starboardBoardMessage.findFirst({
			where: {
				channelId: BigInt(interaction.channelId),
				guildId: BigInt(interaction.guildId!),
				snowflake: BigInt(interaction.targetMessage.id)
			}
		});

		if (isNullish(alreadyPostedMessage)) {
			return this.postMessage(interaction, starboardChannel, embedOfStarredMessage, content);
		}

		if (!starboardChannel?.isTextBased()) {
			throw new UserError({
				identifier: ErrorIdentifiers.StarboardChannelNotFound,
				message: 'The starboard channel was not found.'
			});
		}

		const discordMessage = await starboardChannel.messages.fetch(alreadyPostedMessage.snowflake.toString());

		return discordMessage.edit({
			content
		});
	}

	private async postMessage(
		interaction: MessageContextMenuCommandInteraction,
		starboardChannel: GuildBasedChannel | Nullish,
		embedOfStarredMessage: EmbedBuilder,
		content: string
	) {
		if (starboardChannel?.isTextBased()) {
			const messageOnStarboard = await starboardChannel.send({
				content,
				embeds: [embedOfStarredMessage],
				components: [this.buildLinkButtons(interaction)]
			});

			await this.container.prisma.starboardBoardMessage.create({
				data: {
					channelId: BigInt(interaction.channelId),
					guildId: BigInt(interaction.guildId!),
					snowflake: BigInt(messageOnStarboard.id)
				}
			});
		}
	}

	private buildEmbed(message: MessageContextMenuCommandInteraction['targetMessage']) {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: message.author.tag,
				iconURL: message.author.displayAvatarURL()
			})
			.setDescription(message.content)
			.setFooter({ text: `Message ID: ${message.id}` })
			.setTimestamp(message.createdAt)
			.setColor(BrandingColors.Primary);

		if (message.attachments.size) {
			embed.setImage(message.attachments.first()!.url);
		}

		return embed;
	}

	private buildLinkButtons(interaction: MessageContextMenuCommandInteraction) {
		const actionRow = new ActionRowBuilder<ButtonBuilder>();

		const originalMessageButton = new ButtonBuilder() //
			.setLabel('Original Message')
			.setURL(interaction.targetMessage.url)
			.setStyle(ButtonStyle.Link);

		actionRow.setComponents([originalMessageButton]);

		return actionRow;
	}
}
