import { NextRequest, NextResponse } from 'next/server';

import {
  AUDIT_ACTION_PROMPT_PUBLISHED,
  recordPromptVersionAuditLog,
} from '../../../../lib/adminAuditLog';
import { getAdminUserFromRequest } from '../../../../lib/adminAccess';
import { checkCsrfToken } from '../../../../lib/csrf';
import { publishPromptDraft } from '../../../../lib/promptVersions';

type PublishPromptDraftRequest = {
  promptKey?: unknown;
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
      return NextResponse.json({ message: 'Only ADMIN can publish prompts' }, { status: 403 });
    }

    const body = (await request.json()) as PublishPromptDraftRequest;
    const promptKey = typeof body.promptKey === 'string' ? body.promptKey.trim() : '';

    if (!promptKey) {
      return NextResponse.json({ message: 'Invalid promptKey' }, { status: 400 });
    }

    const published = await publishPromptDraft({ promptKey });
    if (!published) {
      return NextResponse.json({ message: 'No draft found to publish' }, { status: 404 });
    }

    try {
      await recordPromptVersionAuditLog({
        actor: adminUser,
        action: AUDIT_ACTION_PROMPT_PUBLISHED,
        promptKey,
        metadata: {
          versionId: published.id,
          versionNumber: published.versionNumber,
        },
      });
    } catch (auditError) {
      console.error('Failed to record prompt publish audit log:', auditError);
    }

    return NextResponse.json({ item: published });
  } catch (error) {
    console.error('Failed to publish prompt draft:', error);
    return NextResponse.json({ message: 'Failed to publish prompt draft' }, { status: 500 });
  }
}
