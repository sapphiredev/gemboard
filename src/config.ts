// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import { srcFolder } from '#utils/constants';
import { LogLevel } from '@sapphire/framework';
import { cast } from '@sapphire/utilities';
import { envParseString, setup } from '@skyra/env-utilities';
import { ActivityType, GatewayIntentBits, Partials, userMention, type ActivitiesOptions, type ClientOptions } from 'discord.js';

setup(new URL('.env', srcFolder));

export const Owners = ['268792781713965056', '139836912335716352'];
export const OwnerMentions = Owners.map(userMention);

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

export const CLIENT_OPTIONS: ClientOptions = {
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
	allowedMentions: { users: [], roles: [] },
	presence: { activities: parsePresenceActivity() },
	loadDefaultErrorListeners: false,
	partials: [Partials.Message, Partials.Reaction],
	logger: { level: envParseString('NODE_ENV') === 'production' ? LogLevel.Info : LogLevel.Debug }
};
