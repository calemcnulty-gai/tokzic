import React from 'react';
import { 
  TouchableOpacity, 
  TouchableOpacityProps,
  StyleSheet,
  View,
} from 'react-native';
import { styled } from 'nativewind';
import theme from '../theme';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledView = styled(View);

interface IconButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  className?: string;
}

const variantClasses = {
  primary: 'bg-background-glass border border-neon-green/30',
  secondary: 'bg-background-glass/50 border border-white/10',
  ghost: 'border border-white/5',
  neon: 'bg-neon-green/10 border border-neon-green',
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
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

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  className = '',
  style,
  ...props
}) => {
  const baseClasses = 'items-center justify-center rounded-lg backdrop-blur-md';
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const iconSizeClass = iconSizeClasses[size];
  const disabledClass = disabled ? 'opacity-50' : '';

  const buttonStyle = [
    variant === 'neon' ? styles.neonGlow : styles.glass,
    style,
  ];

  return (
    <StyledTouchableOpacity
      className={`${baseClasses} ${variantClass} ${sizeClass} ${disabledClass} ${className}`}
      style={buttonStyle}
      disabled={disabled}
      {...props}
    >
      <StyledView className={iconSizeClass}>
        {icon}
      </StyledView>
    </StyledTouchableOpacity>
  );
}; 