import { useEffect } from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && user.role === 'Employee') {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
      <View style={{ width: 100, height: 100, marginBottom: 24, borderRadius: 24, overflow: 'hidden' }}>
         <Image source={require('../assets/icon.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </View>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
