import { AppState } from "../app_state/app_state";
import { MessageRepository } from "../database/message_repository";
import { LLMTool } from "../tools/tool_registry";
import { OpenAIProvider } from "./adapters/openai_adapter";
import { LLMConfig, LLMMessage, LLMType } from "./llm_types_and_interfaces/types";



export class LLMFactory{
    static createLLM(apiKey:string,llmType:LLMType,config:LLMConfig,tools:LLMTool,messageRepository:MessageRepository,appState:AppState){
        switch(llmType){
            case LLMType.OpenAi:
                return new OpenAIProvider(apiKey,config,tools,messageRepository,appState);
            default:
                throw new Error(`Unsupported llm type :${llmType}`);
        }

    }

}