import { Grid, Card, CardContent, Typography, Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { LinearIssue, StateType } from '../../types'
import { STATE_TYPE_COLORS } from '../../constants'

const StatCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(0.5)
}))

const ColorDot = styled(Box)<{ dotcolor: string }>(({ dotcolor }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: dotcolor,
  flexShrink: 0
}))

const StatLabel = styled(Typography)({ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 })
const StatValue = styled(Typography)({ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 })

const STATE_STATS: { type: StateType | 'total'; label: string; color: string }[] = [
  { type: 'total', label: 'Total Tickets', color: '#5E6AD2' },
  { type: 'started', label: 'In Progress', color: STATE_TYPE_COLORS.started },
  { type: 'unstarted', label: 'Todo', color: STATE_TYPE_COLORS.unstarted },
  { type: 'backlog', label: 'Backlog', color: STATE_TYPE_COLORS.backlog },
  { type: 'completed', label: 'Done', color: STATE_TYPE_COLORS.completed },
  { type: 'cancelled', label: 'Cancelled', color: STATE_TYPE_COLORS.cancelled }
]

interface StatsCardsProps {
  issues: LinearIssue[]
}

const countByStateType = (issues: LinearIssue[], type: StateType): number =>
  issues.filter((i) => i.state.type === type).length

export const StatsCards = ({ issues }: StatsCardsProps) => (
  <Grid container spacing={2}>
    {STATE_STATS.map(({ type, label, color }) => {
      const count = type === 'total' ? issues.length : countByStateType(issues, type)
      return (
        <Grid item xs={6} sm={4} md={2} key={type}>
          <StatCard>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <ColorDot dotcolor={color} />
                <StatLabel>{label}</StatLabel>
              </Box>
              <StatValue>{count}</StatValue>
            </CardContent>
          </StatCard>
        </Grid>
      )
    })}
  </Grid>
)
