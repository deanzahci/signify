import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NBAlert = ({
  title,
  message,
  type = 'info',
  onClose,
  className = '',
}) => {
  const getTypeConfig = () => {
    const configs = {
      info: {
        bg: 'bg-brutal-blue',
        textColor: 'text-brutal-white',
        icon: 'information-circle',
      },
      success: {
        bg: 'bg-brutal-green',
        textColor: 'text-brutal-white',
        icon: 'checkmark-circle',
      },
      warning: {
        bg: 'bg-brutal-yellow',
        textColor: 'text-brutal-black',
        icon: 'warning',
      },
      error: {
        bg: 'bg-brutal-red',
        textColor: 'text-brutal-white',
        icon: 'close-circle',
      },
    };
    return configs[type] || configs.info;
  };

  const config = getTypeConfig();

  return (
    <View
      className={`
        ${config.bg}
        border-brutal
        border-brutal-black
        shadow-brutal
        p-4
        ${className}
      `}
    >
      <View className="flex-row items-start">
        <Ionicons
          name={config.icon}
          size={24}
          color={config.textColor === 'text-brutal-white' ? '#FFFFFF' : '#000000'}
        />
        <View className="flex-1 ml-3">
          {title && (
            <Text className={`${config.textColor} font-bold text-base mb-1`}>
              {title}
            </Text>
          )}
          {message && (
            <Text className={`${config.textColor} text-sm`}>
              {message}
            </Text>
          )}
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} className="ml-2">
            <Ionicons
              name="close"
              size={20}
              color={config.textColor === 'text-brutal-white' ? '#FFFFFF' : '#000000'}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default NBAlert;