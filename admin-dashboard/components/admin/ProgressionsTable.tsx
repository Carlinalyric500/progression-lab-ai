'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { AdminProgressionFilters, ProgressionRow, ProgressionVisibilityFilter } from './types';

type ProgressionsTableProps = {
  rows: ProgressionRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  canDelete: boolean;
  filters: AdminProgressionFilters;
  hasActiveFilters: boolean;
  tableLabel: string;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onFiltersChange: (filters: Partial<AdminProgressionFilters>) => void;
  onResetFilters: () => void;
};

const VISIBILITY_FILTER_OPTIONS: ProgressionVisibilityFilter[] = ['ALL', 'PUBLIC', 'PRIVATE'];

function formatVisibilityLabel(value: ProgressionVisibilityFilter) {
  if (value === 'ALL') {
    return 'All';
  }

  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function ProgressionsTable({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  canDelete,
  filters,
  hasActiveFilters,
  tableLabel,
  onView,
  onDelete,
  onPageChange,
  onPageSizeChange,
  onFiltersChange,
  onResetFilters,
}: ProgressionsTableProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Typography variant="h6">Progressions</Typography>
            {hasActiveFilters ? (
              <Button variant="text" onClick={onResetFilters}>
                Reset filters
              </Button>
            ) : null}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(280px, 2fr) minmax(160px, 1fr)',
              },
              gap: 1.5,
            }}
          >
            <TextField
              label="Search title, owner, or genre"
              size="small"
              value={filters.query}
              onChange={(event) => onFiltersChange({ query: event.target.value })}
            />
            <TextField
              select
              label="Visibility"
              size="small"
              value={filters.visibility}
              onChange={(event) =>
                onFiltersChange({ visibility: event.target.value as ProgressionVisibilityFilter })
              }
            >
              {VISIBILITY_FILTER_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {formatVisibilityLabel(option)}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Genre</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Stack spacing={1.25}>
                        <Typography color="text.secondary">Loading data...</Typography>
                        <LinearProgress />
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary">No progressions found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading
                  ? rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.title}</TableCell>
                        <TableCell>{row.owner.email}</TableCell>
                        <TableCell>{row.genre ?? 'N/A'}</TableCell>
                        <TableCell>{row.tags.join(', ') || 'None'}</TableCell>
                        <TableCell>{new Date(row.updatedAt).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" variant="outlined" onClick={() => onView(row.id)}>
                              View
                            </Button>
                            {canDelete ? (
                              <Button
                                size="small"
                                color="error"
                                variant="contained"
                                onClick={() => onDelete(row.id)}
                              >
                                Delete
                              </Button>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={pageSize}
            onPageChange={(_event, value) => onPageChange(value)}
            onRowsPerPageChange={(event) =>
              onPageSizeChange(Number.parseInt(event.target.value, 10))
            }
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelDisplayedRows={() => tableLabel}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
