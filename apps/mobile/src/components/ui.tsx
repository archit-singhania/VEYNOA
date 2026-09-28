import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../stores/app";
export function useTheme() {
  const preference = useApp((s) => s.settings.theme);
  const system = useColorScheme();
  const dark =
    preference === "dark" || (preference === "system" && system === "dark");
  return {
    dark,
    bg: dark ? "#0B0B0C" : "#FAFAF8",
    card: dark ? "#18191D" : "#FFFFFF",
    text: dark ? "#F4F4F4" : "#171921",
    muted: dark ? "#A3A5AD" : "#686C79",
    line: dark ? "#303238" : "#E7E8EB",
    accent: dark ? "#A3B5FF" : "#4667DA",
    soft: dark ? "#202840" : "#EEF2FF",
  };
}
export function Label({
  children,
  muted = false,
  size = 15,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  size?: number;
  style?: object;
}) {
  const t = useTheme();
  return (
    <Text
      style={{
        color: muted ? t.muted : t.text,
        fontSize: size,
        lineHeight: size * 1.5,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}
export function Button({
  children,
  onPress,
  primary = false,
  disabled = false,
  onLongPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  onLongPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 14,
        backgroundColor: primary ? t.accent : t.soft,
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: primary ? (t.dark ? "#111" : "white") : t.accent,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Field(props: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.muted}
      {...props}
      style={[
        {
          color: t.text,
          backgroundColor: t.card,
          borderColor: t.line,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          fontSize: 16,
          minHeight: 48,
        },
        props.style,
      ]}
    />
  );
}
export function Row({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
      }}
    >
      {children}
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.line,
        borderRadius: 20,
        padding: 20,
        gap: 12,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
export function Page({
  title,
  subtitle,
  children,
  scroll = true,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  action?: React.ReactNode;
}) {
  const t = useTheme();
  const content = (
    <View
      style={{
        width: "100%",
        maxWidth: 980,
        alignSelf: "center",
        padding: 24,
        gap: 22,
        flex: scroll ? undefined : 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Label
            muted
            size={11}
            style={{ letterSpacing: 3, fontWeight: "700" }}
          >
            VEYNOA
          </Label>
          <Label size={34} style={{ fontWeight: "700", letterSpacing: -1 }}>
            {title}
          </Label>
          {subtitle && <Label muted>{subtitle}</Label>}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: t.bg }}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 35 }}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
export function Orb({
  listening = false,
  level = 0,
}: {
  listening?: boolean;
  level?: number;
}) {
  const value = useRef(new Animated.Value(1)).current;
  const [reduced, setReduced] = useState(true);
  const t = useTheme();
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1.09,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [reduced, value]);
  return (
    <View
      accessibilityLabel={listening ? "Listening" : "Veynoa companion"}
      style={{ alignItems: "center", justifyContent: "center", height: 130 }}
    >
      <Animated.View
        style={{
          height: 90,
          width: 90,
          borderRadius: 45,
          backgroundColor: t.soft,
          alignItems: "center",
          justifyContent: "center",
          transform: [
            { scale: listening ? 1 + Math.max(0, level) * 0.18 : value },
          ],
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: t.accent,
            borderWidth: 9,
            borderColor: t.dark ? "#6C83D8" : "#B9C7F6",
          }}
        />
      </Animated.View>
    </View>
  );
}
