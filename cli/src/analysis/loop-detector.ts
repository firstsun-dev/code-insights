import type { SQLiteMessageRow } from './prompt-types.js';

export interface RageLoopSignal {
  detected: boolean;
  confidence: number;
  reasoning: string;
  turnRange?: [string, string];
}

/**
 * Heuristically detect "Rage Loops" in a session before LLM analysis.
 * 
 * Definition: 
 * Clusters of messages within a tight temporal window where token count 
 * remains static (context maxed) and content/tool usage appears repetitive.
 */
export function detectRageLoopHeuristic(messages: SQLiteMessageRow[]): RageLoopSignal {
  if (messages.length < 5) {
    return { detected: false, confidence: 0, reasoning: 'Insufficient message count' };
  }

  const clusters: SQLiteMessageRow[][] = [];
  let currentCluster: SQLiteMessageRow[] = [];

  // Group into temporal clusters (messages within 60s of each other)
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prevMsg = messages[i - 1];
    
    if (prevMsg) {
      const delta = (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) / 1000;
      if (Number.isFinite(delta) && delta >= 0 && delta < 60) {
        currentCluster.push(msg);
      } else {
        if (currentCluster.length >= 4) clusters.push([...currentCluster]);
        currentCluster = [msg];
      }
    } else {
      currentCluster.push(msg);
    }
  }
  if (currentCluster.length >= 4) clusters.push(currentCluster);

  for (const cluster of clusters) {
    // Check for static high token count
    const tokens = cluster.map(m => {
      try {
        const usage = JSON.parse(m.usage || '{}');
        return usage.inputTokens || usage.input_tokens || usage.totalTokens || usage.total_tokens || 0;
      } catch {
        return 0;
      }
    }).filter(t => t > 50000); // Only care about large contexts

    if (tokens.length < 4) continue;

    // Static if max deviance is < 2%
    const avg = tokens.reduce((a, b) => a + b, 0) / tokens.length;
    const isStatic = tokens.every(t => Math.abs(t - avg) / avg < 0.02);

    if (isStatic) {
      // Check for semantic repetition (simple check: repeating tool calls or content fragments)
      const repetitions = cluster.filter((m, i) => {
        if (i === 0) return false;
        const prev = cluster[i - 1];
        // Empty tool-call arrays are common and cannot demonstrate repetition.
        const content = m.content.trim().replace(/\s+/g, ' ').slice(0, 120);
        const prevContent = prev.content.trim().replace(/\s+/g, ' ').slice(0, 120);
        const sameContent = content.length >= 12 && content === prevContent;
        // Only compare actual tool invocations, not null or [] placeholders.
        const calls = m.tool_calls?.trim();
        const prevCalls = prev.tool_calls?.trim();
        const sameCalls = Boolean(calls && calls !== '[]' && calls === prevCalls);
        return sameContent || sameCalls;
      });

      if (repetitions.length >= 2) {
        const firstTurn = messages.indexOf(cluster[0]);
        const lastTurn = messages.indexOf(cluster[cluster.length - 1]);
        
        return {
          detected: true,
          confidence: 0.8,
          reasoning: `Suspected loop (verify stalled progress): ${cluster.length} messages in ${Math.round((new Date(cluster[cluster.length-1].timestamp).getTime() - new Date(cluster[0].timestamp).getTime())/1000)}s with static token count (${Math.round(avg/1000)}k) and repetitive signals.`,
          turnRange: [`Turn#${firstTurn}`, `Turn#${lastTurn}`]
        };
      }
    }
  }

  return { detected: false, confidence: 0, reasoning: 'No loop patterns detected' };
}
