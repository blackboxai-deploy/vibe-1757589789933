"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { VoiceAgent as VoiceAgentCore } from "@/lib/voiceAgent";
import { getSpeechService } from "@/lib/speechService";
import { ConversationMessage } from "@/types";
import CallInterface from "./CallInterface";
import ConversationDisplay from "./ConversationDisplay";

interface VoiceAgentProps {
  onEndCall: () => void;
}

export default function VoiceAgent({ onEndCall }: VoiceAgentProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'testing' | 'granted' | 'denied'>('unknown');
  const [browserInfo, setBrowserInfo] = useState<string>('');
  const [showMicrophoneTroubleshooting, setShowMicrophoneTroubleshooting] = useState(false);

  const agentRef = useRef<VoiceAgentCore | null>(null);
  const speechServiceRef = useRef(getSpeechService());

   useEffect(() => {
    // Initialize voice agent
    agentRef.current = new VoiceAgentCore();
    
    // Check voice support and browser compatibility
    const compatibility = speechServiceRef.current.getBrowserCompatibility();
    setIsVoiceSupported(speechServiceRef.current.isSupported());
    setBrowserInfo(compatibility.browserInfo);
    
    // Test microphone on component mount
    testMicrophoneAccess();
    
    // Start the call automatically
    startCall();
    
    return () => {
      // Cleanup on unmount
      if (speechServiceRef.current) {
        speechServiceRef.current.stopListening();
        speechServiceRef.current.stopSpeaking();
      }
    };
  }, []);

  const startCall = async () => {
    if (!agentRef.current) return;
    
    setIsCallActive(true);
    setError(null);
    
    const greeting = agentRef.current.startCall();
    updateConversation();
    
    // Speak the greeting
    if (isVoiceSupported) {
      await speakText(greeting);
    }
  };

    const testMicrophoneAccess = async (): Promise<boolean> => {
    setMicrophoneStatus('testing');
    
    try {
      const result = await speechServiceRef.current.testMicrophone();
      if (result.success) {
        setMicrophoneStatus('granted');
        setError(null);
        return true;
      } else {
        setMicrophoneStatus('denied');
        setError(result.details);
        setShowMicrophoneTroubleshooting(true);
        return false;
      }
    } catch (error) {
      setMicrophoneStatus('denied');
      setError('Failed to test microphone access');
      setShowMicrophoneTroubleshooting(true);
      return false;
    }
  };

  const handleVoiceInput = async () => {
    if (!speechServiceRef.current || isListening || isSpeaking) return;
    
    setError(null);
    
    // Test microphone access first if not already granted
    if (microphoneStatus !== 'granted') {
      const hasAccess = await testMicrophoneAccess();
      if (!hasAccess) {
        return;
      }
    }
    
    setIsListening(true);
    
    const success = await speechServiceRef.current.startListening(
      (result: string) => {
        setIsListening(false);
        if (result.trim()) {
          processUserInput(result, true);
        }
      },
      (error: string) => {
        setIsListening(false);
        setError(error);
        setShowMicrophoneTroubleshooting(true);
      },
      () => {
        setIsListening(false);
      }
    );

    if (!success) {
      setIsListening(false);
      setShowMicrophoneTroubleshooting(true);
    }
  };

   const handleRetryMicrophone = async () => {
    setShowMicrophoneTroubleshooting(false);
    setError(null);
    const hasAccess = await testMicrophoneAccess();
    if (hasAccess) {
      setShowMicrophoneTroubleshooting(false);
    }
  };

  const handleTextInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim()) {
      processUserInput(currentInput, false);
      setCurrentInput("");
    }
  };

  const processUserInput = async (input: string, isVoice: boolean) => {
    if (!agentRef.current || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = agentRef.current.processUserInput(input, isVoice);
      updateConversation();
      
      // Speak the response if voice is supported
      if (isVoiceSupported && response) {
        await speakText(response);
      }
    } catch (error) {
      setError('Sorry, I encountered an error processing your request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string): Promise<void> => {
    if (!speechServiceRef.current || !text) return;
    
    setIsSpeaking(true);
    
    try {
      await speechServiceRef.current.speak(
        text,
        () => {
          // On start speaking
        },
        () => {
          // On end speaking
          setIsSpeaking(false);
        },
        (error: string) => {
          // On error
          setIsSpeaking(false);
          console.error('Speech synthesis error:', error);
        }
      );
    } catch (error) {
      setIsSpeaking(false);
      console.error('Failed to speak:', error);
    }
  };

  const updateConversation = () => {
    if (agentRef.current) {
      setConversation(agentRef.current.getConversation());
    }
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    
    if (speechServiceRef.current) {
      speechServiceRef.current.stopListening();
      speechServiceRef.current.stopSpeaking();
    }
    
    onEndCall();
  };

  const handleStopListening = () => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stopListening();
    }
    setIsListening(false);
  };

  const handleStopSpeaking = () => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stopSpeaking();
    }
    setIsSpeaking(false);
  };

   return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Microphone Troubleshooting */}
      {showMicrophoneTroubleshooting && (
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2 text-orange-800">
              <span>🎤</span>
              <span>Microphone Troubleshooting</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">Current Status:</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Browser: <span className="font-medium">{browserInfo}</span>
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  Microphone: <span className={`font-medium ${
                    microphoneStatus === 'granted' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {microphoneStatus === 'testing' ? 'Testing...' : 
                     microphoneStatus === 'granted' ? 'Access Granted' : 
                     microphoneStatus === 'denied' ? 'Access Denied' : 'Unknown'}
                  </span>
                </p>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {error}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">Troubleshooting Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                  <li>Look for a microphone icon 🎤 in your browser's address bar and click "Allow"</li>
                  <li>Make sure your microphone is connected and not being used by other apps</li>
                  <li>Check your browser's site settings and ensure microphone access is enabled</li>
                  <li>Try refreshing the page and allowing microphone access when prompted</li>
                  <li>For Chrome: Go to Settings → Privacy → Site Settings → Microphone</li>
                  <li>Make sure you're using HTTPS (secure connection)</li>
                </ol>
              </div>

              <div className="flex space-x-4">
                <Button 
                  onClick={handleRetryMicrophone}
                  disabled={microphoneStatus === 'testing'}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {microphoneStatus === 'testing' ? 'Testing...' : '🔄 Test Microphone Again'}
                </Button>
                 <Button 
                  variant="outline"
                  onClick={() => setShowMicrophoneTroubleshooting(false)}
                >
                  Continue with Text Only
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.open('/microphone-help', '_blank')}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  📖 Detailed Help Guide
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Interface */}
       <CallInterface
        isCallActive={isCallActive}
        isListening={isListening}
        isSpeaking={isSpeaking}
        isVoiceSupported={isVoiceSupported}
        onStartVoice={handleVoiceInput}
        onStopListening={handleStopListening}
        onStopSpeaking={handleStopSpeaking}
        onEndCall={handleEndCall}
        error={error}
        onTestMicrophone={handleRetryMicrophone}
      />

      {/* Conversation Display */}
      <ConversationDisplay
        conversation={conversation}
        isProcessing={isProcessing}
      />

      {/* Text Input Alternative */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <span>💬</span>
            <span>Type Your Message</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTextInput} className="flex space-x-4">
            <Input
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Type your message here..."
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!currentInput.trim() || isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? "Processing..." : "Send"}
            </Button>
          </form>
          <p className="text-sm text-gray-500 mt-2">
            You can type your responses here as an alternative to voice input.
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => processUserInput("I need to schedule an appointment", false)}
              disabled={isProcessing}
            >
              📅 Schedule Appointment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processUserInput("What are your hours?", false)}
              disabled={isProcessing}
            >
              🕒 Hours & Location
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processUserInput("I have a dental emergency", false)}
              disabled={isProcessing}
            >
              🚨 Emergency Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processUserInput("What services do you offer?", false)}
              disabled={isProcessing}
            >
              🦷 Services
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}