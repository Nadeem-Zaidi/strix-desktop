export type TextContent = {
    type: string;
    text: string;
};

export type ToolCall = {
    type: string,
    id: string,
    name: string,
    arguments: Record<string,any>
}

export type ImageUrlContent = {
    type: string;
    image_url: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
    };
};

export type ImageId = {
    type: string,
    file_id: string

}

export type FileInput = {
    type: string,
    file_id: string,
    fileName?:string,
    fileExtension?:string
}

export type Tool = {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>
    }

}

export type ImageBase64Content = {
    type: string;
    source: {
        type: 'base64';
        media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        data: string;
    };
};

export type ContentPart = TextContent | ImageUrlContent | ImageBase64Content | ImageId | ToolCall;

export type LLMConfig = {
    model: string;
    apiKey?: string;
    baseURL?: string;
    temperature?: number;
    maxTokens?: number;
}

export type LLMMessageToolCall={
    type:string;
    id:string;
    name:string;
    call_id:string;
    arguments:Record<string,any>
    output:any
}

export type LLMMessage = {
    id?:string,
    role: 'system' | 'user' | 'assistant' | 'tool' |'tool_call' | 'tool_call_output';
    content: ContentPart[];
    name?:string;
    arguments?:Record<string,any>;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    output?:any;
    type?:string;
}



export type LLMResponse = {
    content: string | null;
    toolCalls?: ToolCall[] | undefined;
    finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null;
}

export interface ILLM {
    chatStream(messages: LLMMessage[], tools?: Tool[]): AsyncGenerator<StreamChunk, unknown, void>
    getProvider(): string;
    getModel(): string;
    supportsTools(): boolean
    fileUPload(fileName: string): Promise<string>
    abort(): void;
}

export type McpStatus = {
    event: "in_progress" | "arguments_delta" | "completed" | "failed";
    toolName: string;
    arguments?: string;
    output?: string;
    error?: string;
}

export type StreamChunk = {
    content: string;
    isToolCall: boolean;
    toolCalls?: Record<string, any>;
    isDone: boolean;
    mcpStatus?: McpStatus;
}

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { IDatabaseAdapter } from "../../database/idatabase";
import { AppState } from "../../app_state/app_state";

export type BreadCrumb = { name: string, prefix: string };

export type CustomIconProps = {
    icon: IconDefinition
    onClick?: (e: any) => void

}

export type FileStatus = "idle" | "uploading" | "done" | "error";

export type FileItem = {
    id: string;
    file: File;
    status: FileStatus;
    progress: number;
    error?: string;
}

export enum DatabaseType {
    MySQL = 'mysql',
    PostgreSQL = 'postgresql',
    Oracle = 'oracle',
    SQLLite = 'sqllite'
}

export enum LLMType {
    OpenAi = 'openai',
    Gemma = 'gemma',
    Claude = 'claude'
}

export interface Migration {
  version: string;
  description: string;
  up: string | string[];
  down: string | string[];
}

export interface MigrationRecord {
  id?: number;
  version: string;
  description: string;
  applied_at: Date;
  execution_time_ms: number;
}

export interface MigrationResult {
  success: boolean;
  version: string;
  description: string;
  executionTime: number;
  error?: string;
}

export interface MigrationStatus {
  pending: Migration[];
  applied: MigrationRecord[];
  current: string | null;
}

export type Session={
    id:string,
    title:string,
    model:string,
    created_at:string,
    updated_at:string
}
export interface ToolContext {
    db: IDatabaseAdapter;
    appState: AppState;
}

export interface Chunk {
    heading: string;
    level: number;
    content: string;
    codeBlocks: { lang: string; value: string }[];
    tables: { headers: string[]; rows: string[][] }[];
    sourceFile: string;
}




