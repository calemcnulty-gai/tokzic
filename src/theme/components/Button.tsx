import React from 'react';
import { 
  TouchableOpacity, 
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { styled } from 'nativewind';
import { Text } from './Text';
import theme from '../theme';

const StyledTouchableOpacity = styled(TouchableOpacity);

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'neon' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

const variants = {
  primary: 'bg-background-glass border border-neon-pink/30',
  secondary: 'bg-background-glass border border-white/10',
  ghost: 'border border-white/5',
  neon: 'bg-neon-pink/10 border border-neon-pink',
  danger: 'bg-status-error/10 border border-status-error',
};

const sizeClasses = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

const textVariants = {
  primary: 'text-neon-pink',
  secondary: 'text-white',
  ghost: 'text-white/80',
  neon: 'text-neon-pink font-bold',
  danger: 'text-status-error font-bold',
};

const shadows = {
  sm: {
    shadowColor: theme.colors.neon.pink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  md: {
    shadowColor: theme.colors.neon.pink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  textClassName = '',
  children,
  style,
  ...props
}) => {
  const baseClasses = 'flex-row items-center justify-center rounded-lg backdrop-blur-md';
  const variantClass = variants[variant];
  const sizeClass = sizeClasses[size];
  const textVariantClass = textVariants[variant];
  const disabledClass = disabled || loading ? 'opacity-50' : '';

  const buttonStyle = [
    variant === 'neon' ? shadows.md : shadows.sm,
    style,
  ];

  return (
    <StyledTouchableOpacity
      className={`${baseClasses} ${variantClass} ${sizeClass} ${disabledClass} ${className}`}
      style={buttonStyle}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.neon.pink} />
      ) : (
        <Text
          className={`font-medium ${textVariantClass} ${textClassName}`}
        >
          {children}
        </Text>
      )}
    </StyledTouchableOpacity>
  );
}; 