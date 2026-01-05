import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class WeavelyApi implements ICredentialType {
	name = 'weavelyApi';

	displayName = 'Weavely API';

	documentationUrl = 'https://weavely.ai/docs';

	icon: Icon = { light: 'file:WeavelyTrigger.svg', dark: 'file:WeavelyTrigger.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Weavely personal token',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.weavely.ai',
			url: '/v1/teams',
			method: 'GET',
		},
	};
}