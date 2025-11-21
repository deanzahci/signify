import React, { useState } from 'react';
import { View, TextInput, Text } from 'react-native';

const NBInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  multiline = false,
  numberOfLines = 1,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`mb-4 ${className}`}>
      {label && (
        <Text className="text-brutal-black font-bold text-base mb-2">
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          bg-brutal-white
          border-brutal
          border-brutal-black
          ${isFocused ? 'shadow-brutal-lg bg-brutal-gray' : 'shadow-brutal'}
          px-4
          ${multiline ? 'py-3' : 'py-4'}
          font-mono
          text-base
          text-brutal-black
          ${!editable ? 'opacity-50' : ''}
          ${error ? 'border-brutal-red' : ''}
          ${inputClassName}
        `}
        {...props}
      />
      {error && (
        <Text className="text-brutal-red font-bold text-sm mt-1">
          {error}
        </Text>
      )}
    </View>
  );
};

export default NBInput;