import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authApi, usersApi, type NotificationPreferencesPatch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { THEME } from '../theme';

const defaultNotif: Required<NotificationPreferencesPatch> = {
  email: true,
  sms: false,
  push: true,
  newMessages: true,
  priceAlerts: true,
  newsletter: false,
};

/**
 * Native account settings — same endpoints as web /dashboard/settings.
 */
export function AccountSettingsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { refreshUser, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [notifications, setNotifications] = useState(defaultNotif);

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [newEmail, setNewEmail] = useState('');
  const [changeEmailPwd, setChangeEmailPwd] = useState('');
  const [logoutAllPwd, setLogoutAllPwd] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const me = await usersApi.getMe();
      setEmail(me.email || '');
      setName(me.name || '');
      setPhone(me.phone || '');
      setLocation(typeof me.location === 'string' ? me.location : '');
      setNotifications({ ...defaultNotif, ...(me.notificationPreferences || {}) });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Nu am putut încărca setările.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setStatus(null);
    try {
      await usersApi.patchMe({
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
      });
      await refreshUser();
      setStatus('Profil salvat.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Eroare la salvare.');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotifications = async () => {
    setSavingNotif(true);
    setStatus(null);
    try {
      const res = await usersApi.patchNotificationPreferences(notifications);
      if (res.notifications) {
        setNotifications({ ...defaultNotif, ...res.notifications });
      }
      setStatus('Preferințe salvate.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Eroare la preferințe.');
    } finally {
      setSavingNotif(false);
    }
  };

  const savePassword = async () => {
    if (pwd.next !== pwd.confirm) {
      setStatus('Parola nouă și confirmarea nu coincid.');
      return;
    }
    setSavingPwd(true);
    setStatus(null);
    try {
      await authApi.changePassword({
        currentPassword: pwd.current,
        newPassword: pwd.next,
        confirmPassword: pwd.confirm,
      });
      setPwd({ current: '', next: '', confirm: '' });
      setStatus('Parola a fost schimbată.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Eroare la schimbarea parolei.');
    } finally {
      setSavingPwd(false);
    }
  };

  const changeEmail = async () => {
    if (!newEmail.trim() || !changeEmailPwd) {
      setStatus('Completează noul email și parola actuală.');
      return;
    }
    setSavingEmail(true);
    setStatus(null);
    try {
      const res = await authApi.changeEmail({
        newEmail: newEmail.trim(),
        currentPassword: changeEmailPwd,
      });
      setNewEmail('');
      setChangeEmailPwd('');
      await refreshUser();
      await load();
      setStatus(res.message || 'Email actualizat. Verifică noul inbox.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Eroare la schimbarea emailului.');
    } finally {
      setSavingEmail(false);
    }
  };

  const logoutAllDevices = async () => {
    if (!logoutAllPwd) {
      setStatus('Introdu parola pentru deconectarea dispozitivelor.');
      return;
    }
    setLoggingOutAll(true);
    setStatus(null);
    try {
      const res = await authApi.logoutAll({ currentPassword: logoutAllPwd });
      setLogoutAllPwd('');
      setStatus(res.message || 'Celelalte dispozitive au fost deconectate.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Operațiune eșuată.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  const deactivate = async () => {
    if (deleteConfirm.trim() !== 'ȘTERGE') {
      setStatus('Scrie exact ȘTERGE pentru confirmare.');
      return;
    }
    Alert.alert(
      'Dezactivează contul',
      'Această acțiune dezactivează contul. Continuăm?',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Dezactivează',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              setStatus(null);
              try {
                await usersApi.deactivate(deleteConfirm.trim());
                await logout();
              } catch (e) {
                setStatus(e instanceof Error ? e.message : 'Operațiune eșuată.');
                setDeleting(false);
              }
            })();
          },
        },
      ]
    );
  };

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications((n) => ({ ...n, [key]: !n[key] }));
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.section}>Profil</Text>
      <Text style={styles.hint}>{email}</Text>
      <TextInput
        style={styles.input}
        placeholder="Nume"
        placeholderTextColor={THEME.colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Telefon"
        placeholderTextColor={THEME.colors.textMuted}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Locație"
        placeholderTextColor={THEME.colors.textMuted}
        value={location}
        onChangeText={setLocation}
      />
      <Pressable style={styles.button} onPress={() => void saveProfile()} disabled={savingProfile}>
        {savingProfile ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Salvează profil</Text>
        )}
      </Pressable>

      <Text style={styles.section}>Notificări</Text>
      {(
        [
          ['email', 'Email'],
          ['sms', 'SMS'],
          ['push', 'Push'],
          ['newMessages', 'Mesaje noi'],
          ['priceAlerts', 'Alerte preț'],
          ['newsletter', 'Newsletter'],
        ] as const
      ).map(([key, label]) => (
        <View key={key} style={styles.switchRow}>
          <Text style={styles.switchLabel}>{label}</Text>
          <Switch
            value={Boolean(notifications[key])}
            onValueChange={() => toggleNotif(key)}
            trackColor={{ true: THEME.colors.primary, false: THEME.colors.border }}
          />
        </View>
      ))}
      <Pressable style={styles.button} onPress={() => void saveNotifications()} disabled={savingNotif}>
        {savingNotif ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Salvează preferințe</Text>
        )}
      </Pressable>

      <Text style={styles.section}>Schimbă parola</Text>
      <TextInput
        style={styles.input}
        placeholder="Parola actuală"
        placeholderTextColor={THEME.colors.textMuted}
        secureTextEntry
        value={pwd.current}
        onChangeText={(v) => setPwd((p) => ({ ...p, current: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Parola nouă"
        placeholderTextColor={THEME.colors.textMuted}
        secureTextEntry
        value={pwd.next}
        onChangeText={(v) => setPwd((p) => ({ ...p, next: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmă parola nouă"
        placeholderTextColor={THEME.colors.textMuted}
        secureTextEntry
        value={pwd.confirm}
        onChangeText={(v) => setPwd((p) => ({ ...p, confirm: v }))}
      />
      <Pressable style={styles.button} onPress={() => void savePassword()} disabled={savingPwd}>
        {savingPwd ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Actualizează parola</Text>
        )}
      </Pressable>

      <Text style={styles.section}>Schimbă email</Text>
      <TextInput
        style={styles.input}
        placeholder="Email nou"
        placeholderTextColor={THEME.colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={newEmail}
        onChangeText={setNewEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Parola actuală"
        placeholderTextColor={THEME.colors.textMuted}
        secureTextEntry
        value={changeEmailPwd}
        onChangeText={setChangeEmailPwd}
      />
      <Pressable style={styles.button} onPress={() => void changeEmail()} disabled={savingEmail}>
        {savingEmail ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Actualizează email</Text>
        )}
      </Pressable>

      <Text style={styles.section}>Deconectare pe toate dispozitivele</Text>
      <TextInput
        style={styles.input}
        placeholder="Parola actuală"
        placeholderTextColor={THEME.colors.textMuted}
        secureTextEntry
        value={logoutAllPwd}
        onChangeText={setLogoutAllPwd}
      />
      <Pressable style={styles.buttonSecondary} onPress={() => void logoutAllDevices()} disabled={loggingOutAll}>
        {loggingOutAll ? (
          <ActivityIndicator color={THEME.colors.textPrimary} />
        ) : (
          <Text style={styles.buttonSecondaryText}>Deconectează celelalte dispozitive</Text>
        )}
      </Pressable>

      <Text style={styles.sectionDanger}>Dezactivare cont</Text>
      <Text style={styles.hint}>Scrie ȘTERGE pentru confirmare.</Text>
      <TextInput
        style={styles.input}
        placeholder="ȘTERGE"
        placeholderTextColor={THEME.colors.textMuted}
        value={deleteConfirm}
        onChangeText={setDeleteConfirm}
        autoCapitalize="characters"
      />
      <Pressable style={styles.buttonDanger} onPress={() => void deactivate()} disabled={deleting}>
        {deleting ? (
          <ActivityIndicator color="#fecaca" />
        ) : (
          <Text style={styles.buttonDangerText}>Dezactivează contul</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, gap: 10 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  status: {
    color: THEME.colors.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  section: {
    marginTop: 14,
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDanger: {
    marginTop: 22,
    color: '#fecaca',
    fontSize: 16,
    fontWeight: '800',
  },
  hint: { color: THEME.colors.textMuted, fontSize: 12 },
  input: {
    minHeight: 44,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    color: THEME.colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchLabel: { color: THEME.colors.textPrimary, fontWeight: '600' },
  button: {
    height: 44,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  buttonSecondary: {
    height: 44,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: { color: THEME.colors.textPrimary, fontWeight: '700' },
  buttonDanger: {
    height: 44,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(69, 10, 10, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDangerText: { color: '#fecaca', fontWeight: '700' },
});
