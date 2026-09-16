import { Grid, Card, CardContent, Typography } from '@mui/material'
import { LinearIssue, StateType } from '../../types'
import { STATE_TYPE_COLORS } from '../../constants'

const STATE_STATS: { type: StateType | 'total'; label: string; color: string; accent: string }[] = [
  { type: 'total',      label: 'Total',       color: '#6875F5', accent: 'rgba(104,117,245,0.15)' },
  { type: 'triage',     label: 'Triage',      color: STATE_TYPE_COLORS.triage,     accent: 'rgba(234,179,8,0.12)' },
  { type: 'backlog',    label: 'Backlog',      color: STATE_TYPE_COLORS.backlog,    accent: 'rgba(148,163,184,0.1)' },
  { type: 'unstarted',  label: 'Todo',         color: STATE_TYPE_COLORS.unstarted,  accent: 'rgba(59,130,246,0.12)' },
  { type: 'started',    label: 'In Progress',  color: STATE_TYPE_COLORS.started,    accent: 'rgba(249,115,22,0.12)' },
  { type: 'completed',  label: 'Done',         color: STATE_TYPE_COLORS.completed,  accent: 'rgba(34,197,94,0.12)' },
  { type: 'canceled',   label: 'Cancelled',    color: STATE_TYPE_COLORS.canceled,   accent: 'rgba(239,68,68,0.12)' },
  { type: 'duplicate',  label: 'Duplicate',    color: STATE_TYPE_COLORS.duplicate,  accent: 'rgba(168,85,247,0.12)' },
]

const countByStateType = (issues: LinearIssue[], type: StateType): number =>
  issues.filter((i) => i.state.type === type).length

interface StatsCardsProps {
  issues: LinearIssue[]
}

export const StatsCards = ({ issues }: StatsCardsProps) => (
  <Grid container spacing={2}>
    {STATE_STATS.map(({ type, label, color, accent }) => {
      const count = type === 'total' ? issues.length : countByStateType(issues, type)
      return (
        <Grid item xs={6} sm={4} md={3} lg={1.5} key={type}>
          <Card sx={{
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(135deg, #1A1D27 0%, ${accent} 100%)`,
            borderColor: `${color}30`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
              background: color,
              borderRadius: '10px 10px 0 0',
            }
          }}>
            <CardContent sx={{ pt: 2.5, pb: '16px !important' }}>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color }}>
                {count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )
    })}
  </Grid>
)
