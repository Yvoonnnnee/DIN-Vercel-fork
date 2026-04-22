// Shared session storage for Anam sessions
export interface AnamSession {
  sessionId: string;
  sessionToken: string;
  interviewId: string;
  createdAt: number;
  lastActivity: number;
  status: 'active' | 'closed';
}

// In-memory storage for active Anam sessions (shared across routes)
// NOTE: This persists as long as the server process lives
export const activeSessions = new Map<string, AnamSession>();

// Track if we've recently created a session for this interview to prevent rapid retries
const recentSessionAttempts = new Map<string, number>();
const SESSION_COOLDOWN_MS = 5000; // 5 second cooldown

export const SESSION_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes timeout

// Clean up expired sessions
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionToken, session] of activeSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      activeSessions.delete(sessionToken);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}

// Check if we can create a new session (cooldown logic)
export function canCreateSession(interviewId: string): boolean {
  const now = Date.now();
  const lastAttempt = recentSessionAttempts.get(interviewId);
  
  if (lastAttempt && (now - lastAttempt) < SESSION_COOLDOWN_MS) {
    console.log(`[session-store] ⏳ Session creation blocked by cooldown`, {
      interviewId,
      timeSinceLastAttempt: now - lastAttempt,
      cooldownPeriod: SESSION_COOLDOWN_MS
    });
    return false;
  }
  
  return true;
}

// Mark that we attempted to create a session
export function markSessionAttempt(interviewId: string): void {
  recentSessionAttempts.set(interviewId, Date.now());
}

// Find existing session by interviewId
export function findSessionByInterviewId(interviewId: string): AnamSession | undefined {
  const timestamp = new Date().toISOString();
  const existingSession = Array.from(activeSessions.values())
    .find(s => s.interviewId === interviewId && s.status === 'active');
  
  console.log(`[session-store] [${timestamp}] 🔍 Session lookup`, {
    interviewId,
    found: !!existingSession,
    totalActiveSessions: activeSessions.size,
    allSessionIds: Array.from(activeSessions.keys())
  });
  
  return existingSession;
}

// Store a new session
export function storeSession(sessionToken: string, sessionData: Omit<AnamSession, 'sessionToken'>): void {
  const timestamp = new Date().toISOString();
  const session: AnamSession = {
    ...sessionData,
    sessionToken
  };
  
  activeSessions.set(sessionToken, session);
  
  console.log(`[session-store] [${timestamp}] 💾 Session stored`, {
    sessionId: session.sessionId,
    interviewId: session.interviewId,
    sessionTokenPrefix: sessionToken.substring(0, 20) + '...',
    totalActiveSessions: activeSessions.size
  });
}

// Clear all sessions
export function clearAllSessions(): number {
  const timestamp = new Date().toISOString();
  const count = activeSessions.size;
  
  console.log(`[session-store] [${timestamp}] 🧹 Clearing all sessions`, {
    sessionsToClear: count,
    sessionIds: Array.from(activeSessions.keys())
  });
  
  activeSessions.clear();
  return count;
}
