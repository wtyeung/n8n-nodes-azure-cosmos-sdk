import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class AzureCosmosSdkEntraIdApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    extends: string[];
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
}
