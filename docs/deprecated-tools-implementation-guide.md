# Deprecated Tools Implementation Guide

This document outlines how the deprecated tools (Google Meet, Pika, HeyGen, Voiceflow, Joinly) were implemented in the DIN.org dispute resolution system. This serves as a reference for restoring these functionalities if needed in the future.

## Overview of Deprecated Architecture

The original system was designed for **multi-person court hearings** where:
- Multiple participants (judge, lawyers, claimants, respondents) would join a **Google Meet call**
- **AI agents** (powered by Pika) would join the meeting as virtual participants
- **HeyGen avatars** could be embedded for visual representation
- **Voiceflow** was used for conversational AI flows
- **Joinly** was considered for meeting coordination

## 1. Google Meet Integration

### Database Schema
```sql
-- In hearings table
meetingPlatform TEXT DEFAULT 'google_meet',
meetingUrl TEXT,
meetingId TEXT, -- Google Meet event ID

-- In hearing_participants table  
meetingParticipantId TEXT, -- Google Meet participant ID
```

### Implementation Files

#### `/src/lib/google-meet.ts`
```typescript
// Google Meet API integration for creating meetings
export async function createGoogleMeetEvent(hearingData: {
  title: string;
  startTime: Date;
  duration: number;
  attendees?: string[];
}) {
  // Uses Google Calendar API to create event with Meet conference
  // Returns meeting URL and event ID
}

export async function addMeetToExistingEvent(eventId: string) {
  // Adds Google Meet to existing calendar event
}
```

#### `/src/lib/google-meet-ai.ts`
```typescript
// AI-specific Meet integration for bot joining
export async function enableMeetTranscription(eventId: string) {
  // Enables transcription for Google Meet
}

export async function getMeetParticipants(meetingId: string) {
  // Retrieves participant list from active Meet
}
```

#### API Route: `/app/api/cases/[caseId]/calendar/route.ts`
```typescript
export async function POST(request: Request, { params }: RouteProps) {
  // Creates Google Calendar event with Meet
  // Updates hearing record with meeting details
  // Returns meeting URL and event ID
}
```

### Environment Variables
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Setup Requirements
1. **Google Workspace account** with Meet enabled
2. **Service account** with Calendar API and Meet API access
3. **Domain-wide delegation** for service account
4. **Google Cloud project** with required APIs enabled

## 2. Pika AI Integration

### Purpose
Pika provided AI agents that could join Google Meet calls as virtual participants with voice capabilities.

### Database Schema
```sql
-- In hearings table
pikaSessionId TEXT, -- Session ID for Pika Skills AI agent management

-- In hearing_participants table
pikaParticipantId TEXT, -- ID from Pika Skills system
```

### Implementation Files

#### API Route: `/app/api/pika-skills/route.ts`
```typescript
// POST - Create new Pika session
export async function POST(request: Request) {
  const { meetUrl, botName, voiceId, systemPrompt, timeoutSec } = await request.json();
  
  const pikaResponse = await fetch('https://api.pika.ai/v1/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PIKA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      meetUrl,
      botName,
      voiceId,
      systemPrompt,
      timeoutSec
    })
  });
  
  return pikaResponse.json();
}

// GET - Get session status
export async function GET(request: Request) {
  const { sessionId } = new URL(request.url).searchParams;
  
  const response = await fetch(`https://api.pika.ai/v1/sessions/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.PIKA_API_KEY}`
    }
  });
  
  return response.json();
}

