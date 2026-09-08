import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginThunk } from "@/store/authSlice";
import { loginSchema, type LoginInput } from "@/api/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((state) => state.auth);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    const result = await dispatch(loginThunk(values));
    if (loginThunk.fulfilled.match(result)) {
      router.replace("/");
    }
  };

  return (
    <SafeAreaView className="flex-1 justify-center bg-surface px-6">
      <Card>
        <CardHeader>Sign in to Koda</CardHeader>
        <CardContent>
          <View className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  secureTextEntry
                  autoComplete="password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />
            {error ? <Text className="text-sm text-danger">{error}</Text> : null}
            <Button onPress={handleSubmit(onSubmit)} isLoading={status === "signingIn"}>
              Sign in
            </Button>
            <Link href="/(auth)/role" className="text-center text-sm text-text-secondary">
              Don't have an account? <Text className="font-medium text-primary">Create one</Text>
            </Link>
          </View>
        </CardContent>
      </Card>
    </SafeAreaView>
  );
}
