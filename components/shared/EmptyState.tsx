import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius } from '../../lib/theme';

interface Props {
  mode: 'arc' | 'vault';
  onAdd: () => void;
}

export default function EmptyState({ mode, onAdd }: Props) {
  const isArc = mode === 'arc';
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={onAdd} activeOpacity={0.85}>
        <Text style={styles.addButtonText}>
          + Add new {isArc ? (
            <>
              <Text style={styles.arcCurve}>A</Text>
              rc
            </>
          ) : 'Vault item'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        {isArc
          ? 'This helps you keep track of things'
          : 'Store knowledge your family needs'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
    minHeight: 400,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 20,
    paddingHorizontal: Spacing.xl,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  arcCurve: {
    // The Arc "A" with the arc visual from the design
    color: Colors.white,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
});
