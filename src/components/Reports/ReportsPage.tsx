import { useMemo, useState } from 'react'
import {
  Box, Typography, CircularProgress, Tabs, Tab, MenuItem, ListItemText, Divider, Button
} from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckIcon from '@mui/icons-material/Check'
import { useSearchParams } from 'react-router-dom'
import { useFilteredIssues } from '../../hooks/useFilteredIssues'
import { LinearConnectionNotice } from '../LinearConnectionNotice'
import { QA_TEAM_MEMBERS } from '../../constants'
import { Priority, StateType, LinearIssue } from '../../types'
import { FilterDropdown } from './FilterDropdown'
import { DateRangeFilter, DateRange, DEFAULT_RANGE, filterByDateRange, describeRange } from './DateRangeFilter'
import { StatusFilter, StatusSelection, buildStatusOptions, filterByStatus, describeStatuses } from './StatusFilter'
import { PriorityFilter, PrioritySelection, filterByPriority, describePriorities } from './PriorityFilter'
import { ReportsOverviewTab } from './ReportsOverviewTab'
import { ReportsQaTab } from './ReportsQaTab'

const ALL_TEAMS = '__all__'
const ROSTER = QA_TEAM_MEMBERS as readonly string[]
const firstName = (n: string) => n.split(' ')[0]

const CLOSED_TYPES: StateType[] = ['completed', 'canceled', 'duplicate']
const isOpen = (issue: LinearIssue) => !CLOSED_TYPES.includes(issue.state?.type as StateType)

const LoadingBox = styled(Box)({ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 })

type ReportsTab = 'overview' | 'qa'

