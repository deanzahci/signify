import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import NBContainer from '../components/neobrutalist/NBContainer';
import NBButton from '../components/neobrutalist/NBButton';
import NBCard from '../components/neobrutalist/NBCard';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = () => {
  const { user, signOut } = useAuth();

  const features = [
    {
      icon: 'cube',
      title: 'Neo-Brutalist Design',
      description: 'Bold, stark, and unapologetic',
      color: 'primary',
    },
    {
      icon: 'flash',
      title: 'Lightning Fast',
      description: 'Optimized for performance',
      color: 'warning',
    },
    {
      icon: 'shield-checkmark',
      title: 'Secure Auth',
      description: 'Google OAuth integration',
      color: 'success',
    },
    {
      icon: 'code-slash',
      title: 'Clean Code',
      description: 'Modular and expandable',
      color: 'secondary',
    },
  ];

  const stats = [
    { label: 'Components', value: '10+' },
    { label: 'Screens', value: '5' },
    { label: 'Colors', value: '9' },
    { label: 'Shadows', value: '4' },
  ];

  return (
    <NBContainer safe>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <View>
              <Text className="font-mono text-sm text-brutal-black">
                Welcome back,
              </Text>
              <Text className="font-bold text-2xl text-brutal-black">
                {user?.name || 'User'}
              </Text>
            </View>
            {user?.picture ? (
              <View className="border-brutal border-brutal-black shadow-brutal overflow-hidden">
                <Image
                  source={{ uri: user.picture }}
                  className="w-16 h-16"
                />
              </View>
            ) : (
              <View className="w-16 h-16 bg-brutal-blue border-brutal border-brutal-black shadow-brutal items-center justify-center">
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Main Card */}
          <NBCard
            variant="primary"
            padding="large"
            className="mb-6"
          >
            <Text className="text-brutal-white font-bold text-xl mb-2">
              SIGNIFY APP
            </Text>
            <Text className="text-brutal-white font-mono text-sm mb-4">
              Your neo-brutalist React Native experience
            </Text>
            <View className="bg-brutal-white h-0.5 mb-4" />
            <Text className="text-brutal-white text-sm">
              This is your authenticated home screen. From here, you can explore
              all the brutal features and expand the app with your own functionality.
            </Text>
          </NBCard>

          {/* Stats Grid */}
          <Text className="font-bold text-xl text-brutal-black mb-4">
            APP STATS
          </Text>
          <View className="flex-row flex-wrap mb-6">
            {stats.map((stat, index) => (
              <View key={index} className="w-1/2 p-2">
                <NBCard padding="small">
                  <Text className="font-mono text-3xl text-brutal-blue font-bold">
                    {stat.value}
                  </Text>
                  <Text className="text-brutal-black text-sm font-bold">
                    {stat.label}
                  </Text>
                </NBCard>
              </View>
            ))}
          </View>

          {/* Features */}
          <Text className="font-bold text-xl text-brutal-black mb-4">
            FEATURES
          </Text>
          <View className="mb-6">
            {features.map((feature, index) => (
              <NBCard
                key={index}
                variant={feature.color}
                padding="medium"
                className="mb-3"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color={feature.color === 'secondary' ? '#000000' : '#FFFFFF'}
                  />
                  <View className="ml-4 flex-1">
                    <Text
                      className={`font-bold text-base ${
                        feature.color === 'secondary' || feature.color === 'warning'
                          ? 'text-brutal-black'
                          : 'text-brutal-white'
                      }`}
                    >
                      {feature.title}
                    </Text>
                    <Text
                      className={`text-sm mt-1 ${
                        feature.color === 'secondary' || feature.color === 'warning'
                          ? 'text-brutal-black'
                          : 'text-brutal-white'
                      } opacity-80`}
                    >
                      {feature.description}
                    </Text>
                  </View>
                </View>
              </NBCard>
            ))}
          </View>

          {/* User Info */}
          <NBCard padding="medium" className="mb-6">
            <Text className="font-bold text-base text-brutal-black mb-3">
              USER PROFILE
            </Text>
            <View className="space-y-2">
              <View className="flex-row">
                <Text className="font-mono text-sm text-brutal-black w-20">
                  Email:
                </Text>
                <Text className="text-sm text-brutal-black flex-1">
                  {user?.email || 'Not available'}
                </Text>
              </View>
              <View className="flex-row mt-2">
                <Text className="font-mono text-sm text-brutal-black w-20">
                  ID:
                </Text>
                <Text className="text-sm text-brutal-black flex-1" numberOfLines={1}>
                  {user?.id || 'Not available'}
                </Text>
              </View>
              <View className="flex-row mt-2">
                <Text className="font-mono text-sm text-brutal-black w-20">
                  Auth:
                </Text>
                <Text className="text-sm text-brutal-black flex-1">
                  Google OAuth
                </Text>
              </View>
            </View>
          </NBCard>

          {/* Sign Out Button */}
          <NBButton
            title="SIGN OUT"
            onPress={async () => {
              try {
                console.log('HomeScreen: Attempting to sign out...');
                await signOut();
                console.log('HomeScreen: Sign out successful');
              } catch (error) {
                console.error('HomeScreen: Sign out error:', error);
              }
            }}
            variant="danger"
            size="full"
            icon={<Ionicons name="log-out" size={20} color="#FFFFFF" />}
          />
        </View>
      </ScrollView>
    </NBContainer>
  );
};

export default HomeScreen;