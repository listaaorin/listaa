import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../../lib/theme';

// Custom tab bar icons
function HomeIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      <View style={styles.dotsGroup}>
        <View style={[styles.bigDot, { backgroundColor: focused ? Colors.navActive : Colors.navInactive }]} />
        <View style={styles.smallDotsRow}>
          <View style={[styles.smallDot, { backgroundColor: focused ? Colors.navActive : Colors.navInactive }]} />
          <View style={[styles.smallDot, { backgroundColor: focused ? Colors.navActive : Colors.navInactive }]} />
        </View>
      </View>
    </View>
  );
}

function SearchIcon({ focused }: { focused: boolean }) {
  const color = focused ? Colors.primary : Colors.navInactive;
  return (
    <View style={styles.tabIconContainer}>
      <View style={[styles.searchCircle, { borderColor: color }]} />
      <View style={[styles.searchHandle, { backgroundColor: color }]} />
    </View>
  );
}

function CalendarIcon({ focused }: { focused: boolean }) {
  const color = focused ? Colors.primary : Colors.navInactive;
  return (
    <View style={[styles.calIconOuter, { borderColor: color }]}>
      <View style={[styles.calIconHeader, { backgroundColor: color }]} />
      <View style={styles.calIconGrid}>
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={[styles.calCell, { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.navInactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "My Listaa's",
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
          tabBarActiveTintColor: Colors.navActive,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <SearchIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => <CalendarIcon focused={focused} />,
        }}
      />
      <Tabs.Screen name="arc/index" options={{ href: null }} />
      <Tabs.Screen name="arc/[id]" options={{ href: null }} />
      <Tabs.Screen name="vault/index" options={{ href: null }} />
      <Tabs.Screen name="vault/[id]" options={{ href: null }} />
      <Tabs.Screen name="capture" options={{ href: null }} />
      <Tabs.Screen name="partner-invite" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.black,
    borderTopWidth: 0,
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Home dots icon (matching design)
  dotsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bigDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  smallDotsRow: {
    flexDirection: 'column',
    gap: 3,
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Search icon
  searchCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  searchHandle: {
    width: 2,
    height: 8,
    borderRadius: 1,
    position: 'absolute',
    bottom: 0,
    right: 4,
    transform: [{ rotate: '45deg' }],
  },
  // Calendar icon
  calIconOuter: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  calIconHeader: {
    height: 6,
    width: '100%',
  },
  calIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    padding: 2,
  },
  calCell: {
    width: 4,
    height: 4,
    borderRadius: 1,
    opacity: 0.5,
  },
});
