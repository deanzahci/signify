import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ThemeWrapper } from './components/ThemeWrapper';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './styles/colors';
import {
  useFonts,
  Sora_400Regular as SoraRegular,
  Sora_600SemiBold as SoraSemiBold,
  Sora_700Bold as SoraBold,
  Sora_800ExtraBold as SoraExtraBold
} from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Screens
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import GameScreen from './screens/GameScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Leaderboard') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Game') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isDarkMode ? colors.dark.brutalBlue : '#0066FF',
        tabBarInactiveTintColor: isDarkMode ? colors.dark.brutalTextSecondary : '#000000',
        tabBarLabelStyle: {
          fontFamily: 'Sora-Bold',
          fontSize: 12,
        },
        tabBarStyle: {
          backgroundColor: isDarkMode ? colors.dark.brutalSurface : '#FFFFFF',
          borderTopWidth: 3,
          borderTopColor: isDarkMode ? colors.dark.brutalBorder : '#000000',
          height: 85,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Game" component={GameScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const { isDarkMode } = useTheme();

  if (loading) {
    return (
      <View style={[
        styles.loadingContainer,
        isDarkMode && { backgroundColor: colors.dark.brutalBackground }
      ]}>
        <View style={[
          styles.loadingBox,
          isDarkMode && {
            backgroundColor: colors.dark.brutalBlue,
            borderColor: colors.dark.brutalBorder,
            shadowColor: colors.dark.brutalShadow,
          }
        ]}>
          <ActivityIndicator size="large" color={isDarkMode ? colors.dark.brutalWhite : "#FFFFFF"} />
        </View>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDarkMode ? colors.dark.brutalSurface : '#FFFFFF',
        },
        headerTintColor: isDarkMode ? colors.dark.brutalText : '#000000',
        headerTitleStyle: {
          fontFamily: 'Sora-Bold',
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen
          name="HomeTabs"
          component={TabNavigator}
          options={{
            headerShown: false,
          }}
        />
      ) : (
        <>
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{
              title: '',
              headerStyle: {
                backgroundColor: isDarkMode ? colors.dark.brutalSurface : '#FFFFFF',
              },
              headerShadowVisible: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const AppContent = ({ onLayoutRootView }) => {
  const { isDarkMode } = useTheme();

  return (
    <ThemeWrapper style={{ backgroundColor: isDarkMode ? colors.dark.brutalBackground : colors.brutalWhite }}>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <AppNavigator />
      </View>
    </ThemeWrapper>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'Sora-Regular': SoraRegular,
    'Sora-SemiBold': SoraSemiBold,
    'Sora-Bold': SoraBold,
    'Sora-ExtraBold': SoraExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppContent onLayoutRootView={onLayoutRootView} />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.brutalWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    width: 80,
    height: 80,
    backgroundColor: colors.brutalBlue,
    borderWidth: 3,
    borderColor: colors.brutalBlack,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brutalBlack,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
});