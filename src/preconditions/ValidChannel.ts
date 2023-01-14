import { bannedChannels } from '#utils/constants';
import { Precondition } from '@sapphire/framework';
import type { BaseInteraction, ChatInputCommandInteraction, ContextMenuCommandInteraction } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override chatInputRun(interaction: ChatInputCommandInteraction) {
		return this.doChannelCheck(interaction);
	}

	public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
		return this.doChannelCheck(interaction);
	}

	private doChannelCheck(interaction: BaseInteraction) {
		if (!interaction.channelId || bannedChannels.has(interaction.channelId)) {
			return this.error({
				message: 'This command cannot be used in this channel.'
			});
		}

		return this.ok();
	}
}
