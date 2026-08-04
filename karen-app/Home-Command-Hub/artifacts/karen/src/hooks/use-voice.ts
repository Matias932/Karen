import { useState, useRef, useCallback } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'responding';

export type ChatMessage = {
  id: string;
  role: 'user' | 'karen' | 'system';
  content: string;
  isAction?: boolean;
  success?: boolean;
};

export function useVoiceInteraction(conversationId: number | null) {
  const [state, setState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  
  const addMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).substring(7) }]);
  }, []);

  const startListening = async () => {
    if (!conversationId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setState('processing');
        
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await sendAudioToKaren(audioBlob);
      };

      mediaRecorder.current.start(100);
      setState('listening');
    } catch (err) {
      console.error('Microphone access denied:', err);
      setState('idle');
    }
  };

  const stopListening = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
  };

  const sendAudioToKaren = async (blob: Blob) => {
    if (!conversationId) return;
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      const base64Audio = base64Data.split(',')[1];
      
      const baseUrl = import.meta.env.BASE_URL;
      const endpoint = `${baseUrl}api/openai/conversations/${conversationId}/voice-messages`;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio })
        });

        if (!response.body) throw new Error("No response body");

        setState('responding');
        
        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const dataStr = part.substring(6);
              if (dataStr === '[DONE]') continue;

              try {
                const event = JSON.parse(dataStr);
                
                if (event.type === 'user_transcript') {
                  addMessage({ role: 'user', content: event.text });
                } else if (event.type === 'karen_response') {
                  addMessage({ role: 'karen', content: event.text });
                } else if (event.type === 'audio') {
                  const audio = new Audio("data:audio/mp3;base64," + event.data);
                  audio.play();
                } else if (event.type === 'device_action') {
                  addMessage({ 
                    role: 'system', 
                    content: `Command: ${event.command} on ${event.deviceName} - ${event.message}`,
                    isAction: true,
                    success: event.success
                  });
                } else if (event.type === 'done') {
                  setState('idle');
                }
              } catch (e) {
                console.error("Failed to parse SSE event", e);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error communicating with Karen:", err);
        setState('idle');
      }
    };
  };

  return { state, startListening, stopListening, messages };
}
