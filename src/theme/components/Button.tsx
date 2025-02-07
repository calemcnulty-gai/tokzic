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
  variant?: 'primary' | 'secondary' | 'ghost' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

const variantClasses = {
  primary: 'bg-background-glass border border-neon-green/30',
  secondary: 'bg-background-glass/50 border border-white/10',
  ghost: 'border border-white/5',
  neon: 'bg-neon-green/10 border border-neon-green',
};

const sizeClasses = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

const textVariantClasses = {
  primary: 'text-neon-green',
  secondary: 'text-white',
  ghost: 'text-white/80',
  neon: 'text-neon-green font-bold',
};

const styles = StyleSheet.create({
  glass: {
    shadowColor: theme.colors.neon.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  neonGlow: {
    shadowColor: theme.colors.neon.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});

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
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const textVariantClass = textVariantClasses[variant];
  const disabledClass = disabled || loading ? 'opacity-50' : '';

  const buttonStyle = [
    variant === 'neon' ? styles.neonGlow : styles.glass,
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
        <ActivityIndicator color={theme.colors.neon.green} />
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