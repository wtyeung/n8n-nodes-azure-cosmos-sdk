import type { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeListSearchResult, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class AzureCosmosSdk implements INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
    methods: {
        listSearch: {
            getDatabases(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
            getContainers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
            getContainersForDocOps(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
        };
    };
}
