import { AppState } from "../app_state/app_state";
import { MessageRepository } from "../database/message_repository";
import { LLMTool } from "../tools/tool_registry";
import { OpenAIProvider } from "./adapters/openai_adapter";
import { LLMFactory } from "./llm_factory";
import { ILLM, LLMConfig, LLMType } from "./llm_types_and_interfaces/types";


export class LLMManager{
    private static instance:LLMManager;
    private llm:Map<string,ILLM>=new Map();

    private constructor(){

    }

    static getInstance(){
        if(!LLMManager.instance){
            LLMManager.instance=new LLMManager();
        }
        return LLMManager.instance;
    }

    getLLMs(){
        return Array.from(this.llm.keys())
    }

    addLLM(name:string,apiKey:string,llmType:LLMType,config:LLMConfig,tools:LLMTool,messageRepository:MessageRepository,appState:AppState){
        const llm=this.llm.has(name)
        if(llm){
            throw new Error(`llm with name "${name}" already exists`);
        }
        const adapter=LLMFactory.createLLM(apiKey,llmType,config,tools,messageRepository,appState)
        this.llm.set(name,adapter);
        return adapter;
    }

    getLLM(name:string){
        const llm=this.llm.get(name);
        if(!llm){
            throw new Error(`LL with name "${name}" not found`);
        }
        return llm;
    }
}