export const ReportsPage = () => {
  const { allIssues, isLoading, isError, error, hasApiKey, hasUploadedData } = useFilteredIssues()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: ReportsTab = searchParams.get('tab') === 'qa' ? 'qa' : 'overview'
  const setTab = (next: ReportsTab) => setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })

  const [selectedTeam, setSelectedTeam] = useState<string>(ALL_TEAMS)
  const [people, setPeople] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE)
  const [priorities, setPriorities] = useState<PrioritySelection>([])
  const [statuses, setStatuses] = useState<StatusSelection>([])
  const [showClosed, setShowClosed] = useState(false)

  const peopleSet = useMemo(() => new Set(people), [people])

  const teamCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of allIssues) {
      const name = i.team?.name ?? 'Unknown'
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
  }, [allIssues])

  const dateFiltered = useMemo(() => filterByDateRange(allIssues, dateRange), [allIssues, dateRange])

  const openFiltered = useMemo(
    () => (showClosed ? dateFiltered : dateFiltered.filter(isOpen)),
    [dateFiltered, showClosed]
  )

  const teamPeopleFiltered = useMemo(() => openFiltered.filter((i) =>
    (selectedTeam === ALL_TEAMS || i.team?.name === selectedTeam) &&
    (peopleSet.size === 0 || (i.assignee && peopleSet.has(i.assignee.name)))
  ), [openFiltered, selectedTeam, peopleSet])

  // Priority counts come before the priority filter is applied, so the chips
  // keep showing the full picture rather than collapsing to the selection.
  const priorityCounts = useMemo(() => {
    const counts: Partial<Record<Priority, number>> = {}
    for (const i of teamPeopleFiltered) counts[i.priority] = (counts[i.priority] ?? 0) + 1
    return counts
  }, [teamPeopleFiltered])

  const priorityFiltered = useMemo(
    () => filterByPriority(teamPeopleFiltered, priorities),
    [teamPeopleFiltered, priorities]
  )

  // Status options/counts reflect team + people + date + priority scope, taken
  // before the status filter itself, so the dropdown shows the full picture.
  // Built before the open/closed filter so closed statuses stay selectable —
  // otherwise "Open only" would erase them from the menu and the conflict
  // warning below could never fire.
  const statusOptions = useMemo(() => {
    const base = dateFiltered.filter((i) =>
      (selectedTeam === ALL_TEAMS || i.team?.name === selectedTeam) &&
      (peopleSet.size === 0 || (i.assignee && peopleSet.has(i.assignee.name)))
    )
    return buildStatusOptions(filterByPriority(base, priorities))
  }, [dateFiltered, selectedTeam, peopleSet, priorities])
  const scopedIssues = useMemo(() => filterByStatus(priorityFiltered, statuses), [priorityFiltered, statuses])

  // "Active" means the filter departs from its default, so Clear all only
  // appears when there is something to clear.
  const activeFilterCount =
    (selectedTeam !== ALL_TEAMS ? 1 : 0) +
    (people.length > 0 ? 1 : 0) +
    (dateRange.key !== DEFAULT_RANGE.key ? 1 : 0) +
    (showClosed ? 1 : 0) +
    (priorities.length > 0 ? 1 : 0) +
    (statuses.length > 0 ? 1 : 0)

  const resetFilters = () => {
    setSelectedTeam(ALL_TEAMS)
    setPeople([])
    setDateRange(DEFAULT_RANGE)
    setShowClosed(false)
    setPriorities([])
    setStatuses([])
  }

  // Picking a closed status while "Open only" is active returns nothing, which
  // reads as a bug. Name the conflicting statuses instead of showing a blank.
  const hiddenByOpenOnly = useMemo(() => {
    if (showClosed || statuses.length === 0) return []
    return statusOptions
      .filter((o) => statuses.includes(o.name) && CLOSED_TYPES.includes(o.type as StateType))
      .map((o) => o.name)
  }, [showClosed, statuses, statusOptions])

  // QA data is keyed by team short-code, not name, so resolve the selected team
  // name to its key from the full issue set (independent of the date filter).
  const qaTeamKey = useMemo(() => {
    if (selectedTeam === ALL_TEAMS) return null
    return allIssues.find((i) => i.team?.name === selectedTeam)?.team?.key ?? '__none__'
  }, [allIssues, selectedTeam])

  if (isLoading) return <LoadingBox><CircularProgress /></LoadingBox>

  if (isError || allIssues.length === 0) {
    return (
      <Box>
        <Typography variant="h5" mb={2}>Reports</Typography>
        <LinearConnectionNotice
          hasApiKey={hasApiKey} hasUploadedData={hasUploadedData}
          isError={isError} error={error} isEmpty={allIssues.length === 0}
        />
      </Box>
    )
  }

  const heading = selectedTeam === ALL_TEAMS ? 'All Teams' : selectedTeam
  const allRosterSelected = ROSTER.every((n) => peopleSet.has(n))
  const toggleMyTeam = () => setPeople(allRosterSelected ? [] : [...ROSTER])
  const togglePerson = (n: string) => setPeople((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]))
  const peopleLabel = people.length ? (allRosterSelected ? 'My QA Team' : people.map(firstName).join(', ')) : 'All people'

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto', pb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={2.5} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Reports</Typography>
          <Typography variant="body2" color="text.secondary">
            {heading}{people.length ? ` · ${peopleLabel}` : ''} · {describeRange(dateRange)}
            {priorities.length > 0 ? ` · ${describePriorities(priorities)}` : ''}
            {statuses.length > 0 ? ` · ${describeStatuses(statuses)}` : ''} · {scopedIssues.length} tickets
          </Typography>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={2.5}>
        <FilterDropdown
          label={selectedTeam === ALL_TEAMS ? `All teams · ${allIssues.length}` : `${selectedTeam} · ${teamCounts.find((t) => t.name === selectedTeam)?.total ?? 0}`}
          active={selectedTeam !== ALL_TEAMS}
          minWidth={220}
        >
          {(close) => [
            <MenuItem key={ALL_TEAMS} dense selected={selectedTeam === ALL_TEAMS} onClick={() => { setSelectedTeam(ALL_TEAMS); close() }}>
              <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                {selectedTeam === ALL_TEAMS && <CheckIcon sx={{ fontSize: 16 }} />}
              </Box>
              <ListItemText primary={`All teams · ${allIssues.length}`} primaryTypographyProps={{ variant: 'body2' }} />
            </MenuItem>,
            ...teamCounts.map(({ name, total }) => (
              <MenuItem key={name} dense selected={selectedTeam === name} onClick={() => { setSelectedTeam(name); close() }}>
                <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                  {selectedTeam === name && <CheckIcon sx={{ fontSize: 16 }} />}
                </Box>
                <ListItemText primary={`${name} · ${total}`} primaryTypographyProps={{ variant: 'body2' }} />
              </MenuItem>
            ))
          ]}
        </FilterDropdown>

        <FilterDropdown label={peopleLabel} active={people.length > 0} minWidth={220}>
          {(close) => [
            <MenuItem key="my-team" dense onClick={toggleMyTeam}>
              <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                {allRosterSelected && <CheckIcon sx={{ fontSize: 16 }} />}
              </Box>
              <ListItemText primary="My QA Team" primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
            </MenuItem>,
            <Divider key="div" />,
            ...ROSTER.map((n) => (
              <MenuItem key={n} dense onClick={() => togglePerson(n)}>
                <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                  {peopleSet.has(n) && <CheckIcon sx={{ fontSize: 16 }} />}
                </Box>
                <ListItemText primary={firstName(n)} primaryTypographyProps={{ variant: 'body2' }} />
              </MenuItem>
            )),
            ...(people.length > 0 ? [
              <Divider key="div2" />,
              <MenuItem key="clear" dense onClick={() => { setPeople([]); close() }}>
                <ListItemText primary="Clear people filter" primaryTypographyProps={{ variant: 'body2', color: 'error' }} />
              </MenuItem>
            ] : [])
          ]}
        </FilterDropdown>

        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <FilterDropdown
          label={showClosed ? 'Open and closed' : 'Open only'}
          active={showClosed}
          minWidth={180}
        >
          {(close) => [
            <MenuItem key="open" dense selected={!showClosed} onClick={() => { setShowClosed(false); close() }}>
              <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                {!showClosed && <CheckIcon sx={{ fontSize: 16 }} />}
              </Box>
              <ListItemText primary="Open only" primaryTypographyProps={{ variant: 'body2' }} />
            </MenuItem>,
            <MenuItem key="all" dense selected={showClosed} onClick={() => { setShowClosed(true); close() }}>
              <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
                {showClosed && <CheckIcon sx={{ fontSize: 16 }} />}
              </Box>
              <ListItemText primary="Open and closed" primaryTypographyProps={{ variant: 'body2' }} />
            </MenuItem>
          ]}
        </FilterDropdown>
        <PriorityFilter value={priorities} onChange={setPriorities} counts={priorityCounts} />
        <StatusFilter value={statuses} onChange={setStatuses} options={statusOptions} />
        {activeFilterCount > 0 && (
          <Button size="small" onClick={resetFilters} sx={{ minWidth: 0, textTransform: 'none' }}>
            Clear all ({activeFilterCount})
          </Button>
        )}
      </Box>

      {hiddenByOpenOnly.length > 0 && (
        <Typography variant="caption" sx={{ color: '#f97316', display: 'block', mb: 2 }}>
          “Open only” is hiding {hiddenByOpenOnly.join(', ')} — switch to “Open and closed” to see them.
        </Typography>
      )}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600 } }}>
        <Tab label="Overview" value="overview" />
        <Tab label="QA" value="qa" />
      </Tabs>

      {tab === 'overview' ? (
        <ReportsOverviewTab scopedIssues={scopedIssues} selectedTeam={selectedTeam} heading={heading} />
      ) : (
        <ReportsQaTab
          heading={heading}
          teamKey={qaTeamKey}
          people={peopleSet}
          allIssues={allIssues}
          scopedIssues={scopedIssues}
        />
      )}
    </Box>
  )
}
