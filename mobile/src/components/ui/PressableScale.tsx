import React from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_IN = { damping: 18, stiffness: 520, mass: 0.32 };
const SPRING_OUT = { damping: 14, stiffness: 420, mass: 0.32 };

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared press feedback: a ~0.97 scale + opacity dip with a fast spring-back.
 */
export function PressableScale({
  children,
  className,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      className={className}
      style={[animatedStyle, style]}
      {...props}
      onPressIn={(event) => {
        if (!disabled) {
          scale.value = withSpring(0.97, SPRING_IN);
          opacity.value = withTiming(0.85, { duration: 70 });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, SPRING_OUT);
        opacity.value = withTiming(1, { duration: 110 });
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
