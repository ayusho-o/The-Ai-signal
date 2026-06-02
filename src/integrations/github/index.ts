import type { IntegrationDefinition } from "@/types";

// STUBBED

export const githubIntegration: IntegrationDefinition = {
  id: "github",
  displayName: "GitHub",
  description: "Create issues, comment on PRs, and trigger workflows. STUBBED.",
  authType: "oauth2",
  implemented: false,
  triggers: [
    { event: "created", description: "Dev task/issue created" },
    { event: "status_changed", description: "Dev task status changed" },
  ],
  actions: [
    {
      id: "create_issue",
      name: "Create Issue",
      description: "Create a GitHub issue",
      inputSchema: [
        { name: "owner", type: "string", required: true, description: "Repository owner" },
        { name: "repo", type: "string", required: true, description: "Repository name" },
        { name: "title", type: "string", required: true, description: "Issue title" },
        { name: "body", type: "string", required: false, description: "Issue body markdown" },
        { name: "labels", type: "json", required: false, description: "Array of label names" },
        { name: "assignees", type: "json", required: false, description: "Array of GitHub usernames" },
      ],
      outputSchema: [
        { name: "issueNumber", type: "integer", required: true, description: "GitHub issue number" },
        { name: "issueUrl", type: "string", required: true, description: "Issue URL" },
      ],
    },
    {
      id: "trigger_workflow",
      name: "Trigger Workflow",
      description: "Trigger a GitHub Actions workflow_dispatch event",
      inputSchema: [
        { name: "owner", type: "string", required: true, description: "Repository owner" },
        { name: "repo", type: "string", required: true, description: "Repository name" },
        { name: "workflowId", type: "string", required: true, description: "Workflow file name or ID" },
        { name: "ref", type: "string", required: true, description: "Branch or tag to run on" },
        { name: "inputs", type: "json", required: false, description: "Workflow input key-value pairs" },
      ],
      outputSchema: [
        { name: "success", type: "boolean", required: true, description: "Dispatch success" },
      ],
    },
  ],
};
