import { useState, useEffect, useRef, useCallback } from 'react';
import { useCreateOpenaiConversation, useListOpenaiConversations } from '@workspace/api-client-react';

export function useKarenSession() {
  const { data: conversations, isLoading: isConversationsLoading } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  const createdRef = useRef(false);

  useEffect(() => {
    if (isConversationsLoading) return;
    
    if (conversations && conversations.length > 0) {
      setConversationId(conversations[0].id);
    } else if (!createdRef.current) {
      createdRef.current = true;
      createConversation.mutate(
        { data: { title: "Karen Session" } },
        {
          onSuccess: (newConv) => {
            setConversationId(newConv.id);
          },
          onError: (err) => {
            console.error("Failed to create conversation", err);
            createdRef.current = false;
          }
        }
      );
    }
  }, [conversations, isConversationsLoading, createConversation]);

  return { conversationId, isReady: conversationId !== null };
}
