import { Card, CardContent, Typography } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { LinearIssue, Priority } from '../../types'
import { PRIORITY_LABELS, PRIORITY_COLORS, ALL_PRIORITIES } from '../../constants'

interface PriorityChartProps {
  issues: LinearIssue[]
}

const buildChartData = (issues: LinearIssue[]) =>
  ALL_PRIORITIES.map((p) => ({
    name: PRIORITY_LABELS[p],
    count: issues.filter((i) => i.priority === p).length,
    color: PRIORITY_COLORS[p as Priority]
  })).filter((d) => d.count > 0)

export const PriorityChart = ({ issues }: PriorityChartProps) => {
  const data = buildChartData(issues)

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Priority Breakdown</Typography>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [v, 'Tickets']} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map(({ name, color }) => (
                <Cell key={name} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