// DELETE - Terminate session
export async function DELETE(request: Request) {
  const { sessionId } = new URL(request.url).searchParams;
  
  await fetch(`https://api.pika.ai/v1/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.PIKA_API_KEY}`
    }
  });
  
  return { message: 'Session terminated' };
}
```

#### AI Participation Route: `/app/api/hearings/[hearingId]/ai-participate/route.ts`
```typescript
export async function POST(request: Request, { params }: RouteProps) {
  // Creates AI agents for hearing
  const aiAgents = [
    {
      participantType: "ai_judge",
      role: "judge", 
      displayName: "Judge AI",
      voiceId: 'pNInz6obpgDQGcFmaJgB',
      systemPrompt: "You are Judge AI for this court hearing..."
    }
  ];
  
  // Add to database
  await db.insert(hearingParticipants).values(aiAgents);
  
  // Start Pika sessions for each agent
  for (const agent of aiAgents) {
    const pikaResponse = await fetch(`/api/pika-skills`, {
      method: 'POST',
      body: JSON.stringify({
        meetUrl: hearing.meetingUrl,
        botName: agent.displayName,
        voiceId: agent.voiceId,
        systemPrompt: agent.aiConfig.systemPrompt
      })
    });
    
    // Update participant with Pika session ID
    await db.update(hearingParticipants)
      .set({ pikaParticipantId: pikaResult.sessionId })
      .where(eq(hearingParticipants.id, agent.id));
  }
}
```

### Environment Variables
```env
PIKA_API_KEY="your-pika-api-key"
```

### Cleanup Scripts

#### `/scripts/cleanup-pika-sessions.mjs`
```javascript
// Cron job script to clean up expired Pika sessions
// Runs every 10 minutes to prevent credit drain
const MAX_SESSION_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Find sessions older than MAX_SESSION_DURATION_MS
// Terminate via Pika API
// Mark as inactive in database
```

#### `/scripts/emergency-cleanup.mjs`
```javascript
// Emergency script to immediately stop all Pika sessions
// Bypasses timeout and terminates all active sessions
```

## 3. HeyGen Avatar Integration

### Purpose
HeyGen provided AI avatars that could be embedded in web pages for visual representation of AI agents.

### Implementation Files

#### `/din-heygen-test/src/api/heygen.ts`
```typescript
export async function createHeyGenSession() {
  const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env.HEYGEN_AVATAR_API_KEY
    },
    body: JSON.stringify({
      mode: "FULL",
      avatar_id: env.HEYGEN_AVATAR_ID,
      avatar_persona: {
        voice_id: env.HEYGEN_AVATAR_VOICE_ID,
        context_id: env.HEYGEN_AVATAR_CONTEXT_ID,
        language: "en"
      }
    })
  });
  
  return response.json();
}
```

### Environment Variables
```env
HEYGEN_AVATAR_API_KEY="your-heygen-api-key"
HEYGEN_AVATAR_ID="your-avatar-id"
HEYGEN_AVATAR_VOICE_ID="your-voice-id"
HEYGEN_AVATAR_CONTEXT_ID="your-context-id"
```

## 4. Voiceflow Integration

### Purpose
Voiceflow was used for creating conversational AI flows and dialogues.

### Implementation Pattern
```typescript
// Voiceflow API integration for dialogue management
export async function createVoiceflowDialogue(projectId: string, userInput: string) {
  const response = await fetch(`https://api.voiceflow.com/v1/dialogues/${projectId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOICEFLOW_API_KEY}`
    },
    body: JSON.stringify({
      input: userInput
    })
  });
  
  return response.json();
}
```

## 5. Joinly Integration

### Purpose
Joinly was considered for meeting coordination and participant management.

### Implementation Pattern
```typescript
// Joinly API for meeting scheduling
export async function createJoinlyMeeting(meetingData: {
  title: string;
  participants: string[];
  scheduledTime: Date;
}) {
  // Implementation would use Joinly's API for meeting creation
}
```

## Frontend Components

### AI Hearing Controls
#### `/src/components/ai-hearing-controls.tsx`
```typescript
interface AIHearingControlsProps {
  hearingId: string;
  meetingUrl: string;
  isActive: boolean;
  onStatusChange?: (status: 'starting' | 'active' | 'ended') => void;
  pikaSessions?: Array<{
    agentId: string;
    sessionId: string;
    status: string;
  }>;
}

// Component provided buttons to start/stop AI agents
// Called ai-participate API endpoint
// Displayed Pika session status
```

### Session Monitor
#### `/src/components/session-monitor.tsx`
```typescript
// Real-time monitoring of AI sessions
// Polls auto-cleanup endpoint for session status
// Displays active sessions and cleanup status
```

### Existing Hearings Display
#### `/src/components/existing-hearings.tsx`
```typescript
// Displayed hearing information including:
// - Meeting URLs (Google Meet links)
// - Transcription status
// - Pika session status (AI Session: Active)
// - Calendar event status
```

## Auto-Cleanup System

### Purpose
Prevented credit drain by automatically terminating long-running AI sessions.

### Implementation
#### `/app/api/hearings/[hearingId]/auto-cleanup/route.ts`
```typescript
const MAX_SESSION_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: Request, { params }: RouteProps) {
  // Find active AI participants older than MAX_SESSION_DURATION_MS
  // Terminate Pika sessions
  // Mark participants as inactive in database
  // Update hearing status to 'completed'
}

export async function GET(request: Request, { params }: RouteProps) {
  // Return status of active sessions
  // Check if sessions are approaching timeout
  // Return estimated costs and time remaining
}
```

## Migration to Current Architecture

The deprecated multi-person system was replaced with:

1. **1:1 AI Interview Sessions** instead of multi-person meetings
2. **Anam AI** instead of Pika for avatar generation
3. **Embedded avatars** instead of external meeting platforms
4. **LiveKit** for real-time communication
5. **LiveAvatar** for avatar rendering

## Restoration Steps

To restore the deprecated functionality:

1. **Recreate API endpoints** using the patterns above
2. **Add database fields** for deprecated tools (pikaSessionId, pikaParticipantId, etc.)
3. **Restore frontend components** (ai-hearing-controls, session-monitor)
4. **Set up external service accounts** (Google Workspace, Pika, HeyGen)
5. **Configure environment variables** for all services
6. **Update meeting flow** to use Google Meet instead of embedded sessions
7. **Restore cleanup scripts** for session management

## Key Differences

| Deprecated System | Current System |
|------------------|----------------|
| Multi-person Google Meet | 1:1 embedded sessions |
| Pika AI agents | Anam AI avatars |
| External meeting platforms | In-page avatar embedding |
| Complex session cleanup | Built-in Anam session management |
| Voiceflow dialogues | Direct Anthropic integration |
| HeyGen avatars | Anam avatar generation |

This guide provides the complete implementation patterns needed to restore any of the deprecated functionality if the multi-person court hearing approach becomes desirable again in the future.
