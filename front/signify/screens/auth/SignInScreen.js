import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import NBContainer from '../../components/neobrutalist/NBContainer';
import NBButton from '../../components/neobrutalist/NBButton';
import NBInput from '../../components/neobrutalist/NBInput';
import NBCard from '../../components/neobrutalist/NBCard';
import { Ionicons } from '@expo/vector-icons';

const SignInScreen = ({ navigation }) => {
  const { signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Sign In Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    // Placeholder for email sign-in
    Alert.alert('Coming Soon', 'Email sign-in will be available soon!');
  };

  return (
    <NBContainer safe scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-8 justify-center">
          {/* Logo/Title Section */}
          <View className="items-center mb-12">
            <View className="bg-brutal-blue w-24 h-24 border-brutal border-brutal-black shadow-brutal-lg items-center justify-center mb-6">
              <Text className="text-brutal-white font-bold text-4xl">S</Text>
            </View>
            <Text className="font-bold text-3xl text-brutal-black">SIGNIFY</Text>
            <Text className="font-mono text-base text-brutal-black mt-2">
              Bold Authentication, Brutal Design
            </Text>
          </View>

          {/* Sign In Form */}
          <NBCard padding="large" className="mb-6">
            <Text className="font-bold text-2xl text-brutal-black mb-6">
              Welcome Back
            </Text>

            <NBInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <NBInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <NBButton
              title="SIGN IN"
              onPress={handleEmailSignIn}
              size="full"
              className="mb-4"
            />

            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-0.5 bg-brutal-black" />
              <Text className="mx-4 font-mono text-sm text-brutal-black">OR</Text>
              <View className="flex-1 h-0.5 bg-brutal-black" />
            </View>

            <NBButton
              title="SIGN IN WITH GOOGLE"
              onPress={handleGoogleSignIn}
              variant="secondary"
              size="full"
              loading={loading}
              icon={
                <Ionicons name="logo-google" size={20} color="#000000" />
              }
            />
          </NBCard>

          {/* Footer Links */}
          <View className="items-center">
            <Text className="font-mono text-sm text-brutal-black mb-4">
              Don't have an account?
            </Text>
            <NBButton
              title="CREATE ACCOUNT"
              onPress={() => navigation.navigate('SignUp')}
              variant="warning"
              size="medium"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </NBContainer>
  );
}

export default SignInScreen;