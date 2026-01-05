"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeavelyTrigger = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class WeavelyTrigger {
    constructor() {
        this.description = {
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
                    description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
                    description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                },
            ],
        };
        this.methods = {
            loadOptions: {
                async getTeams() {
                    const options = [];
                    try {
                        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'weavelyApi', {
                            method: 'GET',
                            url: 'https://api.weavely.ai/v1/teams',
                            json: true,
                        });
                        const teams = response.items;
                        if (Array.isArray(teams)) {
                            for (const team of teams) {
                                options.push({
                                    name: team.name,
                                    value: team.id,
                                });
                            }
                        }
                        else {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'The teams response from Weavely API is in an unexpected format. Please verify your credentials and try again.');
                        }
                    }
                    catch (error) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unable to load teams from Weavely. ${error.message}`);
                    }
                    return options;
                },
                async getForms() {
                    const teamId = this.getCurrentNodeParameter('teamId');
                    const options = [];
                    if (!teamId) {
                        return options;
                    }
                    try {
                        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'weavelyApi', {
                            method: 'GET',
                            url: `https://api.weavely.ai/v1/teams/${teamId}/forms`,
                            json: true,
                        });
                        const forms = response.items;
                        if (Array.isArray(forms)) {
                            for (const form of forms) {
                                options.push({
                                    name: form.name || form.title || form.id,
                                    value: form.id,
                                });
                            }
                        }
                        else {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'The forms response from Weavely API is in an unexpected format. Please verify the selected team and try again.');
                        }
                    }
                    catch (error) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unable to load forms for the selected team. ${error.message}`);
                    }
                    return options;
                },
            },
        };
        this.webhookMethods = {
            default: {
                async checkExists() {
                    const webhookData = this.getWorkflowStaticData('node');
                    if (webhookData.webhookId === undefined) {
                        return false;
                    }
                    const formId = this.getNodeParameter('formId');
                    try {
                        await this.helpers.httpRequestWithAuthentication.call(this, 'weavelyApi', {
                            method: 'GET',
                            url: `https://api.weavely.ai/v1/forms/${formId}/webhooks/${webhookData.webhookId}`,
                            json: true,
                        });
                        return true;
                    }
                    catch (error) {
                        if (error.statusCode === 404) {
                            delete webhookData.webhookId;
                            return false;
                        }
                        throw error;
                    }
                },
                async create() {
                    var _a, _b;
                    const webhookUrl = this.getNodeWebhookUrl('default');
                    const formId = this.getNodeParameter('formId');
                    const webhookData = this.getWorkflowStaticData('node');
                    try {
                        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'weavelyApi', {
                            method: 'POST',
                            url: `https://api.weavely.ai/v1/forms/${formId}/webhooks`,
                            body: {
                                url: webhookUrl,
                            },
                            json: true,
                        });
                        if (response.id === undefined) {
                            return false;
                        }
                        webhookData.webhookId = response.id;
                        return true;
                    }
                    catch (error) {
                        const errorMessage = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.message) || error.message || 'Unknown error';
                        const statusCode = error.statusCode || 'unknown';
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unable to register webhook with Weavely (Status: ${statusCode}). ${errorMessage}. Webhook URL attempted: ${webhookUrl}`);
                    }
                },
                async delete() {
                    const webhookData = this.getWorkflowStaticData('node');
                    const formId = this.getNodeParameter('formId');
                    if (webhookData.webhookId !== undefined) {
                        try {
                            await this.helpers.httpRequestWithAuthentication.call(this, 'weavelyApi', {
                                method: 'DELETE',
                                url: `https://api.weavely.ai/v1/forms/${formId}/webhooks/${webhookData.webhookId}`,
                                json: true,
                            });
                        }
                        catch {
                            return false;
                        }
                        delete webhookData.webhookId;
                    }
                    return true;
                },
            },
        };
    }
    async webhook() {
        const bodyData = this.getBodyData();
        const formId = bodyData.formId;
        let returnData = bodyData;
        if (formId && Array.isArray(bodyData.answers)) {
            try {
                const response = await this.helpers.httpRequestWithAuthentication.call(this, 'weavelyApi', {
                    method: 'GET',
                    url: `https://api.weavely.ai/v1/forms/${formId}/fields`,
                    json: true,
                });
                const fields = response.fields;
                const fieldMap = {};
                if (Array.isArray(fields)) {
                    for (const field of fields) {
                        if (field.id && field.label) {
                            fieldMap[field.id] = field.label;
                        }
                    }
                }
                const enhancedAnswers = bodyData.answers.map((answer) => ({
                    ...answer,
                    label: fieldMap[answer.id] || answer.id,
                }));
                returnData = {
                    formId: bodyData.formId,
                    responseId: bodyData.responseId,
                    dateCreated: bodyData.dateCreated,
                    answers: enhancedAnswers,
                };
            }
            catch {
            }
        }
        return {
            workflowData: [[{ json: returnData }]],
        };
    }
}
exports.WeavelyTrigger = WeavelyTrigger;
//# sourceMappingURL=WeavelyTrigger.node.js.map