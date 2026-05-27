import { LinearIssue, LinearTeam, LinearUser } from '../types'
import { LINEAR_GRAPHQL_ENDPOINT, ISSUES_PER_PAGE } from '../constants'

const ISSUES_QUERY = `
  query Issues($first: Int!, $after: String) {
    issues(first: $first, after: $after, orderBy: updatedAt) {
      nodes {
        id identifier title description priority priorityLabel
        state { id name type color }
        assignee { id name email avatarUrl }
        team { id name key }
        createdAt updatedAt completedAt dueDate estimate url
        labels { nodes { name color } }
        project { id name }
        comments(first: 5, orderBy: updatedAt) {
          nodes { id body createdAt user { name email } }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const TEAMS_QUERY = `
  query Teams {
    teams {
      nodes {
        id name key
        states { nodes { id name type color } }
      }
    }
  }
`

const VIEWER_QUERY = `query Viewer { viewer { id name email } }`

const MEMBERS_QUERY = `
  query Members {
    users(filter: { active: { eq: true } }) {
      nodes { id name email avatarUrl }
    }
  }
`

const executeQuery = async (apiKey: string, query: string, variables?: object) => {
  const response = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) throw new Error(`Linear API error: ${response.status}`)

  const json = await response.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)

  return json.data
}

export const fetchViewer = async (apiKey: string) => {
  const data = await executeQuery(apiKey, VIEWER_QUERY)
  return data.viewer as { id: string; name: string; email: string }
}

export const fetchAllIssues = async (apiKey: string): Promise<LinearIssue[]> => {
  const all: LinearIssue[] = []
  let hasNextPage = true
  let cursor: string | undefined

  while (hasNextPage) {
    const data = await executeQuery(apiKey, ISSUES_QUERY, {
      first: ISSUES_PER_PAGE,
      after: cursor
    })

    const { nodes, pageInfo } = data.issues
    all.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...nodes.map((n: any) => {
        const commentNodes = n.comments?.nodes ?? []
        const hasMoreComments = !!n.comments?.pageInfo?.hasNextPage
        return {
          ...n,
          labels: n.labels?.nodes ?? [],
          comments: commentNodes,
          commentCount: commentNodes.length,
          hasMoreComments
        }
      })
    )
    hasNextPage = pageInfo.hasNextPage
    cursor = pageInfo.endCursor
  }

  return all
}

export const fetchTeams = async (apiKey: string): Promise<LinearTeam[]> => {
  const data = await executeQuery(apiKey, TEAMS_QUERY)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.teams.nodes.map((t: any) => ({ ...t, states: t.states?.nodes ?? [] }))
}

export const fetchMembers = async (apiKey: string): Promise<LinearUser[]> => {
  const data = await executeQuery(apiKey, MEMBERS_QUERY)
  return data.users.nodes
}
