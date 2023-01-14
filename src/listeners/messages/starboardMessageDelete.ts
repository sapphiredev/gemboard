import { StarboardChannelId } from '#utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import type { Message } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.MessageDelete
})
export class UserListener extends Listener<typeof Events.MessageDelete> {
	public async run(message: Message) {
		if (message.guildId === envParseString('COMMAND_GUILD_ID')) return;
		if (message.channelId !== StarboardChannelId) return;

		const starboardMessage = await this.container.prisma.starboardMessage.findFirst({
			where: {
				snowflake: BigInt(message.id)
			}
		});

		if (isNullish(starboardMessage)) return;

		await this.container.prisma.starboardMessage.delete({
			where: {
				snowflake_authorId_channelId_guildId_messageId: starboardMessage
			}
		});
	}
}
