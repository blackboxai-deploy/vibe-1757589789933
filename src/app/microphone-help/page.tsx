"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSpeechService } from "@/lib/speechService";

export default function MicrophoneHelpPage() {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    details: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runMicrophoneTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const speechService = getSpeechService();
      const result = await speechService.testMicrophone();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: 'Test failed',
        details: `Microphone test failed: ${error.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getBrowserSpecificInstructions = () => {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) {
      return {
        name: 'Google Chrome',
        instructions: [
          'Click the microphone icon 🎤 in the address bar',
          'Select "Always allow" and click "Done"',
          'Alternatively: Settings → Privacy and security → Site settings → Microphone → Allow',
          'Make sure this site is not in the "Blocked" list'
        ]
      };
    } else if (userAgent.includes('Firefox')) {
      return {
        name: 'Mozilla Firefox',
        instructions: [
          'Click the microphone icon 🎤 in the address bar',
          'Select "Allow" and check "Remember this decision"',
          'Alternatively: Settings → Privacy & Security → Permissions → Microphone → Settings',
          'Add this site to the allowed list'
        ]
      };
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return {
        name: 'Safari',
        instructions: [
          'Safari → Preferences → Websites → Microphone',
          'Set this website to "Allow"',
          'Or click "Allow" when prompted for microphone access',
          'Make sure microphone access is enabled in System Preferences → Security & Privacy'
        ]
      };
    } else if (userAgent.includes('Edge')) {
      return {
        name: 'Microsoft Edge',
        instructions: [
          'Click the microphone icon 🎤 in the address bar',
          'Select "Allow" from the dropdown',
          'Alternatively: Settings → Site permissions → Microphone → Allow',
          'Add this site to the allowed list if needed'
        ]
      };
    }
    
    return {
      name: 'Your Browser',
      instructions: [
        'Look for a microphone icon 🎤 in the address bar',
        'Click "Allow" when prompted for microphone access',
        'Check your browser\'s site settings or permissions',
        'Ensure microphone access is enabled for this site'
      ]
    };
  };

  const browserInfo = getBrowserSpecificInstructions();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🎤 Microphone Troubleshooting Guide
        </h1>
        <p className="text-gray-600">
          Having trouble with microphone access? This guide will help you resolve common issues and get your voice features working.
        </p>
      </div>

      {/* Microphone Test */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🧪</span>
            <span>Test Your Microphone</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Click the button below to test if your microphone is working properly with our voice agent.
            </p>
            
            <Button 
              onClick={runMicrophoneTest}
              disabled={isTesting}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isTesting ? 'Testing Microphone...' : '🎤 Test Microphone Access'}
            </Button>

            {testResult && (
              <Alert className={`${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span>{testResult.success ? '✅' : '❌'}</span>
                    <span className="font-semibold">
                      {testResult.success ? 'Microphone Test Passed!' : 'Microphone Test Failed'}
                    </span>
                  </div>
                  <p>{testResult.details}</p>
                  {testResult.error && (
                    <p className="text-sm mt-1 opacity-75">Error: {testResult.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Browser-Specific Instructions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🌐</span>
            <span>Instructions for {browserInfo.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Follow these steps to enable microphone access in {browserInfo.name}:
            </p>
            
            <ol className="list-decimal list-inside space-y-2">
              {browserInfo.instructions.map((instruction, index) => (
                <li key={index} className="text-gray-700">
                  {instruction}
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🔧</span>
            <span>Common Issues & Solutions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">🚫 "Microphone access denied"</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Look for a crossed-out microphone icon 🚫🎤 in your address bar</li>
                <li>Click it and change the setting to "Allow"</li>
                <li>Refresh the page after changing permissions</li>
                <li>Clear your browser cache and cookies if the issue persists</li>
              </ul>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">🎤 "No microphone found"</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Check that your microphone is properly connected</li>
                <li>Test your microphone in other applications</li>
                <li>Check your computer's sound settings</li>
                <li>Try unplugging and reconnecting USB microphones</li>
              </ul>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">📱 "Microphone in use by another application"</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Close other applications that might be using the microphone</li>
                <li>Check for video calling apps (Zoom, Teams, Discord, etc.)</li>
                <li>Restart your browser</li>
                <li>Restart your computer if necessary</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2">🔒 "HTTPS required"</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Voice features require a secure (HTTPS) connection</li>
                <li>Make sure the URL starts with "https://"</li>
                <li>Avoid using unsecured "http://" connections</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Requirements */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>⚙️</span>
            <span>System Requirements</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">✅ Supported Browsers</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Google Chrome (recommended)</li>
                <li>• Microsoft Edge</li>
                <li>• Safari (macOS)</li>
                <li>• Firefox (limited support)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">🖥️ Operating Systems</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Windows 10/11</li>
                <li>• macOS 10.14+</li>
                <li>• Ubuntu/Linux</li>
                <li>• Android (Chrome)</li>
                <li>• iOS (Safari)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>💡</span>
            <span>Still Need Help?</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              If you're still experiencing issues after following these steps:
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Alternative Options:</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Use the text input feature instead of voice</li>
                <li>• Try a different browser (Chrome works best)</li>
                <li>• Call our dental office directly at (555) 123-SMILE</li>
                <li>• Visit our office in person for immediate assistance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back to Main App */}
      <div className="mt-8 text-center">
        <Button 
          onClick={() => window.location.href = '/'}
          size="lg"
          className="bg-teal-600 hover:bg-teal-700"
        >
          🏠 Back to Voice Agent
        </Button>
      </div>
    </div>
  );
}