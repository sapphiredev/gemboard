import { BrandingColors, ErrorIdentifiers, StarboardChannelId, StarboardThreshold } from '#utils/constants';
import {
	extractImageUrl,
	getEmbedColorForAmount,
	getImageUrl,
	getStarEmojiForAmount,
	getStarPluralizedString,
	resolveOnErrorCodes
} from '#utils/functions/helpers';

import { container, UserError } from '@sapphire/framework';
import { isNullish, isNullishOrEmpty } from '@sapphire/utilities';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	channelMention,
	EmbedBuilder,
	Guild,
	hideLinkEmbed,
	hyperlink,
	Message,
	messageLink,
	RESTJSONErrorCodes,
	type GuildTextBasedChannel,
	type MessageContextMenuCommandInteraction
} from 'discord.js';

export async function sendMessageToStarboard(
	channelId: string,
	guild: Guild,
	targetId: string,
	targetMessage: Message,
	amountOfStarsForMessage: number
): Promise<Message<true> | null> {
	const content = `${getStarEmojiForAmount(amountOfStarsForMessage)} **${amountOfStarsForMessage}** | ${channelMention(channelId)}`;
	const starboardChannel = await resolveOnErrorCodes(guild.channels.fetch(StarboardChannelId), RESTJSONErrorCodes.MissingAccess);

	if (!starboardChannel?.isTextBased()) {
		throw new UserError({
			identifier: ErrorIdentifiers.StarboardChannelNotFound,
			message: 'The starboard channel was not found.'
		});
	}

	const alreadyPostedMessage = await container.prisma.starboardMessage.findFirst({
		where: {
			channelId: BigInt(channelId),
			guildId: BigInt(guild.id),
			messageId: BigInt(targetId),
			authorId: BigInt(targetMessage.author.id)
		}
	});

	if (isNullish(alreadyPostedMessage)) {
		await postMessage(channelId, guild.id, targetMessage, targetId, starboardChannel, content, amountOfStarsForMessage);
		return null;
	}

	const discordMessage = await resolveOnErrorCodes(
		starboardChannel.messages.fetch(alreadyPostedMessage.snowflake.toString()),
		RESTJSONErrorCodes.UnknownMessage,
		RESTJSONErrorCodes.MissingAccess
	);

	if (isNullish(discordMessage)) {
		return null;
	}

	await discordMessage.edit({ content });
	return discordMessage;
}

async function postMessage(
	channelId: string,
	guildId: string,
	targetMessage: Message,
	targetId: string,
	starboardChannel: GuildTextBasedChannel,
	content: string,
	amountOfStarsForMessage: number
) {
	const messageOnStarboard = await starboardChannel.send({
		content,
		embeds: await buildEmbeds(targetMessage, amountOfStarsForMessage),
		components: [buildLinkButtons(targetMessage, channelId, guildId)]
	});

	await container.prisma.starboardMessage.create({
		data: {
			channelId: BigInt(channelId),
			guildId: BigInt(guildId),
			snowflake: BigInt(messageOnStarboard.id),
			authorId: BigInt(targetMessage.author.id),
			messageId: BigInt(targetId)
		}
	});
}

/**
 * Deletes the message from the starboard if it exists
 * @param channelId The channel id of the message that was starred
 * @param guild The guild that the message was starred in
 * @param targetId The id of the message that was starred
 * @param targetMessage The message that was starred
 * @returns `true` if by unstarring the message dropped below the threshold and the message was deleted, `false` otherwise
 */
