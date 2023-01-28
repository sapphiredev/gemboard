import { StarboardChannelId } from '#utils/constants';
import { getEmbedColorForAmount, resolveOnErrorCodes } from '#utils/functions/helpers';
import { getGuildIds } from '#utils/utils';
import { EmbedBuilder } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { deepClone } from '@sapphire/utilities';
import { PermissionFlagsBits, RESTJSONErrorCodes } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	preconditions: ['ValidServer', 'ValidCommandChannel'],
	description: 'Migrates the starboard message colors.'
})
export class SlashCommand extends Command {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDMPermission(false)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDescription(this.description),
			{ guildIds: getGuildIds() }
		);
	}

	public override async chatInputRun(interaction: ChatInputCommand.Interaction) {
		await interaction.deferReply({ ephemeral: true });

		const starboardChannel = await resolveOnErrorCodes(interaction.guild!.channels.fetch(StarboardChannelId), RESTJSONErrorCodes.MissingAccess);

		if (starboardChannel?.isTextBased()) {
			const allStarboardMessages = await this.container.prisma.starboardMessage.findMany();

			for (const starboardMessage of allStarboardMessages) {
				const amountOfStarsForMessage = await this.container.prisma.userMessage.count({ where: { messageId: starboardMessage.messageId } });
				const discordMessage = await resolveOnErrorCodes(
					starboardChannel.messages.fetch(starboardMessage.snowflake.toString()),
					RESTJSONErrorCodes.UnknownMessage
				);

				if (!discordMessage) continue;

				const clonedEmbeds = deepClone(discordMessage.embeds).map((em) => em.data);
				const starMsgEmbed = discordMessage.embeds.at(-1);

				if (starMsgEmbed) {
					const newEmbed = new EmbedBuilder(starMsgEmbed.data);

					newEmbed.setColor(getEmbedColorForAmount(amountOfStarsForMessage));

					clonedEmbeds.splice(-1, 1, newEmbed.toJSON());
				}

				discordMessage.edit({ embeds: clonedEmbeds });
			}
		}

		await interaction.editReply({ content: 'Done!' });
	}
}
