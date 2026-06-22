import { JiraReader } from "../../jira/jira";
import { ToolDefinition } from "../dynamic_tool_loader";
import dotenv from "dotenv";
dotenv.config();
const JIRA_API = process.env.JIRA_API
const BASE_URL = "https://nadeetat.atlassian.net/rest/api/3/issue";

export function jiraAddComment(): ToolDefinition {
    return {
        name: "jira_add_comment",
        description: "Add a comment to a Jira issue. Use this when the user wants to comment on, update, or post a note to a Jira story.",
        parameters: {
            type: "object",
            properties: {
                issueKey: {
                    type: "string",
                    description: "Jira issue key e.g. JA-1"
                },
                comment: {
                    type: "string",
                    description: "The comment text to add. Supports markdown (bold, headings, bullet lists)."
                }
            },
            required: ["issueKey", "comment"]
        },
        async execute(args: Record<string, any>) {
            const { issueKey, comment } = args;
            const cleanId = issueKey.trim().toUpperCase();
            const url = `${BASE_URL}/${cleanId}`;

            const jiraReader = new JiraReader(url, JIRA_API??"");
            const result = await jiraReader.addComment(cleanId, comment);

            return {
                success: true,
                issueKey: cleanId,
                commentId: result.id
            };
        }
    };
}