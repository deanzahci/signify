import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';

const NBContainer = ({
  children,
  scroll = false,
  safe = true,
  className = '',
  contentClassName = '',
  ...props
}) => {
  const Container = safe ? SafeAreaView : View;
  const content = (
    <View className={`flex-1 bg-brutal-white ${contentClassName}`}>
      {children}
    </View>
  );

  return (
    <Container className={`flex-1 bg-brutal-white ${className}`} {...props}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </Container>
  );
};

export default NBContainer;