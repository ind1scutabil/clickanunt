import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getFlag } from '../featureFlags';
import { trackError } from '../telemetry';
import { THEME } from '../theme';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    if (!getFlag('enterprise_observability')) {
      return;
    }

    trackError('mobile_render_error', error).catch(() => {});
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>A apărut o eroare neașteptată</Text>
        <Text style={styles.subtitle}>Încearcă să reîncarci ecranul.</Text>
        <Pressable style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Reîncarcă</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    paddingHorizontal: 20,
  },
  title: {
    color: THEME.colors.textPrimary,
    fontWeight: '800',
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: 14,
    height: 42,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
