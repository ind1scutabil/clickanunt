import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import {
  BUSINESS_CATEGORY_OPTIONS,
  buildMobileRegisterExtendedPayload,
  type BusinessCategory,
} from '../auth/register-extended-payload';
import { OptionSelect } from '../components/OptionSelect';
import { useLocalE2eFormSeed } from '../dev/localE2e';
import { THEME } from '../theme';

type Props = {
  onGoToLogin: () => void;
  onGoToPersonalRegister: () => void;
};

/**
 * Native business register → POST /api/auth/mobile-register-extended
 * (mobileRegisterExtendedSchema fields, accountType=business).
 */
export function RegisterBusinessScreen({
  onGoToLogin,
  onGoToPersonalRegister,
}: Props): React.JSX.Element {
  const { registerExtended } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessCUI, setBusinessCUI] = useState('');
  const [businessRegCom, setBusinessRegCom] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLocalE2eFormSeed('EXPO_PUBLIC_E2E_REGISTER_BUSINESS', () => {
    const stamp = String(Date.now()).slice(-6);
    setName('Biz Owner');
    setEmail(`biz${stamp}@example.com`);
    setPassword('Password123!');
    setConfirmPassword('Password123!');
    setBusinessName('Parity SRL');
    setBusinessCUI('RO12345678');
    setBusinessRegCom('J40/1234/2020');
    setBusinessPhone('0700111222');
    setBusinessLocation('București');
    setBusinessCategory('auto_dealer');
  });

  const submit = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }
    if (!businessCategory) {
      setError('Selectează tipul activității.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = buildMobileRegisterExtendedPayload({
        email: email.trim(),
        password,
        confirmPassword,
        name: name.trim(),
        businessName: businessName.trim(),
        businessCUI: businessCUI.trim(),
        businessRegCom: businessRegCom.trim(),
        businessPhone: businessPhone.trim(),
        businessLocation: businessLocation.trim() || undefined,
        businessEmail: businessEmail.trim() || undefined,
        businessWebsite: businessWebsite.trim() || undefined,
        businessDescription: businessDescription.trim() || undefined,
        businessCategory,
      });
      await registerExtended(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || 'Înregistrare firmă eșuată. Verifică datele.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabels = BUSINESS_CATEGORY_OPTIONS.map((o) => o.label);
  const categoryLabel =
    BUSINESS_CATEGORY_OPTIONS.find((o) => o.value === businessCategory)?.label ?? '';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brandHeader}>
        <Text style={styles.title}>ClickAnunț</Text>
        <Text style={styles.subtitle}>Cont firmă</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Persoană de contact"
          placeholderTextColor={THEME.colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email cont"
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
        <TextInput
          style={styles.input}
          placeholder="Confirmă parola"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Text style={styles.sectionLabel}>Date firmă</Text>
        <TextInput
          style={styles.input}
          placeholder="Denumire firmă"
          placeholderTextColor={THEME.colors.textMuted}
          value={businessName}
          onChangeText={setBusinessName}
        />
        <TextInput
          style={styles.input}
          placeholder="CUI / CIF"
          placeholderTextColor={THEME.colors.textMuted}
          autoCapitalize="characters"
          value={businessCUI}
          onChangeText={setBusinessCUI}
        />
        <TextInput
          style={styles.input}
          placeholder="Nr. Reg. Com."
          placeholderTextColor={THEME.colors.textMuted}
          value={businessRegCom}
          onChangeText={setBusinessRegCom}
        />
        <TextInput
          style={styles.input}
          placeholder="Telefon firmă"
          placeholderTextColor={THEME.colors.textMuted}
          keyboardType="phone-pad"
          value={businessPhone}
          onChangeText={setBusinessPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="Oraș / județ (opțional)"
          placeholderTextColor={THEME.colors.textMuted}
          value={businessLocation}
          onChangeText={setBusinessLocation}
        />
        <OptionSelect
          label="Tip activitate"
          value={categoryLabel}
          options={categoryLabels}
          placeholder="Selectează"
          onChange={(label) => {
            const found = BUSINESS_CATEGORY_OPTIONS.find((o) => o.label === label);
            setBusinessCategory(found?.value ?? '');
          }}
        />
        <TextInput
          style={styles.input}
          placeholder="Email firmă (opțional)"
          placeholderTextColor={THEME.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={businessEmail}
          onChangeText={setBusinessEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Website (opțional)"
          placeholderTextColor={THEME.colors.textMuted}
          autoCapitalize="none"
          value={businessWebsite}
          onChangeText={setBusinessWebsite}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descriere (opțional)"
          placeholderTextColor={THEME.colors.textMuted}
          multiline
          value={businessDescription}
          onChangeText={setBusinessDescription}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={() => void submit()} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Creează cont firmă</Text>
          )}
        </Pressable>

        <Pressable onPress={onGoToPersonalRegister} accessibilityRole="button">
          <Text style={styles.link}>Cont personal</Text>
        </Pressable>
        <Pressable onPress={onGoToLogin} accessibilityRole="button">
          <Text style={styles.link}>Ai deja cont? Conectare</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: THEME.colors.background },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 14,
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
  sectionLabel: {
    marginTop: 4,
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 46,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surfaceAlt,
    color: THEME.colors.textPrimary,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
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
});
