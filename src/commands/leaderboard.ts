import { OWNERS } from '#root/config';
import { BrandingColors, ErrorIdentifiers } from '#utils/constants';
import { getStarEmojiForAmount } from '#utils/functions/helpers';
import { getGuildIds } from '#utils/utils';
import { EmbedBuilder } from '@discordjs/builders';
import { ApplyOptions } from '@sapphire/decorators';
import { ChatInputCommand, Command, Result, UserError } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { bold, userMention } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	preconditions: ['ValidServer', 'ValidChannel'],
	description: 'Gets the leaderboard of users who most starred messages.'
})
export class SlashCommand extends Command {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description),
			{ guildIds: getGuildIds() }
		);
	}

	public override async chatInputRun(interaction: ChatInputCommand.Interaction) {
		const starboardLeaderboardResult = await Result.fromAsync(
			() => this.container.prisma.$queryRaw<StarboardLeaderboard[]>`
				SELECT COUNT(sbm.author_id) as star_count, sbm.author_id
				FROM starboard_message sbm
				JOIN user_message um on sbm.message_id = um.message_id
				GROUP BY sbm.author_id
				ORDER BY star_count DESC
				LIMIT 10;`
		);

		const starboardLeaderboard = starboardLeaderboardResult.unwrapOrElse(() => {
			const owners = OWNERS.map(userMention);
			throw new UserError({
				identifier: ErrorIdentifiers.CannotReceiveLeaderboard,
				message: `There was an error getting the leaderboard from the leaderboard, please contact my developers: ${owners}.`
			});
		});

		let userPosition: number | null = null;

		const embedContent = starboardLeaderboard.map((entry, index) => {
			const medal = this.getMedal(index + 1);
			const mention = userMention(entry.author_id.toString());
			const starEmoji = getStarEmojiForAmount(Number(entry.star_count));
			const topThreeSplit = index === 2 ? '\n' : '';
			const leaderboardLine = `${medal} ${index + 1}: ${mention} - Stars: ${entry.star_count} ${starEmoji}${topThreeSplit}`;

			if (entry.author_id.toString() === interaction.user.id) {
				userPosition ??= index + 1;
				return bold(leaderboardLine);
			}

			return leaderboardLine;
		});

		const leaderboardPositionLine = isNullish(userPosition) ? 'Not on the leaderboard.' : `#${userPosition}`;
		const leaderboardEmbed = new EmbedBuilder()
			.setTitle('Leaderboard - Total Stars')
			.setDescription(embedContent.join('\n'))
			.setTimestamp()
			.setFooter({ text: `Your Place: ${leaderboardPositionLine}` })
			.setColor(BrandingColors.Primary);

		return interaction.reply({
			embeds: [leaderboardEmbed]
		});
	}

	private getMedal(index: number) {
		switch (index) {
			case 1:
				return '🏅';
			case 2:
				return '🥈';
			case 3:
				return '🥉';
			default:
				return `🎖`;
		}
	}
}

interface StarboardLeaderboard {
	star_count: bigint;
	author_id: bigint;
}
