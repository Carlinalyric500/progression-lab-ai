'use client';

import {
  Card,
  CardContent,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';

import type { AdminUserRow, SubscriptionPlan } from './types';

type UsersTableProps = {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  tableLabel: string;
  canEditPlanOverride: boolean;
  updatingUserId: string | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onPlanOverrideChange: (userId: string, planOverride: SubscriptionPlan | null) => void;
};

const PLAN_OPTIONS: Array<SubscriptionPlan | 'NONE'> = [
  'NONE',
  'SESSION',
  'COMPOSER',
  'STUDIO',
  'COMP',
];

export default function UsersTable({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  tableLabel,
  canEditPlanOverride,
  updatingUserId,
  onPageChange,
  onPageSizeChange,
  onPlanOverrideChange,
}: UsersTableProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Subscribers and access</Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Resolved plan</TableCell>
                  <TableCell>Override</TableCell>
                  <TableCell>Subscription</TableCell>
                  <TableCell>AI usage</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Stack spacing={1.25}>
                        <Typography color="text.secondary">Loading users...</Typography>
                        <LinearProgress />
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary">No users found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading
                  ? rows.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography>{row.email}</Typography>
                            {row.name ? (
                              <Typography variant="body2" color="text.secondary">
                                {row.name}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>{row.resolvedPlan}</TableCell>
                        <TableCell>
                          {canEditPlanOverride ? (
                            <Select
                              size="small"
                              value={row.planOverride ?? 'NONE'}
                              disabled={updatingUserId === row.id}
                              onChange={(event) =>
                                onPlanOverrideChange(
                                  row.id,
                                  event.target.value === 'NONE'
                                    ? null
                                    : (event.target.value as SubscriptionPlan),
                                )
                              }
                            >
                              {PLAN_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option === 'NONE' ? 'None' : option}
                                </MenuItem>
                              ))}
                            </Select>
                          ) : (
                            (row.planOverride ?? 'None')
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography>{row.subscriptionStatus ?? 'Free / none'}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {row.billingInterval ?? 'No interval'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {row.aiGenerationsLimit === null
                            ? `${row.aiGenerationsUsed} / unlimited`
                            : `${row.aiGenerationsUsed} / ${row.aiGenerationsLimit}`}
                        </TableCell>
                        <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
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
