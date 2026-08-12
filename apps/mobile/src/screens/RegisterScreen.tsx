import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { MOBILE_CONFIG } from '../config';
import { useLocalE2eFormSeed } from '../dev/localE2e';
import { THEME } from '../theme';

type Props = {
  onGoToLogin: () => void;
  onGoToBusinessRegister?: () => void;
};

function openSitePath(path: string): void {
  const p = path.startsWith('/') ? path : `/${path}`;
  void Linking.openURL(`${MOBILE_CONFIG.siteUrl}${p}`);
}

/**
 * Native personal register → POST /api/auth/mobile-register
 * (name, email, password — same as mobileRegisterSchema).
 */
export function RegisterScreen({ onGoToLogin, onGoToBusinessRegister }: Props): React.JSX.Element {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLocalE2eFormSeed('EXPO_PUBLIC_E2E_REGISTER', () => {
    const stamp = String(Date.now()).slice(-6);
    setName(process.env.EXPO_PUBLIC_E2E_REG_NAME || 'Parity User');
    setEmail(process.env.EXPO_PUBLIC_E2E_REG_EMAIL || `parity${stamp}@example.com`);
    const pw = process.env.EXPO_PUBLIC_E2E_REG_PASSWORD || 'Password123!';
    setPassword(pw);
    setConfirmPassword(pw);
  });

  const submit = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }
    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || 'Înregistrare eșuată. Verifică datele.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandHeader}>
        <Text style={styles.title}>ClickAnunț</Text>
        <Text style={styles.subtitle}>Creează cont</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Nume"
          placeholderTextColor={THEME.colors.textMuted}
          value={name}
          onChangeText={setName}
          testID="register-name"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={THEME.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="register-email"
        />
        <TextInput
          style={styles.input}
          placeholder="Parolă"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          testID="register-password"
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmă parola"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          testID="register-confirm"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.button}
          onPress={() => void submit()}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Creează cont"
          testID="register-submit"
        >          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Creează cont</Text>
          )}
        </Pressable>

        {onGoToBusinessRegister ? (
          <Pressable onPress={onGoToBusinessRegister} accessibilityRole="button">
            <Text style={styles.link}>Cont firmă</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={onGoToLogin} accessibilityRole="button">
          <Text style={styles.link}>Ai deja cont? Conectare</Text>
        </Pressable>
      </View>

      <View style={styles.legalRow}>
        <Pressable onPress={() => openSitePath('/privacy')} accessibilityRole="link">
          <Text style={styles.legalLink}>Confidențialitate</Text>
        </Pressable>
        <Text style={styles.legalSep}>·</Text>
        <Pressable onPress={() => openSitePath('/terms')} accessibilityRole="link">
          <Text style={styles.legalLink}>Termeni</Text>
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
  brandHeader: { gap: 4 },
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
  input: {
    height: 46,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.surfaceAlt,
    color: THEME.colors.textPrimary,
  },
  error: { color: THEME.colors.error },
  button: {
    marginTop: 6,
    height: 46,
    borderRadius: THEME.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryStrong,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  link: {
    marginTop: 4,
    textAlign: 'center',
    color: THEME.colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  legalLink: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  legalSep: { color: THEME.colors.textMuted, fontSize: 12 },
});
