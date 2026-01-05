"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeavelyApi = void 0;
class WeavelyApi {
    constructor() {
        this.name = 'weavelyApi';
        this.displayName = 'Weavely API';
        this.documentationUrl = 'https://weavely.ai/docs';
        this.icon = { light: 'file:WeavelyTrigger.svg', dark: 'file:WeavelyTrigger.dark.svg' };
        this.properties = [
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
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '={{"Bearer " + $credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: 'https://api.weavely.ai',
                url: '/v1/teams',
                method: 'GET',
            },
        };
    }
}
exports.WeavelyApi = WeavelyApi;
//# sourceMappingURL=WeavelyApi.credentials.js.map