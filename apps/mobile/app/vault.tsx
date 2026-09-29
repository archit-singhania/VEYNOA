import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getRandomBytes, randomUUID } from "expo-crypto";
import { workspace } from "../src/database/workspace";
import {
  deriveVaultKey,
  openVault,
  sealVault,
  vaultSalt,
} from "../src/services/vaultCrypto";
import { authenticate } from "../src/components/AppLock";
import { useApp } from "../src/stores/app";
import { Page, Card, Field, Label, Button, Row } from "../src/components/ui";
type Entry = { id: string; title: string; body: string };
export default function Vault() {
  const [exists, setExists] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [id, setId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keyEpoch, setKeyEpoch] = useState(0);
  const key = useRef<Uint8Array | null>(null);
  const salt = useRef<Uint8Array | null>(null);
  const epoch = useRef(0);
  const original = useRef<string | undefined>(undefined);
  const working = useRef(false);
  const appLock = useApp((s) => s.settings.appLock);
  const lock = useCallback(() => {
    epoch.current++;
    key.current?.fill(0);
    key.current = null;
    original.current = undefined;
    salt.current = null;
    setEntries(null);
    setBody("");
    setTitle("");
    setPassword("");
    setConfirm("");
    setId(undefined);
    setKeyEpoch((x) => x + 1);
  }, []);
  useFocusEffect(useCallback(() => () => lock(), [lock]));
  useEffect(() => {
    void workspace
      .vault()
      .then((r) => setExists(r.some((x) => x.id === "private-space")))
      .catch((e) => setError(String(e)));
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") lock();
    });
    return () => sub.remove();
  }, [lock, keyEpoch]);
  const run = async (f: () => Promise<void>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      await f();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  return (
    <Page
      title="Private space"
      eyebrow="JUST FOR YOU"
      action={
        <Button onPress={() => router.replace("/workspace")}>Workspace</Button>
      }
    >
      <Card>
        <Label>Encrypted notes</Label>
        <Label muted>
          These entries stay outside your ordinary notebook, search, exports and
          AI. They use a separate passphrase. There is no passphrase reset or
          recovery; keep it somewhere safe. Leaving this screen locks the vault
          and discards unsaved edits.
        </Label>
        {!!error && <Label>{error}</Label>}
        {entries === null ? (
          <>
            <Label>
              {exists === null
                ? "Checking vault…"
                : exists
                  ? "Unlock your private space"
                  : "Create your private space"}
            </Label>
            <Field
              accessibilityLabel="Vault passphrase"
              secureTextEntry
              autoComplete="off"
              placeholder="Passphrase (at least 12 characters to create)"
              value={password}
              onChangeText={setPassword}
            />
            {exists === false && (
              <Field
                accessibilityLabel="Confirm vault passphrase"
                secureTextEntry
                autoComplete="off"
                placeholder="Confirm passphrase"
                value={confirm}
                onChangeText={setConfirm}
              />
            )}
            <Button
              primary
              disabled={busy || exists === null || !password}
              onPress={() =>
                void run(async () => {
                  const ticket = epoch.current;
                  const rows = await workspace.vault();
                  const row = rows.find((x) => x.id === "private-space");
                  if (!row && (password.length < 12 || password !== confirm))
                    throw new Error(
                      "Use matching passphrases of at least 12 characters.",
                    );
                  const s = row ? vaultSalt(row.payload) : getRandomBytes(16);
                  const k = await deriveVaultKey(password, s);
                  if (ticket !== epoch.current) {
                    k.fill(0);
                    return;
                  }
                  let items: Entry[];
                  try {
                    items = row ? JSON.parse(openVault(row.payload, k)) : [];
                  } catch {
                    k.fill(0);
                    throw new Error(
                      "Wrong passphrase or damaged vault. Nothing was changed.",
                    );
                  }
                  const payload =
                    row?.payload ||
                    sealVault(JSON.stringify(items), k, s, getRandomBytes(12));
                  if (!row) await workspace.seal("private-space", payload);
                  if (ticket !== epoch.current) {
                    k.fill(0);
                    return;
                  }
                  key.current = k;
                  original.current = payload;
                  salt.current = s;
                  setEntries(items);
                  setExists(true);
                  setPassword("");
                  setConfirm("");
                })
              }
            >
              {busy
                ? "Working…"
                : exists
                  ? "Unlock vault"
                  : "Create encrypted vault"}
            </Button>
          </>
        ) : (
          <>
            <Button onPress={lock}>Lock vault</Button>
            {entries.map((e) => (
              <Button
                key={e.id}
                onPress={() => {
                  setId(e.id);
                  setTitle(e.title);
                  setBody(e.body);
                }}
              >
                {e.title || "Private thought"}
              </Button>
            ))}
            <Field
              accessibilityLabel="Private title"
              value={title}
              onChangeText={setTitle}
              placeholder="Private title"
            />
            <Field
              accessibilityLabel="Private content"
              value={body}
              onChangeText={setBody}
              placeholder="Write privately…"
              multiline
              style={{ minHeight: 220 }}
            />
            <Row>
              <Button
                disabled={busy || !body.trim()}
                onPress={() =>
                  void run(async () => {
                    if (!key.current || !salt.current)
                      throw new Error("Unlock your vault again.");
                    const ticket = epoch.current;
                    const entry = { id: id || randomUUID(), title, body };
                    const next = [
                      ...entries.filter((e) => e.id !== entry.id),
                      entry,
                    ];
                    const payload = sealVault(
                      JSON.stringify(next),
                      key.current,
                      salt.current,
                      getRandomBytes(12),
                    );
                    await workspace.seal(
                      "private-space",
                      payload,
                      original.current,
                    );
                    if (ticket === epoch.current) {
                      original.current = payload;
                      setEntries(next);
                      setId(undefined);
                      setTitle("");
                      setBody("");
                    }
                  })
                }
              >
                Save encrypted note
              </Button>
              <Button
                onPress={() => {
                  setId(undefined);
                  setTitle("");
                  setBody("");
                }}
              >
                New private note
              </Button>
            </Row>
          </>
        )}
      </Card>
      <Card>
        <Label>Device app lock</Label>
        <Label muted>
          The app lock protects access to the interface. Ordinary notes are not
          encrypted by this setting. Your device passcode can be used as a
          fallback.
        </Label>
        {Platform.OS === "web" ? (
          <Label>Biometric app lock requires Android or iOS.</Label>
        ) : (
          <Button
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await authenticate();
                await useApp.getState().setSettings({ appLock: !appLock });
              })
            }
          >
            {appLock ? "Disable device app lock" : "Enable device app lock"}
          </Button>
        )}
      </Card>
    </Page>
  );
}
