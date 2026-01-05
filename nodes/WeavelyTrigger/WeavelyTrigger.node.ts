import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class WeavelyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Weavely Trigger',
		name: 'weavelyTrigger',
		icon: { light: 'file:WeavelyTrigger.svg', dark: 'file:WeavelyTrigger.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a form submission is received from Weavely',
		defaults: {
			name: 'Weavely Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'weavelyApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Team Name or ID',
				name: 'teamId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Form Name or ID',
				name: 'formId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getForms',
					loadOptionsDependsOn: ['teamId'],
				},
				displayOptions: {
					hide: {
						teamId: [''],
					},
				},
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
		],
	};

	methods = {
		loadOptions: {
			// Load teams for the dropdown
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const options: INodePropertyOptions[] = [];

				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'weavelyApi',
						{
							method: 'GET',
							url: 'https://api.weavely.ai/v1/teams',
							json: true,
						},
					);

					// Response format: { totalItems: number, items: array }
					const teams = response.items;

					if (Array.isArray(teams)) {
						for (const team of teams) {
							options.push({
								name: team.name,
								value: team.id,
							});
						}
					} else {
						throw new NodeOperationError(
							this.getNode(),
							'The teams response from Weavely API is in an unexpected format. Please verify your credentials and try again.',
						);
					}
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Unable to load teams from Weavely. ${error.message}`,
					);
				}

				return options;
			},

			// Load forms for the selected team
			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const teamId = this.getCurrentNodeParameter('teamId') as string;
				const options: INodePropertyOptions[] = [];

				if (!teamId) {
					return options;
				}

				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'weavelyApi',
						{
							method: 'GET',
							url: `https://api.weavely.ai/v1/teams/${teamId}/forms`,
							json: true,
						},
					);

					// Response format: { totalItems: number, items: array }
					const forms = response.items;

					if (Array.isArray(forms)) {
						for (const form of forms) {
							options.push({
								name: form.name || form.title || form.id,
								value: form.id,
							});
						}
					} else {
						throw new NodeOperationError(
							this.getNode(),
							'The forms response from Weavely API is in an unexpected format. Please verify the selected team and try again.',
						);
					}
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Unable to load forms for the selected team. ${error.message}`,
					);
				}

				return options;
			},
		},
	};

	// Webhook lifecycle methods
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}

				const formId = this.getNodeParameter('formId') as string;

				try {
					// Try to get the webhook to see if it still exists
					await this.helpers.httpRequestWithAuthentication.call(this, 'weavelyApi', {
						method: 'GET',
						url: `https://api.weavely.ai/v1/forms/${formId}/webhooks/${webhookData.webhookId}`,
						json: true,
					});
					return true;
				} catch (error) {
					// If 404, webhook doesn't exist
					if (error.statusCode === 404) {
						delete webhookData.webhookId;
						return false;
					}
					throw error;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const formId = this.getNodeParameter('formId') as string;
				const webhookData = this.getWorkflowStaticData('node');

				try {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'weavelyApi',
						{
							method: 'POST',
							url: `https://api.weavely.ai/v1/forms/${formId}/webhooks`,
							body: {
								url: webhookUrl,
							},
							json: true,
						},
					);

					if (response.id === undefined) {
						return false;
					}

					webhookData.webhookId = response.id as string;
					return true;
				} catch (error) {
					// Enhanced error message to show what actually went wrong
					const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
					const statusCode = error.statusCode || 'unknown';
					throw new NodeOperationError(
						this.getNode(),
						`Unable to register webhook with Weavely (Status: ${statusCode}). ${errorMessage}. Webhook URL attempted: ${webhookUrl}`,
					);
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const formId = this.getNodeParameter('formId') as string;

				if (webhookData.webhookId !== undefined) {
					try {
						await this.helpers.httpRequestWithAuthentication.call(this, 'weavelyApi', {
							method: 'DELETE',
							url: `https://api.weavely.ai/v1/forms/${formId}/webhooks/${webhookData.webhookId}`,
							json: true,
						});
					} catch {
						return false;
					}

					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const formId = bodyData.formId as string;

		let returnData: IDataObject = bodyData;

		// Always fetch form fields and map answer IDs to labels for better readability
		if (formId && Array.isArray(bodyData.answers)) {
			try {
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'weavelyApi',
					{
						method: 'GET',
						url: `https://api.weavely.ai/v1/forms/${formId}/fields`,
						json: true,
					},
				);

				// Response format: { formId, version, fields: array }
				const fields = response.fields;

				// Create a map of field IDs to labels
				const fieldMap: { [key: string]: string } = {};
				if (Array.isArray(fields)) {
					for (const field of fields) {
						if (field.id && field.label) {
							fieldMap[field.id] = field.label;
						}
					}
				}

				// Enhance answers with labels
				const enhancedAnswers = (bodyData.answers as IDataObject[]).map((answer) => ({
					...answer,
					label: fieldMap[answer.id as string] || answer.id,
				}));

				returnData = {
					formId: bodyData.formId,
					responseId: bodyData.responseId,
					dateCreated: bodyData.dateCreated,
					answers: enhancedAnswers,
				};
			} catch {
				// If fetching fields fails, just return the original data
				// Silently fail to avoid breaking the webhook
			}
		}

		return {
			workflowData: [[{ json: returnData }]],
		};
	}
}