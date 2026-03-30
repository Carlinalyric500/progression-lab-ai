import { NextRequest, NextResponse } from 'next/server';

import {
  AUDIT_ACTION_PROMPT_DRAFT_SAVED,
  recordPromptVersionAuditLog,
} from '../../../lib/adminAuditLog';
import { getAdminUserFromRequest } from '../../../lib/adminAccess';
import { checkCsrfToken } from '../../../lib/csrf';
import {
  DEFAULT_PROMPT_KEY,
  getPromptBuilderState,
  getPromptKeys,
  savePromptDraft,
} from '../../../lib/promptVersions';

type SavePromptDraftRequest = {
  promptKey?: unknown;
  contentTemplate?: unknown;
  notes?: unknown;
};

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUserFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const keys = await getPromptKeys();
    const promptKey =
      request.nextUrl.searchParams.get('promptKey') || keys[0] || DEFAULT_PROMPT_KEY;
    const state = await getPromptBuilderState(promptKey);

    return NextResponse.json({
      promptKey,
      keys,
      active: state.active,
      draft: state.draft,
      versions: state.versions,
    });
  } catch (error) {
    console.error('Failed to fetch prompt versions:', error);
    return NextResponse.json({ message: 'Failed to fetch prompt versions' }, { status: 500 });
  }
}

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
      return NextResponse.json({ message: 'Only ADMIN can save prompt drafts' }, { status: 403 });
    }

    const body = (await request.json()) as SavePromptDraftRequest;
    const promptKey = typeof body.promptKey === 'string' ? body.promptKey.trim() : '';
    const contentTemplate =
      typeof body.contentTemplate === 'string' ? body.contentTemplate.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

    if (!promptKey) {
      return NextResponse.json({ message: 'Invalid promptKey' }, { status: 400 });
    }

    if (!contentTemplate) {
      return NextResponse.json({ message: 'Prompt template cannot be empty' }, { status: 400 });
    }

    const draft = await savePromptDraft({
      promptKey,
      contentTemplate,
      notes,
      actorUserId: adminUser.id,
      actorEmail: adminUser.email,
    });

    try {
      await recordPromptVersionAuditLog({
        actor: adminUser,
        action: AUDIT_ACTION_PROMPT_DRAFT_SAVED,
        promptKey,
        metadata: {
          versionNumber: draft.versionNumber,
          hasNotes: Boolean(notes),
        },
      });
    } catch (auditError) {
      console.error('Failed to record prompt draft audit log:', auditError);
    }

    return NextResponse.json({ item: draft });
  } catch (error) {
    console.error('Failed to save prompt draft:', error);
    return NextResponse.json({ message: 'Failed to save prompt draft' }, { status: 500 });
  }
}
