import { envParseArray } from '@skyra/env-utilities';

export function getGuildIds(): string[] {
	return envParseArray('COMMAND_GUILD_IDS', []);
}
