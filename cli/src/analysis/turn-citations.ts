import { classifyStoredUserMessage } from './message-format.js';

export type TurnRole = 'User' | 'Assistant';
export interface CitableMessage {
  id: string;
  type: string;
  content: string;
}
export interface ResolvedTurn {
  messageId: string;
  offset: number;
}

/** Match formatMessagesForAnalysis's zero-based role ordinals and human-only User turns. */
export function resolveTurnReference(
  messages: CitableMessage[],
  role: TurnRole,
  ordinal: number,
): ResolvedTurn | null {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || (role !== 'User' && role !== 'Assistant')) return null;
  let seen = 0;
  for (let offset = 0; offset < messages.length; offset++) {
    const message = messages[offset];
    const matches = role === 'User'
      ? message.type === 'user' && classifyStoredUserMessage(message.content) === 'human'
      : message.type === 'assistant';
    if (!matches) continue;
    if (seen++ === ordinal) return { messageId: message.id, offset };
  }
  return null;
}
