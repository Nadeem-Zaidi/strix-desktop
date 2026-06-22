// tools/search_knowledge_base.ts

import { Embedder } from "../../embedder/embedder";
import { VectorStore } from "../../vector_store/sqlite_vec";
import { ToolDefinition } from "../dynamic_tool_loader";


export function createSearchKnowledgeBaseTool(
    vectorStore: VectorStore,
    apiKey: string
): ToolDefinition {
    const embedder = new Embedder(apiKey);

    return {
        name: "search_knowledge_base",
        description: "Search the local knowledge base for relevant information. Use this when the user asks about topics that might be in the documentation.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query to find relevant documents"
                },
                top_k: {
                    type: "number",
                    description: "Number of results to return (default: 5)"
                }
            },
            required: ["query", "top_k"]
        },
        async execute({ query, top_k = 5 }) {
            const queryEmbedding = await embedder.embedText(query);
            const results = vectorStore.search(queryEmbedding, top_k);

            if (results.length === 0) {
                return { found: false, message: "No relevant documents found." };
            }

            return {
                found: true,
                results: results.map(r => ({
                    source: r.sourceFile,
                    heading: r.heading,
                    content: r.content,
                    distance: r.distance
                }))
            };
        }
    };
}