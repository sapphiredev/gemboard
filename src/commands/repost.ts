import { BrandingColors, rootFolder, StarboardChannelId } from '#utils/constants';
import { extractImageUrl, getImageUrl, getStarEmojiForAmount, resolveOnErrorCodes } from '#utils/functions/helpers';
import { getGuildIds } from '#utils/utils';
import { ApplyOptions } from '@sapphire/decorators';
import { ChatInputCommand, Command, Result } from '@sapphire/framework';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	channelMention,
	Collection,
	EmbedBuilder,
	Message,
	messageLink,
	PermissionFlagsBits,
	RESTJSONErrorCodes,
	TextBasedChannel,
	TextChannel
} from 'discord.js';
import { writeFile } from 'node:fs/promises';
import { inspect } from 'node:util';

@ApplyOptions<ChatInputCommand.Options>({
	preconditions: ['ValidServer'],
	description: 'Reposts messages.'
})
export class SlashCommand extends Command {
	#potentialChannelsIds = new Set([
		'737142209639350343',
		'737142774738190377',
		'737142871622156369',
		'759750007087431721',
		'737142940777971773',
		'795723882556162058',
		'934614121687687179',
		'737142325217722478',
		'878754511483723826',
		'914235414041202758',
		'1049324190026702848',
		'891236949950603294',
		'737142503043498015',
		'889973175583133717',
		'750799332445519884',
		'1021836029520515152',
		'1012413247011422409',
		'934916302651412512',
		'750105399172137011'
	]);

	#cachedChannels: Collection<string, TextBasedChannel> = new Collection();

	#failedMessages: Set<bigint> = new Set();

	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false)
					.setName(this.name)
					.setDescription(this.description),
			{ guildIds: getGuildIds() }
		);
	}

	public override async chatInputRun(interaction: ChatInputCommand.Interaction) {
		this.container.logger.info('Starting reposting...');
		await interaction.deferReply({ ephemeral: true });

		this.container.logger.info('Starting channel caching...');
		await this.cacheChannels(interaction);
		this.container.logger.info('Finished channel caching...');

		this.container.logger.info('Starting getting all messages from db...');
		const allMessagesThatWereStarred = await this.container.prisma.message.findMany();
		this.container.logger.info('Finished getting all messages from db...');

		for (const messageToStar of allMessagesThatWereStarred.reverse()) {
			this.container.logger.info(`Getting amount of stars for ${messageToStar.snowflake}...`);
			const amountOfStarsForMessage = await this.container.prisma.userMessage.count({ where: { messageId: messageToStar.snowflake } });
			this.container.logger.info(`Amount of stars for ${messageToStar.snowflake}: ${amountOfStarsForMessage}`);

			this.container.logger.info('Starting getting actual message object...');
			const actualMessageObject = await this.fetchActualMessageObject(messageToStar.snowflake.toString());

			if (actualMessageObject) {
				const actualChannelObject = actualMessageObject.channel.isTextBased() ? (actualMessageObject.channel as TextChannel).name : 'unknown';
				this.container.logger.info(`Finished getting actual message object, it was in channel #${actualChannelObject}...`);
				this.container.logger.info(`URL of message: ${actualMessageObject?.url}`);
				this.container.logger.info('Starting getting starboard channel...');

				const starboardChannel = await resolveOnErrorCodes(
					actualMessageObject.guild!.channels.fetch(StarboardChannelId),
					RESTJSONErrorCodes.MissingAccess
				);
				this.container.logger.info('Finished getting starboard channel...');

				if (starboardChannel?.isTextBased()) {
					const content = `${getStarEmojiForAmount(amountOfStarsForMessage)} **${amountOfStarsForMessage}** | ${channelMention(
						actualMessageObject.channelId
					)}`;

					this.container.logger.info('Starting sending message to starboard...');
					const messageOnStarboard = await starboardChannel.send({
						content,
						embeds: await this.buildEmbeds(actualMessageObject),
						components: [this.buildLinkButtons(actualMessageObject)]
					});
					this.container.logger.info('Finished sending message to starboard...');

					this.container.logger.info('Starting creating starboard message...');
					await this.container.prisma.starboardMessage.create({
						data: {
							channelId: BigInt(actualMessageObject.channelId),
							guildId: BigInt(actualMessageObject.guildId!),
							snowflake: BigInt(messageOnStarboard.id),
							authorId: BigInt(actualMessageObject.author.id),
							messageId: BigInt(messageToStar.snowflake)
						}
					});
					this.container.logger.info('Finished creating starboard message...');
				}
			} else {
				this.#failedMessages.add(messageToStar.snowflake);
			}
		}

		if (this.#failedMessages.size > 0) {
			const inspectedText = inspect(this.#failedMessages.values(), {
				depth: Infinity,
				maxArrayLength: Infinity,
				showHidden: false
			});

			await writeFile(new URL('failed-messages.txt', rootFolder), inspectedText, { encoding: 'utf-8' });

			for (const failedMessage of this.#failedMessages.values()) {
				await this.container.prisma.message.delete({
					where: {
						snowflake: failedMessage
					},
					include: {
						UserMessage: true
					}
				});
			}
		}

		return interaction.editReply({
			content: 'Done!'
		});
	}

	private async cacheChannels(interaction: Command.ChatInputCommandInteraction) {
		for (const channelId of this.#potentialChannelsIds.values()) {
			const channel = await Result.fromAsync(async () => interaction.guild?.channels.fetch(channelId));

			if (channel.isOk()) {
				const chn = channel.unwrap();
				if (chn?.isTextBased()) {
					this.#cachedChannels.set(channelId, chn);
				}
			}
		}
	}

	private async fetchActualMessageObject(messageId: string): Promise<Message<boolean> | null> {
		for (const channel of this.#cachedChannels.values()) {
			const message = await Result.fromAsync(async () => channel.messages.fetch(messageId));

			if (message.isOk()) {
				return message.unwrap();
			}
		}

		return null;
	}

	private async buildEmbeds(actualMessageObject: Message<boolean>) {
		const embedOfStarredMessage = this.buildEmbed(actualMessageObject);

		const embeds: EmbedBuilder[] = [embedOfStarredMessage];

		await this.addReferencedEmbedToEmbeds(actualMessageObject, embeds);

		return embeds;
	}

	private buildEmbed(message: Message, isReferencedMessage = false) {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: message.author.tag,
				iconURL: message.author.displayAvatarURL(),
				url: this.getMessageUrl(message, isReferencedMessage)
			})
			.setDescription(message.content)
			.setTimestamp(message.createdAt)
			.setFooter({ text: `Message ID: ${message.id}` })
			.setColor(isReferencedMessage ? BrandingColors.ReferencedMessage : BrandingColors.Primary);

		if (message.attachments.size) {
			const firstAttachmentUrl = getImageUrl(message.attachments.first()?.url);

			if (firstAttachmentUrl) {
				embed.setImage(firstAttachmentUrl);
			}
		}

		// If no image was found through attachment then check the content of the message
		if (!embed.data.image?.url) {
			const extractionResult = extractImageUrl(message.cleanContent);

			if (extractionResult && extractionResult.imageUrl) {
				embed.setImage(extractionResult.imageUrl);
				embed.setDescription(extractionResult.contentWithoutImageUrl || null);
			}
		}

		return embed;
	}

	private async addReferencedEmbedToEmbeds(message: Message<boolean>, embeds: EmbedBuilder[]) {
		if (embeds.length <= 10 && message.reference && message.reference.messageId && message.reference.guildId) {
			const referencedGuild = await this.container.client.guilds.fetch(message.reference.guildId);
			const referencedChannel = await referencedGuild.channels.fetch(message.reference.channelId);

			if (referencedChannel?.isTextBased()) {
				const referencedMessage = await referencedChannel.messages.fetch(message.reference.messageId);

				const embedOfReferencedMessage = this.buildEmbed(referencedMessage, true);
				embeds.unshift(embedOfReferencedMessage);

				if (referencedMessage.reference) {
					await this.addReferencedEmbedToEmbeds(referencedMessage, embeds);
				}
			}
		}
	}

	private buildLinkButtons(actualMessageObject: Message<boolean>) {
		const actionRow = new ActionRowBuilder<ButtonBuilder>();

		const originalMessageButton = new ButtonBuilder() //
			.setLabel('Original Message')
			.setURL(this.getMessageUrl(actualMessageObject))
			.setStyle(ButtonStyle.Link);

		actionRow.addComponents(originalMessageButton);

		if (actualMessageObject.reference && actualMessageObject.reference.messageId && actualMessageObject.reference.guildId) {
			const referencedMessageButton = new ButtonBuilder() //
				.setLabel('First Referenced Message')
				.setURL(this.getMessageUrl(actualMessageObject, true))
				.setStyle(ButtonStyle.Link);

			actionRow.addComponents(referencedMessageButton);
		}

		return actionRow;
	}

	private getMessageUrl(message: Message, isReferencedMessage = false) {
		if (isReferencedMessage) {
			if (message.reference && message.reference.messageId && message.reference.guildId) {
				return messageLink(message.reference.channelId, message.reference.messageId, message.reference.guildId);
			}
		}

		return message.url;
	}
}
