import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { messagesApi } from '../api/client';
import { THEME } from '../theme';
import type { MessageItem } from '../types';

type Props = {
  currentUserId: string;
  userId: string;
  conversationId?: string;
  listingId?: string;
};

export function ConversationScreen({ currentUserId, userId, conversationId, listingId }: Props): React.JSX.Element {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const thread = await messagesApi.thread(userId, { conversationId, listingId });
      setMessages(thread);
    } catch {
      setError('Nu am putut încărca conversația.');
    }
  }, [conversationId, listingId, userId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const submit = async () => {
    const text = content.trim();
    if (!text || sending) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      await messagesApi.send(userId, { content: text, conversationId, listingId });
      setContent('');
      await load();
    } catch {
      setError('Mesajul nu a putut fi trimis.');
    } finally {
      setSending(false);
    }
  };

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={sortedMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const mine = item.senderId === currentUserId;
          return (
            <View style={[styles.bubble, mine ? styles.myBubble : styles.otherBubble]}>
              <Text style={mine ? styles.myText : styles.otherText}>{item.content}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Scrie un mesaj..."
          style={styles.input}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={submit}>
          <Text style={styles.sendButtonText}>{sending ? '...' : 'Trimite'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  error: { color: THEME.colors.error, paddingHorizontal: 12, paddingTop: 8 },
  listContent: { padding: 12, gap: 8 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: THEME.colors.primaryStrong,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  myText: { color: '#FFFFFF' },
  otherText: { color: THEME.colors.textPrimary },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    padding: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    color: THEME.colors.textPrimary,
    backgroundColor: THEME.colors.surfaceAlt,
  },
  sendButton: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: THEME.colors.primaryStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
