import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerThunk } from "@/store/authSlice";

export default function RegisterScreen() {
  const dispatch = useAppDispatch();
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = (roleParam as "PLAYER" | "PARENT" | "COACH" | undefined) ?? "PLAYER";
  const { status, error } = useAppSelector((state) => state.auth);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dateOfBirth = useMemo(() => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
      return null;
    }
    return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
  }, [day, month, year]);

  const isValid =
    displayName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 8 &&
    password === confirmPassword &&
    dateOfBirth !== null &&
    agreedToTerms;

  const handleSubmit = async () => {
    setFormError(null);
    if (password !== confirmPassword) {
      setFormError("Passwords don't match");
      return;
    }
    if (!dateOfBirth) {
      setFormError("Enter a valid date of birth");
      return;
    }

    const result = await dispatch(
      registerThunk({
        email,
        password,
        displayName,
        role,
        dateOfBirth,
        agreedToTerms: true,
      })
    );

    if (registerThunk.fulfilled.match(result)) {
      router.replace("/");
    }
  };

  return (
    <KeyboardAwareScreen>
      <Card>
          <CardHeader>Create Your Account</CardHeader>
          <CardContent>
            <View className="gap-4">
              <Input label="Display name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              <Input
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />

              <View>
                <Text className="mb-1.5 text-sm font-medium text-text-primary">Date of birth</Text>
                <Text className="mb-2 text-xs text-text-secondary">
                  Used to apply the right privacy and consent rules for your age -- see Data & Privacy
                  later in setup.
                </Text>
                <View className="flex-row gap-3">
                  <Input className="flex-1" placeholder="DD" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} />
                  <Input className="flex-1" placeholder="MM" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} />
                  <Input className="flex-[1.3]" placeholder="YYYY" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
                </View>
              </View>

              <Checkbox
                checked={agreedToTerms}
                onToggle={setAgreedToTerms}
                label="I agree to the Terms of Service and Privacy Policy."
              />

              {(formError ?? error) ? (
                <Text className="text-sm text-danger">{formError ?? error}</Text>
              ) : null}

              <Button onPress={handleSubmit} disabled={!isValid} isLoading={status === "signingIn"}>
                Create account
              </Button>
            </View>
          </CardContent>
      </Card>
    </KeyboardAwareScreen>
  );
}
