import { Card, CardContent, Typography } from '@mui/material'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LinearIssue, StateType } from '../../types'
import { STATE_TYPE_LABELS, STATE_TYPE_COLORS } from '../../constants'

interface StatusChartProps {
  issues: LinearIssue[]
}

const buildChartData = (issues: LinearIssue[]) => {
  const counts: Partial<Record<StateType, number>> = {}
  issues.forEach((i) => {
    counts[i.state.type] = (counts[i.state.type] ?? 0) + 1
  })
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: STATE_TYPE_LABELS[type as StateType] ?? type,
      value,
      color: STATE_TYPE_COLORS[type as StateType] ?? '#9e9e9e'
    }))
}

export const StatusChart = ({ issues }: StatusChartProps) => {
  const data = buildChartData(issues)

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Status Distribution</Typography>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data.map(({ name, color }) => (
                <Cell key={name} fill={color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, 'Tickets']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
