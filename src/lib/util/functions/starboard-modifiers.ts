import { BrandingColors, ErrorIdentifiers, StarboardChannelId, StarboardThreshold } from '#utils/constants';
import { extractImageUrl, getImageUrl, getStarEmojiForAmount, getStarPluralizedString, resolveOnErrorCodes } from '#utils/functions/helpers';
import { ActionRowBuilder, ButtonBuilder, channelMention, EmbedBuilder, messageLink } from '@discordjs/builders';
import { container, UserError } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { ButtonStyle, RESTJSONErrorCodes, type GuildTextBasedChannel, type MessageContextMenuCommandInteraction } from 'discord.js';

export async function sendMessageToStarboard(interaction: MessageContextMenuCommandInteraction, amountOfStarsForMessage: number) {
	const content = `${getStarEmojiForAmount(amountOfStarsForMessage)} **${amountOfStarsForMessage}** | ${channelMention(interaction.channelId)}`;
	const starboardChannel = await resolveOnErrorCodes(interaction.guild!.channels.fetch(StarboardChannelId), RESTJSONErrorCodes.MissingAccess);

	if (!starboardChannel?.isTextBased()) {
		throw new UserError({
			identifier: ErrorIdentifiers.StarboardChannelNotFound,
			message: 'The starboard channel was not found.'
		});
	}

	const alreadyPostedMessage = await container.prisma.starboardBoardMessage.findFirst({
		where: {
			channelId: BigInt(interaction.channelId),
			guildId: BigInt(interaction.guildId!),
			messageId: BigInt(interaction.targetId!)
		}
	});

	if (isNullish(alreadyPostedMessage)) {
		return postMessage(interaction, starboardChannel, content, amountOfStarsForMessage);
	}

	const discordMessage = await resolveOnErrorCodes(
		starboardChannel.messages.fetch(alreadyPostedMessage.snowflake.toString()),
		RESTJSONErrorCodes.UnknownMessage,
		RESTJSONErrorCodes.MissingAccess
	);

	if (!isNullish(discordMessage)) {
		await discordMessage.edit({ content });
	}

	const starEmoji = getStarEmojiForAmount(amountOfStarsForMessage);
	const starPluralized = getStarPluralizedString(amountOfStarsForMessage);
	return interaction.reply({
		content: `You just starred a message! It now has ${starEmoji} ${amountOfStarsForMessage} ${starPluralized}.\nI have edited the starboad message with the new amount.`,
		ephemeral: true
	});
}

export async function deleteMessageFromStarboard(interaction: MessageContextMenuCommandInteraction, amountOfStarsForMessage: number) {
	const starboardChannel = await resolveOnErrorCodes(interaction.guild!.channels.fetch(StarboardChannelId), RESTJSONErrorCodes.MissingAccess);

	if (!starboardChannel?.isTextBased()) {
		throw new UserError({
			identifier: ErrorIdentifiers.StarboardChannelNotFound,
			message: 'The starboard channel was not found.'
		});
	}

	const alreadyPostedMessage = await container.prisma.starboardBoardMessage.findFirst({
		where: {
			channelId: BigInt(interaction.channelId),
			guildId: BigInt(interaction.guildId!),
			messageId: BigInt(interaction.targetId!)
		}
	});

	if (isNullish(alreadyPostedMessage)) {
		// The message that was unstarred was never on the starboard to begin with
		const starEmoji = getStarEmojiForAmount(amountOfStarsForMessage);
		const starPluralized = getStarPluralizedString(amountOfStarsForMessage);
		return interaction.reply({
			content: `Successfully removed your star. The message now has ${starEmoji} ${amountOfStarsForMessage} ${starPluralized}.`,
			ephemeral: true
		});
	}

	const deletedStarboardMessageEntry = await container.prisma.starboardBoardMessage.delete({
		where: {
			snowflake_channelId_guildId_messageId: {
				channelId: BigInt(interaction.channelId),
				guildId: BigInt(interaction.guildId!),
				snowflake: alreadyPostedMessage.snowflake,
				messageId: BigInt(interaction.targetId!)
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

	return interaction.reply({
		content: `Successfully removed your star.\nThis dropped the message below the threshold of ${StarboardThreshold} so I have deleted the message from the starboard.`,
		ephemeral: true
	});
}

async function postMessage(
	interaction: MessageContextMenuCommandInteraction,
	starboardChannel: GuildTextBasedChannel,
	content: string,
	amountOfStarsForMessage: number
) {
	const embedOfStarredMessage = buildEmbed(interaction.targetMessage);

	const messageOnStarboard = await starboardChannel.send({
		content,
		embeds: [embedOfStarredMessage],
		components: [buildLinkButtons(interaction)]
	});

	await container.prisma.starboardBoardMessage.create({
		data: {
			channelId: BigInt(interaction.channelId),
			guildId: BigInt(interaction.guildId!),
			snowflake: BigInt(messageOnStarboard.id),
			messageId: BigInt(interaction.targetId!)
		}
	});

	const starEmoji = getStarEmojiForAmount(amountOfStarsForMessage);
	const starPluralized = getStarPluralizedString(amountOfStarsForMessage);
	return interaction.reply({
		content: `You just starred a message! It now has ${starEmoji} ${amountOfStarsForMessage} ${starPluralized}.\nThis means it has passed the threshold, so I have added it to the starboard.`,
		ephemeral: true
	});
}

function buildEmbed(message: MessageContextMenuCommandInteraction['targetMessage']) {
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

function buildLinkButtons(interaction: MessageContextMenuCommandInteraction) {
	const actionRow = new ActionRowBuilder<ButtonBuilder>();

	const originalMessageButton = new ButtonBuilder() //
		.setLabel('Original Message')
		.setURL(interaction.targetMessage.url)
		.setStyle(ButtonStyle.Link);

	actionRow.addComponents(originalMessageButton);

	if (interaction.targetMessage.reference && interaction.targetMessage.reference.messageId && interaction.targetMessage.reference.guildId) {
		const referencedMessageUrl = messageLink(
			interaction.targetMessage.reference.channelId,
			interaction.targetMessage.reference.messageId,
			interaction.targetMessage.reference.guildId
		);

		const referencedMessageButton = new ButtonBuilder() //
			.setLabel('Referenced Message')
			.setURL(referencedMessageUrl)
			.setStyle(ButtonStyle.Link);

		actionRow.addComponents(referencedMessageButton);
	}

	return actionRow;
}
