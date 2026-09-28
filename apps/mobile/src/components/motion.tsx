import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { useApp } from "../stores/app";
const MotionContext = createContext(false);
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(true);
  const enabled = useApp((s) => s.settings.motionEffects !== false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return (
    <MotionContext.Provider value={enabled && !reduced}>
      {children}
    </MotionContext.Provider>
  );
}
export const useMotion = () => useContext(MotionContext);
export function Reveal({
  children,
  active = true,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  active?: boolean;
  style?: ViewStyle;
  delay?: number;
}) {
  const enabled = useMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!enabled || !active) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [enabled, active, progress, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
export function SpringPressable({
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps) {
  const enabled = useMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) => {
    if (!enabled) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: to,
      stiffness: 350,
      damping: 23,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        style={style}
        onPressIn={(e) => {
          animate(0.965);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          animate(1);
          onPressOut?.(e);
        }}
      />
    </Animated.View>
  );
}
