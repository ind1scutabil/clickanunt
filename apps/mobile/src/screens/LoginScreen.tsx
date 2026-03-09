import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { THEME } from '../theme';

export function LoginScreen(): React.JSX.Element {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : null;
      setError(message || 'Autentificare eșuată. Verifică datele introduse.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandHeader}>
        <Text style={styles.title}>ClickAnunt</Text>
        <Text style={styles.subtitle}>Enterprise Mobile Experience</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Conectare în cont</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={THEME.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Parolă"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={submit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Conectare</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: THEME.colors.background,
  },
  brandHeader: {
    gap: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    padding: 14,
    gap: 10,
    ...THEME.shadow.card,
  },
  formTitle: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  input: {
    height: 46,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.surfaceAlt,
    color: THEME.colors.textPrimary,
  },
  error: {
    color: THEME.colors.error,
  },
  button: {
    marginTop: 6,
    height: 46,
    borderRadius: THEME.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryStrong,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
