import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { styled } from 'nativewind';
import theme from '../theme';

const StyledText = styled(RNText);

interface TextProps extends RNTextProps {
  variant?: 'body' | 'title' | 'heading' | 'caption' | 'neon';
  className?: string;
}

const variantClasses = {
  body: 'text-white/90 text-base',
  title: 'text-white font-bold text-xl',
  heading: 'text-white font-bold text-2xl',
  caption: 'text-white/70 text-sm',
  neon: 'text-neon-green font-bold text-lg',
};

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  className = '',
  style,
  children,
  ...props
}) => {
  const variantClass = variantClasses[variant];

  return (
    <StyledText
      className={`font-primary ${variantClass} ${className}`}
      style={[
        variant === 'neon' && {
          textShadowColor: theme.colors.neon.green,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </StyledText>
  );
};