export async function deleteMessageFromStarboard(channelId: string, guild: Guild, targetId: string, targetMessage: Message) {
	const starboardChannel = await resolveOnErrorCodes(guild.channels.fetch(StarboardChannelId), RESTJSONErrorCodes.MissingAccess);

	if (!starboardChannel?.isTextBased()) {
		throw new UserError({
			identifier: ErrorIdentifiers.StarboardChannelNotFound,
			message: 'The starboard channel was not found.'
		});
	}

	const alreadyPostedMessage = await container.prisma.starboardMessage.findFirst({
		where: {
			channelId: BigInt(channelId),
			guildId: BigInt(guild.id),
			messageId: BigInt(targetId!),
			authorId: BigInt(targetMessage.author.id)
		}
	});

	if (isNullish(alreadyPostedMessage)) {
		// The message that was unstarred was never on the starboard to begin with
		return false;
	}

	const deletedStarboardMessageEntry = await container.prisma.starboardMessage.delete({
		where: {
			snowflake_authorId_channelId_guildId_messageId: {
				channelId: BigInt(channelId),
				guildId: BigInt(guild.id),
				snowflake: alreadyPostedMessage.snowflake,
				authorId: alreadyPostedMessage.authorId,
				messageId: BigInt(targetId)
			}
		}
	});

	const discordMessage = await resolveOnErrorCodes(
		starboardChannel.messages.fetch(deletedStarboardMessageEntry.snowflake.toString()),
		RESTJSONErrorCodes.UnknownMessage,
		RESTJSONErrorCodes.MissingAccess
	);

	if (!isNullish(discordMessage)) {
		await discordMessage.delete();
	}

	return true;
}

export function replySuccessfullyStarredMessage(
	interaction: MessageContextMenuCommandInteraction,
	amountOfStarsForMessage: number,
	editedStarboardMessage?: Message<true> | null
) {
	const starEmoji = getStarEmojiForAmount(amountOfStarsForMessage);
	const starPluralized = getStarPluralizedString(amountOfStarsForMessage);

	const msgUrl = interaction.targetMessage.url;
	const embeddedMsgLink = hyperlink('message', hideLinkEmbed(msgUrl));

	const componentMessageLinks: [label: string, url: string][] = [['Go to message', interaction.targetMessage.url]];

	if (editedStarboardMessage) {
		componentMessageLinks.push(['Starboard Message', editedStarboardMessage.url]);
	}

	let content = `You just starred a ${embeddedMsgLink}! It now has ${starEmoji} ${amountOfStarsForMessage} ${starPluralized}.`;
	if (!editedStarboardMessage && amountOfStarsForMessage >= StarboardThreshold) {
		const starboardChannelMention = channelMention(StarboardChannelId);
		content = content.concat(
			`\nThis means it has passed the threshold of ${StarboardThreshold} so I have posted it to the ${starboardChannelMention}!`
		);
	}

	return interaction.reply({
		content,
		components: [buildReplyComponents(...componentMessageLinks)],
		ephemeral: true
	});
}

export function replySuccessfullyUnstarredMessage(
	interaction: MessageContextMenuCommandInteraction,
	amountOfStarsForMessage: number,
	droppedBelowThreshold = false
) {
	const msgUrl = interaction.targetMessage.url;
	const embeddedMsgLink = hyperlink('message', hideLinkEmbed(msgUrl));

	if (droppedBelowThreshold) {
		return interaction.reply({
			content: `Awe shucks, you removed your star from a ${embeddedMsgLink}.\nThis dropped the ${embeddedMsgLink} below the threshold of ${StarboardThreshold} so I have deleted the ${embeddedMsgLink} from the starboard.`,
			components: [buildReplyComponents(['Go to message', interaction.targetMessage.url])],
			ephemeral: true
		});
	}

	const starEmoji = getStarEmojiForAmount(amountOfStarsForMessage);
	const starPluralized = getStarPluralizedString(amountOfStarsForMessage);

	return interaction.reply({
		content: `Oh noes, you removed your star from a ${embeddedMsgLink}. The ${embeddedMsgLink} now has ${starEmoji} ${amountOfStarsForMessage} ${starPluralized}.`,
		components: [buildReplyComponents(['Go to message', interaction.targetMessage.url])],
		ephemeral: true
	});
}

