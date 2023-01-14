import { envParseString } from '@skyra/env-utilities';

export function getGuildIds(): string[] {
	const envGuildId = envParseString('COMMAND_GUILD_ID');
	return envGuildId ? [envGuildId] : [];
}
