import { Text, View, Pressable } from "react-native";
import { Label, useTheme } from "./ui";
export function FormattedText({
  body,
  onChange,
}: {
  body: string;
  onChange?: (body: string) => void;
}) {
  const t = useTheme();
  let code = false;
  return (
    <View style={{ gap: 10 }}>
      {body.split("\n").map((line, i) => {
        if (line.startsWith("```")) {
          code = !code;
          return null;
        }
        if (code)
          return (
            <Label
              key={i}
              style={{
                fontFamily: "monospace",
                backgroundColor: t.soft,
                padding: 8,
              }}
            >
              {line || " "}
            </Label>
          );
        const heading = line.match(/^(#{1,3})\s+(.*)/);
        const quote = line.startsWith("> ");
        const check = line.match(/^- \[([ xX])\] (.*)/);
        if (check && onChange)
          return (
            <Pressable
              key={i}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: check[1] !== " " }}
              accessibilityLabel={check[2]}
              onPress={() => {
                const lines = body.split("\n");
                lines[i] = `- [${check[1] === " " ? "x" : " "}] ${check[2]}`;
                onChange(lines.join("\n"));
              }}
              style={{ paddingVertical: 6 }}
            >
              <Label>
                {check[1] === " " ? "☐" : "☑"} {check[2]}
              </Label>
            </Pressable>
          );
        const text = heading
          ? heading[2]
          : quote
            ? line.slice(2)
            : check
              ? `${check[1] === " " ? "☐" : "☑"} ${check[2]}`
              : line;
        return (
          <Label
            key={i}
            size={heading ? 28 - heading[1].length * 3 : 16}
            style={{
              lineHeight: 28,
              fontWeight: heading ? "600" : "400",
              ...(quote
                ? {
                    borderLeftWidth: 3,
                    borderLeftColor: t.accent,
                    paddingLeft: 14,
                    color: t.muted,
                  }
                : {}),
            }}
          >
            {text.split(/(\*\*[^*]+\*\*|==[^=]+==)/g).map((part, j) => (
              <Text
                key={j}
                style={
                  part.startsWith("**")
                    ? { fontWeight: "700" }
                    : part.startsWith("==")
                      ? { backgroundColor: t.soft }
                      : {}
                }
              >
                {part.startsWith("**") || part.startsWith("==")
                  ? part.slice(2, -2)
                  : part}
              </Text>
            ))}
          </Label>
        );
      })}
    </View>
  );
}
