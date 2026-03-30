import { prisma } from './prisma';
import {
  CHORD_SUGGESTION_PROMPT_KEY,
  DEFAULT_CHORD_SUGGESTION_PROMPT_TEMPLATE,
  renderPromptTemplate,
} from '../app/api/chord-suggestions/instructions';
import { reportPromptFallback, reportPromptSuccess } from './promptVersionMonitoring';

export const SUPPORTED_PROMPT_KEYS = [CHORD_SUGGESTION_PROMPT_KEY] as const;
export type SupportedPromptKey = (typeof SUPPORTED_PROMPT_KEYS)[number];

export type ActivePromptTemplate = {
  promptKey: string;
  contentTemplate: string;
  versionNumber: number | null;
  source: 'db' | 'fallback';
};

const FALLBACK_PROMPT_TEMPLATES: Record<SupportedPromptKey, string> = {
  [CHORD_SUGGESTION_PROMPT_KEY]: DEFAULT_CHORD_SUGGESTION_PROMPT_TEMPLATE,
};

function getFallbackPrompt(promptKey: string): ActivePromptTemplate {
  const fallbackTemplate =
    FALLBACK_PROMPT_TEMPLATES[promptKey as SupportedPromptKey] ??
    DEFAULT_CHORD_SUGGESTION_PROMPT_TEMPLATE;

  return {
    promptKey,
    contentTemplate: fallbackTemplate,
    versionNumber: null,
    source: 'fallback',
  };
}

export async function getActivePromptTemplate(promptKey: string): Promise<ActivePromptTemplate> {
  try {
    const activePrompt = await prisma.promptVersion.findFirst({
      where: {
        promptKey,
        isActive: true,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    if (!activePrompt) {
      reportPromptFallback({
        promptKey,
        reason: 'no_active_version',
        context: { message: 'No active prompt version found in database' },
      });
      return getFallbackPrompt(promptKey);
    }

    reportPromptSuccess(promptKey, activePrompt.versionNumber);

    const template: ActivePromptTemplate = {
      promptKey: activePrompt.promptKey,
      contentTemplate: activePrompt.contentTemplate,
      versionNumber: activePrompt.versionNumber,
      source: 'db',
    };
    return template;
  } catch (error) {
    console.error('Failed to load active prompt template:', error);
    reportPromptFallback({
      promptKey,
      reason:
        error instanceof Error && error.message.includes('timeout') ? 'query_timeout' : 'db_error',
      error: error instanceof Error ? error : new Error(String(error)),
      context: { message: 'Exception thrown while fetching prompt from database' },
    });
    return getFallbackPrompt(promptKey);
  }
}

export async function getRenderedPrompt(params: {
  promptKey: string;
  outputLanguage: string;
}): Promise<{
  text: string;
  versionNumber: number | null;
  source: 'db' | 'fallback';
}> {
  const active = await getActivePromptTemplate(params.promptKey);
  return {
    text: renderPromptTemplate(active.contentTemplate, params.outputLanguage),
    versionNumber: active.versionNumber,
    source: active.source,
  };
}

export function invalidatePromptVersionCache(promptKey?: string): void {
  void promptKey;
}
