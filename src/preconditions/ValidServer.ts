import { Precondition } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import type { BaseInteraction, ChatInputCommandInteraction, ContextMenuCommandInteraction } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override chatInputRun(interaction: ChatInputCommandInteraction) {
		return this.doServerCheck(interaction);
	}

	public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
		return this.doServerCheck(interaction);
	}

	private doServerCheck(interaction: BaseInteraction) {
		if (!interaction.guildId || envParseString('COMMAND_GUILD_ID') !== interaction.guildId) {
			return this.error({
				message: 'This command can only be used in registered servers.'
			});
		}

		return this.ok();
	}
}
