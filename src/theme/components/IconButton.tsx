import React from 'react';
import { 
  TouchableOpacity, 
  TouchableOpacityProps,
  StyleSheet,
  View,
} from 'react-native';
import { styled } from 'nativewind';
import { useTheme } from '../ThemeProvider';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledView = styled(View);

interface IconButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  className?: string;
}

const variants = {
  primary: 'bg-background-glass border border-neon-pink/30',
  secondary: 'bg-background-glass border border-white/10',
  neon: 'bg-neon-pink/10 border border-neon-pink',
  ghost: 'border border-white/5',
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

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  className = '',
  style,
  ...props
}) => {
  const theme = useTheme();
  const baseClasses = 'items-center justify-center rounded-lg backdrop-blur-md';
  const variantClass = variants[variant];
  const sizeClass = sizeClasses[size];
  const iconSizeClass = iconSizeClasses[size];
  const disabledClass = disabled ? 'opacity-50' : '';

  const buttonStyle = [
    {
      shadowColor: theme.colors.neon.pink,
      shadowOffset: { width: 0, height: variant === 'neon' ? 4 : 2 },
      shadowOpacity: variant === 'neon' ? 0.15 : 0.1,
      shadowRadius: variant === 'neon' ? 8 : 4,
      elevation: variant === 'neon' ? 4 : 2,
    },
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