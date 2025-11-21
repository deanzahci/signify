import React, { useState } from 'react';
import {
  View,
  Text,
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

const SignUpScreen = ({ navigation }) => {
  const { signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Sign Up Error', 'Failed to sign up with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = () => {
    if (validateForm()) {
      // Placeholder for email sign-up
      Alert.alert('Coming Soon', 'Email sign-up will be available soon!');
    }
  };

  return (
    <NBContainer safe scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-brutal-yellow w-20 h-20 border-brutal border-brutal-black shadow-brutal-lg items-center justify-center mb-4">
              <Ionicons name="person-add" size={32} color="#000000" />
            </View>
            <Text className="font-bold text-3xl text-brutal-black">CREATE ACCOUNT</Text>
            <Text className="font-mono text-sm text-brutal-black mt-2">
              Join the brutal revolution
            </Text>
          </View>

          {/* Sign Up Form */}
          <NBCard padding="large" className="mb-6">
            {/* Google Sign Up */}
            <NBButton
              title="SIGN UP WITH GOOGLE"
              onPress={handleGoogleSignUp}
              variant="secondary"
              size="full"
              loading={loading}
              className="mb-4"
              icon={
                <Ionicons name="logo-google" size={20} color="#000000" />
              }
            />

            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-0.5 bg-brutal-black" />
              <Text className="mx-4 font-mono text-sm text-brutal-black">OR</Text>
              <View className="flex-1 h-0.5 bg-brutal-black" />
            </View>

            {/* Form Fields */}
            <NBInput
              label="Full Name"
              placeholder="John Doe"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) {
                  setErrors({ ...errors, name: '' });
                }
              }}
              error={errors.name}
              autoCapitalize="words"
            />

            <NBInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors({ ...errors, email: '' });
                }
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <NBInput
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors({ ...errors, password: '' });
                }
              }}
              error={errors.password}
              secureTextEntry
            />

            <NBInput
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: '' });
                }
              }}
              error={errors.confirmPassword}
              secureTextEntry
            />

            <NBButton
              title="CREATE ACCOUNT"
              onPress={handleEmailSignUp}
              variant="primary"
              size="full"
            />
          </NBCard>

          {/* Footer */}
          <View className="items-center mb-8">
            <Text className="font-mono text-sm text-brutal-black mb-4">
              Already have an account?
            </Text>
            <NBButton
              title="SIGN IN"
              onPress={() => navigation.navigate('SignIn')}
              variant="secondary"
              size="medium"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </NBContainer>
  );
};

export default SignUpScreen;