function buildReplyComponents(...messages: [label: string, messageUrl: string][]) {
	const actionRow = new ActionRowBuilder<ButtonBuilder>();

	for (const [label, url] of messages) {
		actionRow.addComponents(
			new ButtonBuilder() //
				.setLabel(label)
				.setURL(url)
				.setStyle(ButtonStyle.Link)
		);
	}

	return actionRow;
}

async function buildEmbeds(targetMessage: Message, amountOfStarsForMessage: number) {
	const embedOfStarredMessage = buildEmbed({ message: targetMessage, amountOfStarsForMessage });
	const embeds: EmbedBuilder[] = [embedOfStarredMessage];

	await addReferencedEmbedToEmbeds(targetMessage, embeds);

	return embeds;
}

interface BuildEmbedParameters {
	message: MessageContextMenuCommandInteraction['targetMessage'];
	isReferencedMessage?: boolean;
	amountOfStarsForMessage?: number;
}
function buildEmbed({ message, amountOfStarsForMessage, isReferencedMessage = false }: BuildEmbedParameters) {
	const authorName = isReferencedMessage ? `Replying to ${message.author.tag}` : message.author.tag;

	const embed = new EmbedBuilder()
		.setAuthor({
			name: authorName,
			iconURL: message.author.displayAvatarURL(),
			url: getMessageUrl(message, isReferencedMessage)
		})
		.setTimestamp(message.createdAt)
		.setFooter({ text: `Message ID: ${message.id}` })
		.setColor(isReferencedMessage ? BrandingColors.ReferencedMessage : getEmbedColorForAmount(amountOfStarsForMessage));

	if (!isNullishOrEmpty(message.content)) {
		embed.setDescription(message.content);
	}

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

async function addReferencedEmbedToEmbeds(message: MessageContextMenuCommandInteraction['targetMessage'], embeds: EmbedBuilder[]) {
	if (
		embeds.length <= 9 &&
		message.reference &&
		message.reference.messageId &&
		message.reference.guildId &&
		message.reference.channelId === message.channelId &&
		message.reference.guildId === message.guildId
	) {
		const referencedGuild = await container.client.guilds.fetch(message.reference.guildId);
		const referencedChannel = await referencedGuild.channels.fetch(message.reference.channelId);

		if (referencedChannel?.isTextBased()) {
			const referencedMessage = await referencedChannel.messages.fetch(message.reference.messageId);

			const embedOfReferencedMessage = buildEmbed({ message: referencedMessage, isReferencedMessage: true });
			embeds.unshift(embedOfReferencedMessage);

			if (referencedMessage.reference) {
				await addReferencedEmbedToEmbeds(referencedMessage, embeds);
			}
		}
	}
}

function buildLinkButtons(targetMessage: Message, channelId: string, guildId: string) {
	const actionRow = new ActionRowBuilder<ButtonBuilder>();

	const originalMessageButton = new ButtonBuilder() //
		.setLabel('Original Message')
		.setURL(getMessageUrl(targetMessage))
		.setStyle(ButtonStyle.Link);

	actionRow.addComponents(originalMessageButton);

	if (
		targetMessage.reference &&
		targetMessage.reference.messageId &&
		targetMessage.reference.channelId &&
		targetMessage.reference.guildId &&
		targetMessage.reference.channelId === channelId &&
		targetMessage.reference.guildId === guildId
	) {
		const referencedMessageButton = new ButtonBuilder() //
			.setLabel('First Referenced Message')
			.setURL(getMessageUrl(targetMessage, true))
			.setStyle(ButtonStyle.Link);

		actionRow.addComponents(referencedMessageButton);
	}

	return actionRow;
}

function getMessageUrl(message: MessageContextMenuCommandInteraction['targetMessage'], isReferencedMessage = false) {
	if (isReferencedMessage) {
		if (message.reference && message.reference.messageId && message.reference.guildId) {
			return messageLink(message.reference.channelId, message.reference.messageId, message.reference.guildId);
		}
	}

	return message.url;
}
