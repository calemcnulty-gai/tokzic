import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TipSelector');
const TIP_AMOUNTS = [1, 2, 5, 10, 20, 50, 100];
const DEFAULT_TIP = 5;

interface TipSelectorProps {
  isVisible: boolean;
  onSendTip: (amount: number) => void;
  onClose: () => void;
}

export function TipSelector({ isVisible, onSendTip, onClose }: TipSelectorProps) {
  const theme = useTheme();
  const [selectedAmount, setSelectedAmount] = useState(DEFAULT_TIP);
  const [animation] = useState(new Animated.Value(0));

  React.useEffect(() => {
    try {
      Animated.spring(animation, {
        toValue: isVisible ? 1 : 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start((result) => {
        if (!result.finished) {
          logger.warn('Animation interrupted', {
            isVisible
          });
        }
      });
    } catch (error) {
      logger.error('Animation error in TipSelector', {
        isVisible,
        error
      });
    }
  }, [isVisible, animation]);

  const handleSendTip = () => {
    try {
      onSendTip(selectedAmount);
      onClose();
    } catch (error) {
      logger.error('Error sending tip', {
        amount: selectedAmount,
        error
      });
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateX: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-200, 0],
              }),
            },
          ],
          opacity: animation,
        },
      ]}
    >
      <View style={[styles.content, theme.glass.default]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.amountsContainer}
        >
          {TIP_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.amountButton,
                amount === selectedAmount && styles.selectedAmount,
                {
                  backgroundColor:
                    amount === selectedAmount
                      ? theme.colors.neon.pink
                      : theme.colors.background.secondary,
                },
              ]}
              onPress={() => {
                try {
                  setSelectedAmount(amount);
                } catch (error) {
                  logger.error('Error setting tip amount', {
                    amount,
                    error
                  });
                }
              }}
            >
              <Text
                style={[
                  styles.amountText,
                  {
                    color:
                      amount === selectedAmount
                        ? theme.colors.text.inverse
                        : theme.colors.text.primary,
                  },
                ]}
              >
                ${amount}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: theme.colors.neon.pink }]}
          onPress={handleSendTip}
        >
          <Icon name="cash-outline" size={24} color={theme.colors.text.inverse} />
          <Text style={[styles.sendText, { color: theme.colors.text.inverse }]}>
            Send ${selectedAmount}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 200,
    justifyContent: 'center',
  },
  content: {
    padding: 12,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    gap: 16,
  },
  amountsContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  amountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  selectedAmount: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 24,
    gap: 8,
  },
  sendText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 