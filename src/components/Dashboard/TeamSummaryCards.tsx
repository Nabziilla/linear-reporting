import { Grid, Card, CardActionArea, CardContent, Typography, Box, Tooltip } from '@mui/material'
import { styled } from '@mui/material/styles'
import { LinearIssue, StateType } from '../../types'
import { ALL_STATE_TYPES, STATE_TYPE_LABELS, STATE_TYPE_COLORS } from '../../constants'

export const ALL_TEAMS_KEY = '__all__'

const EXPECTED_TEAMS = ['CORE', 'Operator Core', 'Member Core', 'Member App', 'Operator Intelligence']

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

const StackedBar = styled(Box)({
  display: 'flex',
  width: '100%',
  height: 8,
  borderRadius: 4,
  overflow: 'hidden',
  backgroundColor: '#1e293b'
})

interface TeamSummary {
  key: string
  name: string
  total: number
  byType: Record<StateType, number>
}

const emptyByType = (): Record<StateType, number> =>
  Object.fromEntries(ALL_STATE_TYPES.map((t) => [t, 0])) as Record<StateType, number>

const buildTeamSummaries = (issues: LinearIssue[]): TeamSummary[] => {
  const byTeam = new Map<string, TeamSummary>()
  for (const name of EXPECTED_TEAMS) {
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
  return [allTeams, ...Array.from(byTeam.values())]
}

interface TeamSummaryCardsProps {
  issues: LinearIssue[]
  selectedTeam: string
  onSelectTeam: (teamKey: string) => void
}

export const TeamSummaryCards = ({ issues, selectedTeam, onSelectTeam }: TeamSummaryCardsProps) => {
  const summaries = buildTeamSummaries(issues)

  return (
    <Grid container spacing={2}>
      {summaries.map(({ key, name, total, byType }) => {
        const active = byType.triage + byType.backlog + byType.unstarted + byType.started
        const selected = key === selectedTeam
        return (
          <Grid item xs={12} sm={6} md={4} lg={2} key={key}>
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
                  <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1, mt: 0.5 }}>
                    {total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    {active} active · {byType.completed} done · {byType.canceled} cancelled
                  </Typography>

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
