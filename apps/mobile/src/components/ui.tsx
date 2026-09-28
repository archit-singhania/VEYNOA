import React, { useEffect, useId, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  useWindowDimensions,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
  Path,
  G,
} from "react-native-svg";
import { useApp } from "../stores/app";
import { palettes, serif } from "../theme/tokens";
import { Icon, type IconName } from "./Icon";
import { Reveal, SpringPressable, useMotion } from "./motion";
import { useIsFocused } from "@react-navigation/native";
export { serif };
export function useTheme() {
  const preference = useApp((s) => s.settings.theme);
  const palette = useApp((s) => s.settings.palette) || "grove";
  const system = useColorScheme();
  const dark =
    preference === "dark" || (preference === "system" && system === "dark");
  return {
    dark,
    heroAccent: (palettes[palette] || palettes.grove).dark.accent,
    heroMuted: (palettes[palette] || palettes.grove).dark.muted,
    heroSoft: (palettes[palette] || palettes.grove).dark.soft,
    ...(palettes[palette] || palettes.grove)[dark ? "dark" : "light"],
  };
}
export function Label({
  children,
  muted = false,
  size = 15,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  muted?: boolean;
  size?: number;
  style?: TextStyle;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={{
        color: muted ? t.muted : t.text,
        fontSize: size,
        lineHeight: size * 1.55,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}
export function Eyebrow({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  const t = useTheme();
  return (
    <Label
      size={10}
      style={{
        color: color || t.muted,
        letterSpacing: 2.2,
        fontWeight: "600",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Label>
  );
}
export function Button({
  children,
  onPress,
  primary = false,
  disabled = false,
  onLongPress,
  icon,
  quiet = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  onLongPress?: () => void;
  icon?: IconName;
  quiet?: boolean;
}) {
  const t = useTheme();
  const color = primary ? (t.dark ? t.bg : "#FFFEF8") : t.accent;
  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed, hovered }: any) => ({
        minHeight: 46,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 13,
        backgroundColor: primary
          ? t.accent
          : quiet
            ? "transparent"
            : hovered
              ? t.soft
              : t.card,
        borderWidth: primary || quiet ? 0 : 1,
        borderColor: t.line,
        opacity: disabled ? 0.44 : pressed ? 0.72 : 1,
        flexDirection: "row",
        gap: 9,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      {icon && <Icon name={icon} color={color} size={17} />}
      <Text
        style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.1, color }}
      >
        {children}
      </Text>
    </SpringPressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  selected = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? t.soft : "transparent",
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name={name} color={selected ? t.accent : t.muted} />
    </Pressable>
  );
}
export function Field(props: TextInputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={t.muted}
      selectionColor={t.accent}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        {
          color: t.text,
          backgroundColor: t.card,
          borderColor: focused ? t.accent : t.line,
          borderWidth: 1,
          borderRadius: 14,
          padding: 16,
          fontSize: 15,
          minHeight: 50,
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
        gap: 10,
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
        padding: 24,
        gap: 14,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
      <Svg
        width={30}
        height={34}
        viewBox="0 0 30 34"
        fill="none"
        stroke={t.accent}
        strokeWidth={1.4}
      >
        <Ellipse cx={15} cy={17} rx={7} ry={15} rotation={-28} origin="15,17" />
        <Ellipse cx={15} cy={17} rx={7} ry={15} rotation={28} origin="15,17" />
        <Path d="M15 3v28" />
      </Svg>
      {!compact && (
        <View>
          <Label size={19} style={{ letterSpacing: 3.5, fontWeight: "500" }}>
            VEYNOA
          </Label>
          <Label muted size={8} style={{ letterSpacing: 2.1 }}>
            SPEAK. THINK. REMEMBER.
          </Label>
        </View>
      )}
    </View>
  );
}
export function Page({
  title,
  subtitle,
  children,
  scroll = true,
  action,
  eyebrow = "YOUR PERSONAL SPACE",
  compact = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  action?: React.ReactNode;
  eyebrow?: string;
  compact?: boolean;
}) {
  const t = useTheme();
  const focused = useIsFocused();
  const { width } = useWindowDimensions();
  const small = width < 650;
  const content = (
    <View
      style={{
        width: "100%",
        maxWidth: 1240,
        alignSelf: "center",
        paddingHorizontal: small ? 22 : 44,
        paddingTop: small ? 25 : 36,
        gap: 26,
        flex: scroll ? undefined : 1,
      }}
    >
      {compact ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ gap: 5 }}>
            <Eyebrow>{eyebrow}</Eyebrow>
            {subtitle && (
              <Label muted size={11}>
                {subtitle}
              </Label>
            )}
          </View>
          {action}
        </View>
      ) : small ? (
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Eyebrow>{eyebrow}</Eyebrow>
            </View>
            {action}
          </View>
          <Label
            size={34}
            style={{ fontFamily: serif, lineHeight: 41, letterSpacing: -1 }}
          >
            {title}
          </Label>
          {subtitle && (
            <Label muted size={12}>
              {subtitle}
            </Label>
          )}
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 9 }}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <Label
              size={small ? 34 : 42}
              style={{
                fontFamily: serif,
                lineHeight: small ? 42 : 52,
                letterSpacing: -1.2,
              }}
            >
              {title}
            </Label>
            {subtitle && (
              <Label muted size={13}>
                {subtitle}
              </Label>
            )}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: t.bg }}
    >
      <Reveal active={focused} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingBottom: 44 }}
            >
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </KeyboardAvoidingView>
      </Reveal>
    </SafeAreaView>
  );
}
export function Orb({
  listening = false,
  level = 0,
  size = 150,
  decorative = false,
}: {
  listening?: boolean;
  level?: number;
  size?: number;
  decorative?: boolean;
}) {
  const value = useRef(new Animated.Value(1)).current;
  const reduced = !useMotion();
  const t = useTheme();
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1.055,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [reduced, value]);
  return (
    <View
      accessible={!decorative}
      accessibilityLabel={listening ? "Listening" : "Veynoa companion"}
      style={{
        alignItems: "center",
        justifyContent: "center",
        height: size + 20,
      }}
    >
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [
            {
              scale:
                listening && !reduced ? 1 + Math.max(0, level) * 0.1 : value,
            },
          ],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Defs>
            <RadialGradient id={id} cx="34%" cy="25%" r="76%">
              <Stop offset="0" stopColor="#EEF0CD" />
              <Stop offset=".32" stopColor={t.heroAccent} />
              <Stop offset=".65" stopColor={t.dark ? t.heroSoft : t.accent} />
              <Stop offset="1" stopColor={t.hero} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={120}
            cy={120}
            r={113}
            stroke="#C1C9A4"
            strokeOpacity={0.16}
            fill="none"
          />
          <Ellipse
            cx={120}
            cy={120}
            rx={117}
            ry={73}
            rotation={-38}
            origin="120,120"
            stroke="#D3C297"
            strokeOpacity={0.5}
            strokeWidth={0.8}
            fill="none"
          />
          <Circle cx={120} cy={120} r={80} fill={`url(#${id})`} />
          <G stroke="#E1E2B6" fill="none" strokeWidth={0.6} opacity={0.26}>
            {Array.from({ length: 10 }, (_, i) => (
              <Ellipse
                key={i}
                cx={120}
                cy={120}
                rx={14 + i * 7}
                ry={80}
                rotation={-23}
                origin="120,120"
              />
            ))}
          </G>
          <Ellipse
            cx={120}
            cy={120}
            rx={118}
            ry={42}
            rotation={32}
            origin="120,120"
            stroke="#D9C49B"
            strokeWidth={0.8}
            fill="none"
          />
          <Circle cx={32} cy={165} r={3} fill="#D9C49B" />
          <Circle cx={207} cy={52} r={2} fill="#C0D5B8" />
        </Svg>
      </Animated.View>
    </View>
  );
}
