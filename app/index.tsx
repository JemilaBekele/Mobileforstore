// app/(auth)/login.tsx
import React, { useState, useRef, useEffect } from "react";
import { Image, KeyboardAvoidingView, Platform } from "react-native";
import { Formik, FormikProps } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/(redux)/store";
import { login, restoreSession } from "@/(redux)/authSlice";
import {
  Text,
  XStack,
  YStack,
  Button,
  Input,
  ScrollView,
  Spinner,
} from 'tamagui';
import { Ionicons } from '@expo/vector-icons';

const loginImage = require('@/assets/images/loginn.jpg');

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const formikRef = useRef<FormikProps<{ email: string; password: string }>>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  // true while checking for a saved login from a previous launch
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    dispatch(restoreSession())
      .unwrap()
      .then(() => {
        if (active) router.replace("/(tabs)/home" as any);
      })
      .catch(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, [dispatch, router]);

  const handleLogin = async (values: { email: string; password: string }) => {
    setMessage("");
    setIsLoading(true);
    setMessageType("pending");

    try {
      await dispatch(login(values)).unwrap();
      setMessage("Login successful!");
      setMessageType("success");

      setTimeout(() => {
        router.replace("/(tabs)/home" as any);
      }, 1000);

    } catch (error: any) {
      const errorText = typeof error === "string" ? error : error?.message;
      setMessage(errorText || "Invalid email or password. Please try again.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setMessage("Forgot password feature coming soon!");
    setMessageType("info");
  };

  const getMessageStyles = () => {
    switch (messageType) {
      case "error":
        return { bg: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B", icon: "alert-circle-outline" as const };
      case "success":
        return { bg: "#F0FDF4", borderColor: "#BBF7D0", color: "#166534", icon: "checkmark-circle-outline" as const };
      case "info":
        return { bg: "#FFF7ED", borderColor: "#FED7AA", color: "#C2410C", icon: "information-circle-outline" as const };
      default:
        return { bg: "#F9FAFB", borderColor: "#E5E7EB", color: "#374151", icon: "information-circle-outline" as const };
    }
  };

  const messageStyles = getMessageStyles();

  const fieldBorder = (field: "email" | "password", hasError: boolean) =>
    hasError ? "#DC2626" : focusedField === field ? "#FF6B00" : "#E5E7EB";

  if (checkingSession) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#FFFFFF">
        <Spinner size="large" color="#FF6B00" />
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        backgroundColor="#FFFFFF"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center"
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <YStack flex={1} justifyContent="center" padding={24} gap={24} width="100%" maxWidth={440} alignSelf="center">
          {/* Header */}
          <YStack alignItems="center" gap={12}>
            <Image
              source={loginImage}
              style={{
                width: 140,
                height: 140,
                resizeMode: "contain",
              }}
            />
            <YStack alignItems="center" gap={4}>
              <Text fontSize={26} fontWeight="800" color="#111827" textAlign="center">
                Stock Management
              </Text>
              <Text fontSize={14} color="#6B7280" textAlign="center">
                Sign in to your staff account
              </Text>
            </YStack>
          </YStack>

          {/* Login Card */}
          <YStack
            backgroundColor="#FFFFFF"
            borderWidth={1}
            borderColor="#E5E7EB"
            borderRadius={16}
            padding={20}
            gap={16}
            shadowColor="#000"
            shadowOpacity={0.05}
            shadowRadius={8}
            shadowOffset={{ width: 0, height: 2 }}
          >
            <Text fontSize={20} fontWeight="700" color="#111827">
              Login
            </Text>

            {/* Message Display */}
            {message ? (
              <XStack
                padding={12}
                borderRadius={10}
                gap={8}
                alignItems="center"
                backgroundColor={messageStyles.bg}
                borderColor={messageStyles.borderColor}
                borderWidth={1}
              >
                <Ionicons name={messageStyles.icon} size={18} color={messageStyles.color} />
                <Text flex={1} fontSize={14} color={messageStyles.color}>
                  {message}
                </Text>
              </XStack>
            ) : null}

            <Formik
              innerRef={formikRef}
              initialValues={{ email: "", password: "" }}
              validationSchema={LoginSchema}
              onSubmit={handleLogin}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                isValid,
                dirty,
              }) => (
                <YStack gap={14}>
                  {/* Email Input */}
                  <YStack gap={6}>
                    <Text fontSize={14} fontWeight="600" color="#374151">
                      Email
                    </Text>
                    <XStack
                      alignItems="center"
                      backgroundColor="#FFFFFF"
                      borderWidth={1}
                      borderColor={fieldBorder("email", !!(errors.email && touched.email))}
                      borderRadius={12}
                      paddingLeft={12}
                    >
                      <Ionicons name="mail-outline" size={18} color="#6B7280" />
                      <Input
                        flex={1}
                        placeholder="Enter your email"
                        value={values.email}
                        onChangeText={handleChange("email")}
                        onFocus={() => setFocusedField("email")}
                        onBlur={(e) => {
                          setFocusedField(null);
                          handleBlur("email")(e);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        backgroundColor="transparent"
                        borderWidth={0}
                        focusStyle={{ borderWidth: 0 }}
                        color="#111827"
                        fontSize={15}
                        paddingHorizontal={10}
                        size="$4"
                        placeholderTextColor="#9CA3AF"
                      />
                    </XStack>
                    {errors.email && touched.email ? (
                      <Text fontSize={12} color="#DC2626">
                        {errors.email}
                      </Text>
                    ) : null}
                  </YStack>

                  {/* Password Input */}
                  <YStack gap={6}>
                    <Text fontSize={14} fontWeight="600" color="#374151">
                      Password
                    </Text>
                    <XStack
                      alignItems="center"
                      backgroundColor="#FFFFFF"
                      borderWidth={1}
                      borderColor={fieldBorder("password", !!(errors.password && touched.password))}
                      borderRadius={12}
                      paddingLeft={12}
                    >
                      <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                      <Input
                        flex={1}
                        placeholder="Enter your password"
                        value={values.password}
                        onChangeText={handleChange("password")}
                        onFocus={() => setFocusedField("password")}
                        onBlur={(e) => {
                          setFocusedField(null);
                          handleBlur("password")(e);
                        }}
                        secureTextEntry
                        autoCapitalize="none"
                        backgroundColor="transparent"
                        borderWidth={0}
                        focusStyle={{ borderWidth: 0 }}
                        color="#111827"
                        fontSize={15}
                        paddingHorizontal={10}
                        size="$4"
                        placeholderTextColor="#9CA3AF"
                      />
                    </XStack>
                    {errors.password && touched.password ? (
                      <Text fontSize={12} color="#DC2626">
                        {errors.password}
                      </Text>
                    ) : null}
                  </YStack>

                  {/* Forgot Password */}
                  <XStack justifyContent="flex-end">
                    <Button
                      unstyled
                      onPress={handleForgotPassword}
                      pressStyle={{ opacity: 0.7 }}
                    >
                      <Text color="#FF6B00" fontSize={14} fontWeight="600">
                        Forgot Password?
                      </Text>
                    </Button>
                  </XStack>

                  {/* Login Button */}
                  <Button
                    onPress={() => handleSubmit()}
                    disabled={!isValid || !dirty || isLoading}
                    opacity={(!isValid || !dirty || isLoading) ? 0.6 : 1}
                    backgroundColor="#FF6B00"
                    borderWidth={0}
                    borderRadius={12}
                    pressStyle={{ backgroundColor: "#EA580C" }}
                    height={50}
                    icon={isLoading ? () => <Spinner size="small" color="white" /> : undefined}
                  >
                    {isLoading ? (
                      <Text color="white" fontWeight="700" fontSize={16}>
                        Signing in...
                      </Text>
                    ) : (
                      <Text color="white" fontWeight="700" fontSize={16}>
                        Login
                      </Text>
                    )}
                  </Button>
                </YStack>
              )}
            </Formik>
          </YStack>

          {/* Footer */}
          <YStack alignItems="center">
            <Text color="#9CA3AF" fontSize={12}>
              Stock Management System
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
