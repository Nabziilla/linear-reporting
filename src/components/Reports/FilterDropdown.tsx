import { ReactNode, useState } from 'react'
import { Box, Button, Menu } from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'

interface FilterDropdownProps {
  /** Text on the trigger button — the current selection, not the filter name. */
  label: string
  /** True when the filter departs from its default, to colour the trigger. */
  active?: boolean
  /** Menu contents; receives a close callback for single-select items. */
  children: (close: () => void) => ReactNode
  minWidth?: number
}

/**
 * Shared trigger + menu so every filter opens the same way. The trigger shows
 * the active selection rather than the filter's name, because the row label
 * beside it already says what the filter is.
 */
export const FilterDropdown = ({ label, active, children, minWidth = 240 }: FilterDropdownProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const close = () => setAnchor(null)

  return (
    <Box display="inline-flex">
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          borderColor: active ? 'primary.main' : 'divider',
          color: active ? 'primary.main' : 'text.secondary',
          '&:hover': { borderColor: active ? 'primary.main' : 'text.disabled' }
        }}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        slotProps={{ paper: { sx: { maxHeight: 440, minWidth } } }}
      >
        {children(close)}
      </Menu>
    </Box>
  )
}
