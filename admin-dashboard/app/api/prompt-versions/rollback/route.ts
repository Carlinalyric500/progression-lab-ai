import { NextRequest, NextResponse } from 'next/server';

import {
  AUDIT_ACTION_PROMPT_ROLLED_BACK,
  recordPromptVersionAuditLog,
} from '../../../../lib/adminAuditLog';
import { getAdminUserFromRequest } from '../../../../lib/adminAccess';
import { checkCsrfToken } from '../../../../lib/csrf';
import { rollbackPromptVersion } from '../../../../lib/promptVersions';

type RollbackPromptVersionRequest = {
  promptKey?: unknown;
  versionId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrfToken(request);
    if (csrfError) {
      return csrfError;
    }

    const adminUser = await getAdminUserFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (adminUser.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Only ADMIN can rollback prompts' }, { status: 403 });
    }

    const body = (await request.json()) as RollbackPromptVersionRequest;
    const promptKey = typeof body.promptKey === 'string' ? body.promptKey.trim() : '';
    const versionId = typeof body.versionId === 'string' ? body.versionId.trim() : '';

    if (!promptKey || !versionId) {
      return NextResponse.json({ message: 'Invalid promptKey or versionId' }, { status: 400 });
    }

    const rolledBack = await rollbackPromptVersion({
      promptKey,
      versionId,
    });

    if (!rolledBack) {
      return NextResponse.json({ message: 'Version not found' }, { status: 404 });
    }

    try {
      await recordPromptVersionAuditLog({
        actor: adminUser,
        action: AUDIT_ACTION_PROMPT_ROLLED_BACK,
        promptKey,
        metadata: {
          versionId: rolledBack.id,
          versionNumber: rolledBack.versionNumber,
        },
      });
    } catch (auditError) {
      console.error('Failed to record prompt rollback audit log:', auditError);
    }

    return NextResponse.json({ item: rolledBack });
  } catch (error) {
    console.error('Failed to rollback prompt version:', error);
    return NextResponse.json({ message: 'Failed to rollback prompt version' }, { status: 500 });
  }
}
