import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ name, focused }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: colors.primaryLight }]}>
      <Ionicons name={name} size={22} color={focused ? colors.primary : colors.textMuted} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const adjustedPadding = insets.bottom > 0 ? insets.bottom - 4 : 6;
  const adjustedHeight = 58 + adjustedPadding;
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
        tabBarStyle: [styles.tabBar, { 
          backgroundColor: colors.bgCard, 
          borderTopColor: colors.borderLight,
          height: adjustedHeight,
          paddingBottom: adjustedPadding
        }],
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint={colors.statusBar === 'light' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgCard }]} />
          )
        ),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaves"
        options={{
          tabBarLabel: 'Leaves',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'leaf' : 'leaf-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="payslips"
        options={{
          tabBarLabel: 'Payslips',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'receipt' : 'receipt-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />
      
      {/* Hide these from tab bar but keep routes active */}
      <Tabs.Screen name="shift" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="holidays" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
});
