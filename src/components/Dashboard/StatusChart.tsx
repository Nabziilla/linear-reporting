import { Card, CardContent, Typography, Box, Stack } from '@mui/material'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { LinearIssue, StateType } from '../../types'
import { STATE_TYPE_COLORS } from '../../constants'

interface StatusChartProps {
  issues: LinearIssue[]
}

interface Slice {
  name: string
  value: number
  color: string
}

const STATUS_PALETTE = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899',
  '#eab308', '#06b6d4', '#ef4444', '#84cc16', '#8b5cf6',
  '#14b8a6', '#f59e0b', '#64748b'
]

const colorFor = (i: LinearIssue, fallbackIdx: number): string => {
  const linearColor = i.state?.color
  if (linearColor && linearColor.toLowerCase() !== '#888' && !/^#[0-7][0-7]/i.test(linearColor)) {
    return linearColor
  }
  return STATE_TYPE_COLORS[i.state?.type as StateType] ?? STATUS_PALETTE[fallbackIdx % STATUS_PALETTE.length]
}

const buildChartData = (issues: LinearIssue[]): Slice[] => {
  const buckets = new Map<string, { value: number; sampleIssue: LinearIssue }>()
  for (const i of issues) {
    const name = i.state?.name || 'Unknown'
    const existing = buckets.get(name)
    if (existing) existing.value += 1
    else buckets.set(name, { value: 1, sampleIssue: i })
  }
  return Array.from(buckets, ([name, { value, sampleIssue }], idx) => ({
    name,
    value,
    color: colorFor(sampleIssue, idx)
  })).sort((a, b) => b.value - a.value)
}

export const StatusChart = ({ issues }: StatusChartProps) => {
  const data = buildChartData(issues)
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Status Distribution</Typography>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Box flex="0 0 auto" width={240} height={240}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={110}
                  paddingAngle={1}
                  stroke="none"
                >
                  {data.map(({ name, color }) => (
                    <Cell key={name} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
                  formatter={(value: number, name: string) => [
                    `${value} (${total ? Math.round((value / total) * 100) : 0}%)`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box flex="1 1 220px" minWidth={220}>
            <Stack spacing={0.75}>
              {data.map(({ name, value, color }) => {
                const pct = total ? Math.round((value / total) * 100) : 0
                return (
                  <Box key={name} display="flex" alignItems="center" gap={1.25}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {value} · {pct}%
                    </Typography>
                  </Box>
                )
              })}
            </Stack>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
