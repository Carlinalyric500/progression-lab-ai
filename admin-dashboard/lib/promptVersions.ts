import { prisma } from './prisma';

export const DEFAULT_PROMPT_KEY = 'chord_suggestions';

export type PromptVersionRecord = {
  id: string;
  promptKey: string;
  versionNumber: number;
  contentTemplate: string;
  notes: string | null;
  isDraft: boolean;
  isActive: boolean;
  createdByUserId: string | null;
  createdByEmail: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toPromptVersionRecord(item: {
  id: string;
  promptKey: string;
  versionNumber: number;
  contentTemplate: string;
  notes: string | null;
  isDraft: boolean;
  isActive: boolean;
  createdByUserId: string | null;
  createdByEmail: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PromptVersionRecord {
  return {
    id: item.id,
    promptKey: item.promptKey,
    versionNumber: item.versionNumber,
    contentTemplate: item.contentTemplate,
    notes: item.notes,
    isDraft: item.isDraft,
    isActive: item.isActive,
    createdByUserId: item.createdByUserId,
    createdByEmail: item.createdByEmail,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function getPromptKeys(): Promise<string[]> {
  const keys = await prisma.promptVersion.findMany({
    distinct: ['promptKey'],
    select: { promptKey: true },
    orderBy: { promptKey: 'asc' },
  });

  return keys.map((entry) => entry.promptKey);
}

export async function getPromptVersions(promptKey: string): Promise<PromptVersionRecord[]> {
  const rows = await prisma.promptVersion.findMany({
    where: { promptKey },
    orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
  });

  return rows.map(toPromptVersionRecord);
}

export async function getPromptBuilderState(promptKey: string): Promise<{
  promptKey: string;
  active: PromptVersionRecord | null;
  draft: PromptVersionRecord | null;
  versions: PromptVersionRecord[];
}> {
  const versions = await getPromptVersions(promptKey);

  return {
    promptKey,
    active: versions.find((item) => item.isActive) ?? null,
    draft: versions.find((item) => item.isDraft) ?? null,
    versions,
  };
}

export async function savePromptDraft(params: {
  promptKey: string;
  contentTemplate: string;
  notes: string | null;
  actorUserId: string;
  actorEmail: string;
}): Promise<PromptVersionRecord> {
  return prisma.$transaction(async (tx) => {
    const existingDraft = await tx.promptVersion.findFirst({
      where: {
        promptKey: params.promptKey,
        isDraft: true,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    if (existingDraft) {
      const updated = await tx.promptVersion.update({
        where: { id: existingDraft.id },
        data: {
          contentTemplate: params.contentTemplate,
          notes: params.notes,
          createdByUserId: params.actorUserId,
          createdByEmail: params.actorEmail,
        },
      });

      return toPromptVersionRecord(updated);
    }

    const maxVersion = await tx.promptVersion.aggregate({
      where: { promptKey: params.promptKey },
      _max: { versionNumber: true },
    });

    const created = await tx.promptVersion.create({
      data: {
        promptKey: params.promptKey,
        versionNumber: (maxVersion._max.versionNumber ?? 0) + 1,
        contentTemplate: params.contentTemplate,
        notes: params.notes,
        isDraft: true,
        isActive: false,
        createdByUserId: params.actorUserId,
        createdByEmail: params.actorEmail,
      },
    });

    return toPromptVersionRecord(created);
  });
}

export async function publishPromptDraft(params: {
  promptKey: string;
}): Promise<PromptVersionRecord | null> {
  return prisma.$transaction(async (tx) => {
    const draft = await tx.promptVersion.findFirst({
      where: {
        promptKey: params.promptKey,
        isDraft: true,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    if (!draft) {
      return null;
    }

    await tx.promptVersion.updateMany({
      where: {
        promptKey: params.promptKey,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const published = await tx.promptVersion.update({
      where: {
        id: draft.id,
      },
      data: {
        isDraft: false,
        isActive: true,
        publishedAt: new Date(),
      },
    });

    return toPromptVersionRecord(published);
  });
}

export async function rollbackPromptVersion(params: {
  promptKey: string;
  versionId: string;
}): Promise<PromptVersionRecord | null> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.promptVersion.findFirst({
      where: {
        id: params.versionId,
        promptKey: params.promptKey,
      },
    });

    if (!target) {
      return null;
    }

    await tx.promptVersion.updateMany({
      where: {
        promptKey: params.promptKey,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const rolledBack = await tx.promptVersion.update({
      where: {
        id: target.id,
      },
      data: {
        isDraft: false,
        isActive: true,
        publishedAt: target.publishedAt ?? new Date(),
      },
    });

    return toPromptVersionRecord(rolledBack);
  });
}
