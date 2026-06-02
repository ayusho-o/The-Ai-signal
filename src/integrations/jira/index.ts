import type { IntegrationDefinition } from "@/types";

// IMPLEMENTED: Full registry metadata
// Actual Jira REST API calls stubbed — implement with Atlassian REST API v3

export const jiraIntegration: IntegrationDefinition = {
  id: "jira",
  displayName: "Jira",
  description:
    "Create and manage Jira issues, update statuses, and sync tasks with Atlassian Jira",
  authType: "api_key",
  implemented: true,
  triggers: [
    {
      event: "created",
      description: "Triggered when a task or project item is created",
    },
    {
      event: "updated",
      description: "Triggered when a task is updated",
    },
    {
      event: "status_changed",
      description: "Triggered when issue status changes",
    },
  ],
  actions: [
    {
      id: "create_issue",
      name: "Create Issue",
      description: "Create a new Jira issue",
      inputSchema: [
        { name: "projectKey", type: "string", required: true, description: "Jira project key (e.g. ENG)" },
        { name: "summary", type: "string", required: true, description: "Issue title/summary" },
        { name: "issueType", type: "string", required: true, description: "Issue type: Bug | Task | Story | Epic" },
        { name: "description", type: "string", required: false, description: "Detailed description (ADF or plain text)" },
        { name: "assignee", type: "string", required: false, description: "Assignee account ID" },
        { name: "priority", type: "string", required: false, description: "Highest | High | Medium | Low | Lowest" },
        { name: "labels", type: "json", required: false, description: "Array of label strings" },
      ],
      outputSchema: [
        { name: "issueId", type: "string", required: true, description: "Jira issue ID" },
        { name: "issueKey", type: "string", required: true, description: "Jira issue key (e.g. ENG-123)" },
        { name: "self", type: "string", required: true, description: "REST URL of the issue" },
      ],
    },
    {
      id: "update_issue_status",
      name: "Update Issue Status",
      description: "Transition a Jira issue to a new status",
      inputSchema: [
        { name: "issueKey", type: "string", required: true, description: "Jira issue key (e.g. ENG-123)" },
        { name: "transitionName", type: "string", required: true, description: "Target transition name (e.g. In Progress, Done)" },
      ],
      outputSchema: [
        { name: "success", type: "boolean", required: true, description: "Whether the transition succeeded" },
        { name: "newStatus", type: "string", required: true, description: "New issue status name" },
      ],
    },
    {
      id: "add_comment",
      name: "Add Comment",
      description: "Add a comment to a Jira issue",
      inputSchema: [
        { name: "issueKey", type: "string", required: true, description: "Jira issue key" },
        { name: "body", type: "string", required: true, description: "Comment body text" },
      ],
      outputSchema: [
        { name: "commentId", type: "string", required: true, description: "Jira comment ID" },
      ],
    },
    {
      id: "assign_issue",
      name: "Assign Issue",
      description: "Assign a Jira issue to a user",
      inputSchema: [
        { name: "issueKey", type: "string", required: true, description: "Jira issue key" },
        { name: "accountId", type: "string", required: true, description: "Assignee's Atlassian account ID" },
      ],
      outputSchema: [
        { name: "success", type: "boolean", required: true, description: "Whether assignment succeeded" },
      ],
    },
  ],
};
