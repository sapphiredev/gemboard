// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import { srcFolder } from '#utils/constants';
import { LogLevel } from '@sapphire/framework';
import { cast } from '@sapphire/utilities';
import { envParseInteger, envParseString, setup } from '@skyra/env-utilities';
import { ActivityType, GatewayIntentBits, type ActivitiesOptions, type ClientOptions } from 'discord.js';
import type { RedisOptions } from 'ioredis';

setup(new URL('.env', srcFolder));

export const OWNERS = ['268792781713965056', '139836912335716352'];

function parsePresenceActivity(): ActivitiesOptions[] {
	const { CLIENT_PRESENCE_NAME } = process.env;
	if (!CLIENT_PRESENCE_NAME) return [];

	return [
		{
			name: CLIENT_PRESENCE_NAME,
			type: cast<Exclude<ActivityType, ActivityType.Custom>>(envParseString('CLIENT_PRESENCE_TYPE', 'WATCHING'))
		}
	];
}

export function parseRedisOption(): Pick<RedisOptions, 'port' | 'password' | 'host'> {
	return {
		port: envParseInteger('REDIS_PORT'),
		password: envParseString('REDIS_PASSWORD'),
		host: envParseString('REDIS_HOST')
	};
}

export const CLIENT_OPTIONS: ClientOptions = {
	intents: [GatewayIntentBits.Guilds],
	allowedMentions: { users: [], roles: [] },
	presence: { activities: parsePresenceActivity() },
	loadDefaultErrorListeners: true,
	logger: { level: envParseString('NODE_ENV') === 'production' ? LogLevel.Info : LogLevel.Debug }
};
