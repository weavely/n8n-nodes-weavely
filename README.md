# Weavely Trigger for n8n

An n8n community node that enables workflow automation based on Weavely form submissions. Automatically process form responses and build powerful automations with your Weavely forms.

## Installation

Install this node directly from n8n by following the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/).

## Configuration

### Prerequisites
You'll need a Weavely Personal Token to authenticate the integration. Generate one from [https://forms.weavely.ai/settings?tab=personal-tokens](https://forms.weavely.ai/settings?tab=personal-tokens).

### Setup Steps

1. Add the **Weavely Trigger** node to your workflow
2. Set up authentication:
   - Click "Create New Credential"
   - Enter your Weavely Personal Token
   - Test the connection
3. Choose your team from the dropdown
4. Select which form should trigger the workflow
5. Activate your workflow

When someone submits the selected form, your workflow will automatically run with the submission data.

## Output Data

The trigger provides clean, structured data for each submission:

- **Form metadata**: Form ID, response ID, submission timestamp
- **Field answers**: Each answer includes both the value and human-readable field label
- **Type information**: Understand what type of data each field contains

All field IDs are automatically mapped to their corresponding question labels for easier workflow building.

## Developers

For instructions on testing this node on a local n8n instance for development purposes, see [https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/)

## License

[MIT](https://github.com/weavely-ai/n8n-nodes-weavely-ai/blob/main/LICENSE)