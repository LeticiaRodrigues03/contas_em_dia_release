import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { Button, Logo } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const HERO = {
  light: "https://images.unsplash.com/photo-1617957718645-7680362d6312?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
  dark: "https://images.unsplash.com/photo-1629197520635-16570fbd0bb3?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
};

export default function Login() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    setError("");
    if (mode === "register" && !name.trim()) return setError("Informe seu nome");
    if (!email.trim() || !password) return setError("Preencha e-mail e senha");
    if (mode === "register" && password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <KeyboardAwareScrollView
      style={styles.screen}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.xl }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
      <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
        <Image source={{ uri: HERO[scheme] }} style={styles.heroImg} contentFit="cover" />
        <LinearGradient colors={["transparent", colors.scrim]} style={styles.heroImg} />
        <View style={styles.heroContent}>
          <Logo size={56} />
          <Text style={styles.brand}>Contas em Dia</Text>
          <Text style={styles.tagline}>Suas contas, no dia certo</Text>
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
        <Text style={styles.title}>{isRegister ? "Criar sua conta" : "Bem-vindo de volta"}</Text>
        <Text style={styles.subtitle}>
          {isRegister ? "Sincronize suas contas em todos os seus aparelhos." : "Entre para ver seus vencimentos."}
        </Text>

        {isRegister ? (
          <View style={styles.field}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              testID="auth-name-input" value={name} onChangeText={setName} placeholder="Seu nome"
              placeholderTextColor={colors.muted} style={styles.input} autoComplete="name"
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            testID="auth-email-input" value={email} onChangeText={setEmail} placeholder="voce@email.com"
            placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none"
            keyboardType="email-address" autoComplete="email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <View>
            <TextInput
              testID="auth-password-input" value={password} onChangeText={setPassword}
              placeholder={isRegister ? "Mínimo 6 caracteres" : "Sua senha"} placeholderTextColor={colors.muted}
              style={[styles.input, { paddingRight: 52 }]} secureTextEntry={!showPass} autoCapitalize="none"
              onSubmitEditing={submit} returnKeyType="go"
            />
            <Pressable testID="auth-toggle-password" style={styles.eye} onPress={() => setShowPass((v) => !v)} hitSlop={8}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {error ? <Text testID="auth-error" style={styles.error}>{error}</Text> : null}

        <Button testID="auth-submit-button" label={isRegister ? "Criar conta" : "Entrar"} onPress={submit} loading={busy} />

        <Pressable
          testID="auth-switch-mode"
          style={styles.switch}
          onPress={() => {
            setError("");
            setMode(isRegister ? "login" : "register");
          }}
        >
          <Text style={styles.switchText}>
            {isRegister ? "Já tem conta? " : "Ainda não tem conta? "}
            <Text style={styles.switchLink}>{isRegister ? "Entrar" : "Criar conta"}</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  hero: { height: 280, justifyContent: "flex-end", overflow: "hidden" },
  heroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { padding: spacing.xl, gap: spacing.xs },
  brand: { fontFamily: fonts.display, fontSize: 32, color: "#FFFFFF", marginTop: spacing.md },
  tagline: { fontFamily: fonts.medium, fontSize: 15, color: "rgba(255,255,255,0.85)" },
  form: {
    marginTop: -spacing.xl, backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.xl, gap: spacing.lg,
  },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginTop: -spacing.sm },
  field: { gap: spacing.xs },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: c.onSurfaceTertiary },
  input: {
    minHeight: 52, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: spacing.lg, fontFamily: fonts.medium, fontSize: 16, color: c.onSurface,
  },
  eye: { position: "absolute", right: 0, top: 0, bottom: 0, width: 52, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.semibold, fontSize: 14, color: c.error },
  switch: { alignItems: "center", paddingVertical: spacing.sm, minHeight: 44, justifyContent: "center" },
  switchText: { fontFamily: fonts.medium, fontSize: 14, color: c.muted },
  switchLink: { fontFamily: fonts.bold, color: c.brandPrimary },
}));
