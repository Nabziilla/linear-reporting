import { useMemo } from 'react'
import { Grid, Card, CardActionArea, CardContent, Typography, Box, Tooltip } from '@mui/material'
import { styled } from '@mui/material/styles'
import { LinearIssue, StateType } from '../../types'
import { ALL_STATE_TYPES, STATE_TYPE_LABELS, STATE_TYPE_COLORS } from '../../constants'
import { useLinearTeams } from '../../hooks/useLinearData'

export const ALL_TEAMS_KEY = '__all__'

const SummaryCard = styled(Card, { shouldForwardProp: (p) => p !== 'selected' })<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    border: selected ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent',
    boxShadow: selected ? `0 0 0 2px ${theme.palette.primary.main}33` : undefined,
    transition: 'border-color 0.15s, box-shadow 0.15s'
  })
)

const StackedBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  height: 8,
  borderRadius: 4,
  overflow: 'hidden',
  backgroundColor: theme.palette.action.hover
}))

interface TeamSummary {
  key: string
  name: string
  total: number
  byType: Record<StateType, number>
}

const emptyByType = (): Record<StateType, number> =>
  Object.fromEntries(ALL_STATE_TYPES.map((t) => [t, 0])) as Record<StateType, number>

// Teams come from Linear itself, so the cards always match the workspace.
// Every team is seeded first, which means a team with no tickets still gets a
// card (at zero) rather than silently vanishing from the dashboard.
const buildTeamSummaries = (issues: LinearIssue[], teamNames: string[]): TeamSummary[] => {
  const byTeam = new Map<string, TeamSummary>()
  for (const name of teamNames) {
    byTeam.set(name, { key: name, name, total: 0, byType: emptyByType() })
  }
  const allTeams: TeamSummary = { key: ALL_TEAMS_KEY, name: 'All Teams', total: 0, byType: emptyByType() }
  for (const i of issues) {
    const teamName = i.team?.name ?? 'Unknown'
    let summary = byTeam.get(teamName)
    if (!summary) {
      summary = { key: teamName, name: teamName, total: 0, byType: emptyByType() }
      byTeam.set(teamName, summary)
    }
    summary.total += 1
    allTeams.total += 1
    const t = i.state?.type as StateType | undefined
    if (t && ALL_STATE_TYPES.includes(t)) {
      summary.byType[t] += 1
      allTeams.byType[t] += 1
    }
  }
  // Alphabetical, so cards keep stable positions between loads. "All Teams"
  // stays pinned first as the overview.
  const rest = Array.from(byTeam.values()).sort((a, b) => a.name.localeCompare(b.name))
  return [allTeams, ...rest]
}

interface TeamSummaryCardsProps {
  issues: LinearIssue[]
  selectedTeam: string
  onSelectTeam: (teamKey: string) => void
}

export const TeamSummaryCards = ({ issues, selectedTeam, onSelectTeam }: TeamSummaryCardsProps) => {
  const { data: teams } = useLinearTeams()
  const teamNames = useMemo(() => (teams ?? []).map((t) => t.name), [teams])
  const summaries = useMemo(() => buildTeamSummaries(issues, teamNames), [issues, teamNames])

  return (
    <Grid container spacing={2}>
      {summaries.map(({ key, name, total, byType }) => {
        const active = byType.triage + byType.backlog + byType.unstarted + byType.started
        const selected = key === selectedTeam
        const isEmpty = total === 0
        return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
            <SummaryCard selected={selected}>
              <CardActionArea onClick={() => onSelectTeam(key)} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography
                    variant="overline"
                    color={selected ? 'primary' : 'text.secondary'}
                    sx={{ lineHeight: 1.2, fontWeight: selected ? 700 : 500 }}
                  >
                    {name}
                  </Typography>
                  <Typography
                    variant="h4"
                    color={isEmpty ? 'text.disabled' : 'text.primary'}
                    sx={{ fontWeight: 700, lineHeight: 1.1, mt: 0.5 }}
                  >
                    {total}
                  </Typography>
                  {isEmpty ? (
                    <Typography variant="caption" color="text.disabled" display="block" mb={1.5}>
                      no tickets returned
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                      {active} active · {byType.completed} done · {byType.canceled} cancelled
                      {byType.duplicate > 0 ? ` · ${byType.duplicate} duplicate` : ''}
                    </Typography>
                  )}

                  <StackedBar>
                    {ALL_STATE_TYPES.map((t) => {
                      const v = byType[t]
                      if (!v) return null
                      const pct = total > 0 ? (v / total) * 100 : 0
                      return (
                        <Tooltip
                          key={t}
                          title={`${STATE_TYPE_LABELS[t]}: ${v} (${Math.round(pct)}%)`}
                          arrow
                        >
                          <Box
                            sx={{
                              width: `${pct}%`,
                              backgroundColor: STATE_TYPE_COLORS[t]
                            }}
                          />
                        </Tooltip>
                      )
                    })}
                  </StackedBar>
                </CardContent>
              </CardActionArea>
            </SummaryCard>
          </Grid>
        )
      })}
    </Grid>
  )
}
