import { useState as useReactState, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, Button, Alert } from '@mui/material'


export const LogsPage = () => {
  const [logs] = useState(() => {
    try {
      const raw = sessionStorage.getItem('linear-upload-logs')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [allMappedRows] = useState(() => {
    try {
      const raw = sessionStorage.getItem('linear-upload-all-mapped')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [page, setPage] = useReactState(0)
  const navigate = useNavigate()

  // Load mapped row(s) into dashboard (simulate upload)
  const handleLoad = (rows: any[]) => {
    if (rows && rows.length > 0) {
      sessionStorage.setItem('linear-upload-data', JSON.stringify(rows))
      navigate('/')
      window.location.reload()
    }
  }

  return (
    <Box my={2}>
      <Typography variant="h5" gutterBottom>Upload Logs</Typography>
      {logs ? (
        <>
          {/* Debug summary for troubleshooting mapped rows */}
          <Paper sx={{ mt: 2, p: 2, background: '#fffbe6', fontFamily: 'monospace', fontSize: 13 }}>
            <Typography variant="caption" color="text.secondary">Debug: allMappedRows type: {Array.isArray(allMappedRows) ? 'array' : typeof allMappedRows}</Typography><br />
            <Typography variant="caption" color="text.secondary">Length: {Array.isArray(allMappedRows) ? allMappedRows.length : 'N/A'}</Typography><br />
            <Typography variant="caption" color="text.secondary">First value type: {Array.isArray(allMappedRows) && allMappedRows.length > 0 ? typeof allMappedRows[0] : 'N/A'}</Typography><br />
            <Typography variant="caption" color="text.secondary">First value preview:</Typography>
            <pre style={{ margin: 0, maxHeight: 120, overflow: 'auto' }}>{Array.isArray(allMappedRows) && allMappedRows.length > 0 ? JSON.stringify(allMappedRows[0], null, 2) : 'N/A'}</pre>
          </Paper>
          {logs.debugHeaders && (
            <Paper sx={{ mt: 2, p: 2, background: '#f3f3f3', fontFamily: 'monospace', fontSize: 13 }}>
              <Typography variant="caption">Detected CSV headers:</Typography>
              <pre style={{ margin: 0 }}>{logs.debugHeaders.join(', ')}</pre>
            </Paper>
          )}
          {Array.isArray(allMappedRows) && allMappedRows.length > 0 ? (
            <Paper sx={{ mt: 2, p: 2, background: '#f3f3f3' }}>
              <Typography variant="caption">All mapped rows:</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {allMappedRows.length} rows loaded
              </Typography>
              {/* Pagination controls */}
              {(() => {
                const rowsPerPage = 10;
                const totalPages = Math.ceil(allMappedRows.length / rowsPerPage);
                const pagedRows = allMappedRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
                // Summary table for customer support agent
                return (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
                      <Typography variant="caption" sx={{ mx: 2 }}>Page {page + 1} of {totalPages}</Typography>
                      <Button size="small" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                    </Box>
                    <Box sx={{ overflowX: 'auto', mb: 2 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
                        <thead>
                          <tr style={{ background: '#f0f0f0' }}>
                            <th style={{ border: '1px solid #ddd', padding: 4 }}>ID</th>
                            <th style={{ border: '1px solid #ddd', padding: 4 }}>Title</th>
                            <th style={{ border: '1px solid #ddd', padding: 4 }}>Assignee</th>
                            <th style={{ border: '1px solid #ddd', padding: 4 }}>State</th>
                            <th style={{ border: '1px solid #ddd', padding: 4 }}>Priority</th>
                            <th style={{ border: '1px solid #ddd', padding: 4 }}>Team</th>
                            <th style={{ border: '1px solid #ddd', padding: 4 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedRows.map((row: any, idx: number) => {
                            if (typeof row !== 'object' || row === null) return null;
                            return (
                              <tr key={idx + page * rowsPerPage}>
                                <td style={{ border: '1px solid #ddd', padding: 4 }}>{row.identifier || row.id || ''}</td>
                                <td style={{ border: '1px solid #ddd', padding: 4 }}>{row.title || ''}</td>
                                <td style={{ border: '1px solid #ddd', padding: 4 }}>{row.assignee?.name || ''}</td>
                                <td style={{ border: '1px solid #ddd', padding: 4 }}>{row.state?.name || ''}</td>
                                <td style={{ border: '1px solid #ddd', padding: 4 }}>{row.priorityLabel || row.priority || ''}</td>
                                <td style={{ border: '1px solid #ddd', padding: 4 }}>{row.team?.name || ''}</td>
                                <td style={{ border: '1px solid #ddd', padding: 4 }}>
                                  <Button variant="outlined" size="small" onClick={() => handleLoad([row])}>Load</Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </Box>
                    {/* Details for each row (expandable in future) */}
                    {pagedRows.map((row: any, idx: number) => {
                      let rowString = '';
                      let rowError = '';
                      try {
                        if (typeof row === 'object' && row !== null) {
                          rowString = JSON.stringify(row, null, 2);
                        } else {
                          rowError = 'Row is not a valid object.';
                        }
                      } catch (e) {
                        rowError = 'Error displaying row: ' + (e as Error).message;
                      }
                      return (
                        <Box key={idx + page * rowsPerPage} sx={{ mb: 2, border: '1px solid #e0e0e0', borderRadius: 1, p: 1, background: '#fff' }}>
                          <Typography variant="caption" color="text.secondary">Row {idx + 1 + page * rowsPerPage} details</Typography>
                          {rowError ? (
                            <Typography color="error">{rowError}</Typography>
                          ) : (
                            <pre style={{ margin: 0 }}>{rowString}</pre>
                          )}
                        </Box>
                      );
                    })}
                    <Button variant="contained" sx={{ mt: 2 }} onClick={() => handleLoad(allMappedRows)}>Load All Rows</Button>
                  </>
                );
              })()}
            </Paper>
          ) : (
            <Alert severity="error" sx={{ mt: 2 }}>
              No valid mapped rows found. The uploaded file may be empty or malformed.
            </Alert>
          )}
          {logs.debugRawRow && !allMappedRows.length && (
            <Paper sx={{ mt: 2, p: 2, background: '#f3f3f3', fontFamily: 'monospace', fontSize: 13 }}>
              <Typography variant="caption">First row (raw, normalized):</Typography>
              <pre style={{ margin: 0 }}>{JSON.stringify(logs.debugRawRow, null, 2)}</pre>
            </Paper>
          )}
          {logs.debugMappedRow && !allMappedRows.length && (
            <Paper sx={{ mt: 2, p: 2, background: '#f3f3f3', fontFamily: 'monospace', fontSize: 13 }}>
              <Typography variant="caption">First row (mapped):</Typography>
              <pre style={{ margin: 0 }}>{JSON.stringify(logs.debugMappedRow, null, 2)}</pre>
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => handleLoad([logs.debugMappedRow])}>Load to Dashboard</Button>
            </Paper>
          )}
        </>
      ) : (
        <Typography>No logs found for this session.</Typography>
      )}
    </Box>
  )
}
