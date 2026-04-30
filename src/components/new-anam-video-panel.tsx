'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient, AnamEvent } from '@anam-ai/js-sdk';

interface NewAnamVideoPanelProps {
  caseId: string;
  caseTitle: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'judge';
  message: string;
  timestamp: Date;
}

export function NewAnamVideoPanel({ caseId, caseTitle }: NewAnamVideoPanelProps) {
  const [shouldStartSession, setShouldStartSession] = useState(false);
  const [isInSession, setIsInSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isJudgeConnected, setIsJudgeConnected] = useState(false);
  const [anamClient, setAnamClient] = useState<any>(null);
  const [sessionType, setSessionType] = useState<'test' | 'official' | null>(null);
  
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const judgeVideoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const interviewId = `case-${caseId}`;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle Anam client setup and streaming
  useEffect(() => {
    console.log('🎯 Anam useEffect triggered:', {
      hasSessionToken: !!sessionToken,
      isInSession,
      interviewId
    });
    
    if (!sessionToken || !isInSession) {
      console.log('🚫 Early return - missing sessionToken or not in session');
      return;
    }

    console.log('Setting up Anam client...');
    
    // Prevent double initialization in React Strict Mode
    let isCleaningUp = false;
    let connectionEstablished = false;
    
    const setupAnamClient = async () => {
      console.log('🚀 setupAnamClient called, isCleaningUp:', isCleaningUp);
      
      if (isCleaningUp) {
        console.log('🚫 setupAnamClient aborted - already cleaning up');
        return;
      }
      
      try {
        // Create Anam client
        const anam = createClient(sessionToken);
        setAnamClient(anam);
        console.log('✅ Anam client created');
        
        // Set up event listeners
        anam.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
          console.log('🔗 CONNECTION_ESTABLISHED event fired', {
            isCleaningUp,
            connectionEstablished
          });
          
          if (!isCleaningUp) {
            console.log('✅ Judge avatar connected - setting state');
            connectionEstablished = true;
            setIsJudgeConnected(true);
          } else {
            console.log('🚫 CONNECTION_ESTABLISHED ignored - cleaning up');
          }
        });
        
        anam.addListener(AnamEvent.CONNECTION_CLOSED, () => {
          console.log('❌ CONNECTION_CLOSED event fired', {
            isCleaningUp,
            connectionEstablished
          });
          
          if (!isCleaningUp) {
            console.log('⚠️ Judge avatar disconnected - setting state');
            setIsJudgeConnected(false);
          } else {
            console.log('🚫 CONNECTION_CLOSED ignored - cleaning up');
          }
        });
        
        // Wait for video element to be fully mounted
        console.log('⏳ Waiting 200ms for video element...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Start streaming to video element
        if (judgeVideoRef.current && !isCleaningUp) {
          judgeVideoRef.current.id = `anam-judge-${interviewId}`;
          console.log('📹 Starting stream to video element:', judgeVideoRef.current.id);
          
          await anam.streamToVideoElement(judgeVideoRef.current.id);
          console.log('✅ Avatar streaming started successfully');
        } else {
          console.log('🚫 Judge video element not found or cleaning up:', {
            hasRef: !!judgeVideoRef.current,
            isCleaningUp
          });
        }
        
      } catch (err) {
        console.log('💥 setupAnamClient error:', {
          error: err,
          isCleaningUp,
          connectionEstablished
        });
        
        if (!isCleaningUp) {
          console.error('Failed to setup Anam client:', err);
          setError(`Avatar setup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    };

    setupAnamClient();

    return () => {
      console.log('🧹 useEffect cleanup triggered', {
        isCleaningUp,
        connectionEstablished,
        hasClient: !!anamClient
      });
      
      isCleaningUp = true;
      
      if (anamClient) {
        try {
          console.log('🛑 Stopping Anam client streaming...');
          anamClient.stopStreaming();
        } catch (err) {
          console.error('Error stopping Anam client:', err);
        }
      }
    };
  }, [sessionToken, isInSession, interviewId]);

  const handleStartButtonClick = (type: 'test' | 'official') => {
    console.log('Button clicked, setting shouldStartSession to true with type:', type);
    setSessionType(type);
    setShouldStartSession(true);
  };

  useEffect(() => {
    console.log('useEffect triggered:', {
      shouldStartSession,
      userVideoRef: !!userVideoRef.current,
      judgeVideoRef: !!judgeVideoRef.current,
      isInSession,
      isLoading
    });
    
    if (shouldStartSession && userVideoRef.current && judgeVideoRef.current && !isInSession && !isLoading) {
      console.log('All conditions met, calling startSession');
      startSession();
      setShouldStartSession(false); // Reset to prevent re-triggering
    }
  }, [shouldStartSession, userVideoRef.current, judgeVideoRef.current, isInSession, isLoading]);

  const startSession = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Starting new Anam video session...');
      
      // Get user camera and microphone
      console.log('Getting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 },
        audio: true 
      });
      
      setUserStream(stream);
      
      // Double-check video elements are available before proceeding
      if (!userVideoRef.current) {
        console.error('User video element not available');
        throw new Error('User video element not available - please try again');
      }
      
      if (!judgeVideoRef.current) {
        console.error('Judge video element not available');
        throw new Error('Judge video element not available - please try again');
      }
      
      // Set up user video with better error handling
      userVideoRef.current.srcObject = stream;
      userVideoRef.current.muted = true; // Echo cancellation
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        if (userVideoRef.current) {
          userVideoRef.current.onloadedmetadata = () => {
            console.log('User video metadata loaded');
            resolve(undefined);
          };
          // Fallback timeout
          setTimeout(resolve, 1000);
        } else {
          resolve(undefined);
        }
      });
      
      try {
        await userVideoRef.current.play();
        console.log('User video playing successfully');
      } catch (err) {
        console.warn('User video autoplay blocked, user may need to click:', err);
      }
      
      // Create session token first
      console.log('Creating Anam session token...');
      const sessionResponse = await fetch('/api/anam/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId })
      });
      
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create Anam session');
      }
      
      const { sessionToken: token } = await sessionResponse.json();
      console.log('Anam session token created');
      
      setSessionToken(token);
      setIsInSession(true);
      console.log('Session started successfully');
      
    } catch (err: any) {
      console.error('Failed to start session:', err);
      const errorMessage = err?.message || 'Failed to start session';
      
      if (errorMessage.includes('Permission denied')) {
        setError('Camera/microphone permission denied. Please allow access in your browser.');
      } else if (errorMessage.includes('NotFound')) {
        setError('No camera found. Please connect a camera and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopSession = () => {
    console.log('Stopping session...');
    
    // Stop user media
    if (userStream) {
      userStream.getTracks().forEach(track => track.stop());
      setUserStream(null);
    }
    
    // Clear user video
    if (userVideoRef.current) {
      userVideoRef.current.srcObject = null;
    }
    
    // Stop Anam session
    if (anamClient) {
      try {
        anamClient.stopStreaming();
      } catch (err) {
        console.error('Error stopping Anam client:', err);
      }
      setAnamClient(null);
    }
    
    // Clear session token
    setSessionToken('');
    
    // Reset state
    setIsInSession(false);
    setIsJudgeConnected(false);
    setChatMessages([]);
    setError('');
    setSessionType(null);
    console.log('Session stopped');
  };

  const addChatMessage = (sender: 'user' | 'judge', message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender,
      message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    const message = chatInput.trim();
    addChatMessage('user', message);
    
    // Send message to Anam
    try {
      // Note: Anam SDK doesn't have a direct sendMessage method
      // The judge will respond based on audio input
      console.log('User message:', message);
    } catch (err: any) {
      console.error('Failed to send message to judge:', err);
      setError('Failed to send message to judge');
    }
    
    setChatInput('');
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">
            {isInSession 
              ? `Live ${sessionType === 'official' ? 'Official' : 'Test'} Session with AI Judge` 
              : '1:1 AI Judge Session'}
          </h3>
          {isInSession && (
            <button
              onClick={stopSession}
              className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
            >
              End Session
            </button>
          )}
        </div>
        
        {!isInSession && (
          <div className="text-center">
            <p className="text-slate-600 mb-6">Start a video session with an AI judge</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Test Hearing Button */}
              <button
                onClick={() => handleStartButtonClick('test')}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Starting Session...' : 'Test Hearing'}
              </button>
              
              {/* Official Hearing Button */}
              <button
                onClick={() => handleStartButtonClick('official')}
                disabled={isLoading}
                className="bg-green-600 text-white px-6 py-3 rounded-full font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                {isLoading ? 'Starting Session...' : 'Official Hearing'}
              </button>
            </div>
          </div>
        )}
        
        {/* Video Grid - Always rendered but hidden when not in session */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${!isInSession ? 'hidden' : ''}`}>
          {/* User Camera */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={userVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
              You
            </div>
          </div>
          
          {/* AI Judge Avatar */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={judgeVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
              AI Judge {isJudgeConnected ? '(Connected)' : '(Connecting...)'}
            </div>
          </div>
        </div>
        
        {/* Chat Panel */}
        <div className="border border-slate-200 rounded-lg">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h4 className="font-medium text-slate-900">Chat - Share Evidence & Messages</h4>
          </div>
          
          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            className="h-64 overflow-y-auto p-4 space-y-3"
          >
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-500 text-sm">
                No messages yet. Start a conversation with the judge.
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {msg.sender === 'user' ? 'You' : 'Judge'}
                    </div>
                    <div className="text-sm">{msg.message}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Chat Input */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleChatKeyPress}
                placeholder="Type your message or share evidence..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isJudgeConnected}
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
        
        {/* Session Info */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-sm text-slate-600">
            <div className="font-medium">Session Details:</div>
            <div>Case: {caseTitle}</div>
            <div>Session ID: {interviewId}</div>
            <div>Type: <span className={`font-medium ${sessionType === 'official' ? 'text-green-600' : 'text-blue-600'}`}>
              {sessionType ? (sessionType === 'official' ? 'Official Hearing' : 'Test Hearing') : 'Not started'}
            </span></div>
            <div>Status: {isJudgeConnected ? 'Both feeds active' : 'Connecting judge...'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
