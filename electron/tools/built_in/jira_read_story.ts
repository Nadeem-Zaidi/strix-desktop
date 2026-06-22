import { JiraReader } from "../../jira/jira";
import { ToolDefinition } from "../dynamic_tool_loader";
import dotenv from "dotenv";
dotenv.config();
const JIRA_API = process.env.JIRA_API

const BASE_URL = "https://nadeemtat.atlassian.net/rest/api/2/issue";

export function jiraStoryReader(): ToolDefinition {
    return {
        name: "jira_story_reader",
        description: "Read a Jira story's description and details. Use this when the user wants to understand or design a solution for a Jira issue.",
        parameters: {
            type: "object",
            properties: {
                issueKey: {
                    type: "string",
                    description: "Jira issue key e.g. JA-1"
                }
            },
            required: ["issueKey"]
        },
        async execute(args: Record<string, any>) {
            const { issueKey } = args;
            const cleanId = issueKey.trim().toUpperCase();
            const url = `${BASE_URL}/${cleanId}`;

            const jiraReader = new JiraReader(url, JIRA_API??"");
            const response = await jiraReader.fetchDetails();
            const description = response.fields.description ?? "No description";
            const summary = response.fields.summary ?? "";
            const status = response.fields.status?.name ?? "";
            const assignee = response.fields.assignee?.displayName ?? "Unassigned";

            return {
                issueKey: cleanId,
                summary,
                status,
                assignee,
                description
            };
        }
    };
}