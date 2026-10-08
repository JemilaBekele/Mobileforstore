// app/(auth)/login.tsx
import React, { useState, useRef } from "react";
import { Image, KeyboardAvoidingView, Platform } from "react-native";
import { Formik, FormikProps } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/(redux)/store";
import { login } from "@/(redux)/authSlice";
import { AppColors } from "@/constants/colors";
import {
  Card,
  Text,
  XStack,
  YStack,
  Button,
  Input,
  ScrollView,
  Spinner,
} from 'tamagui';

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
        return { bg: "$red2", borderColor: "$red7", color: "$red11" };
      case "success":
        return { bg: "$green2", borderColor: "$green7", color: "$green11" };
      case "info":
        return { bg: "$orange2", borderColor: "$orange6", color: "$orange12" };
      default:
        return { bg: "$orange2", borderColor: "$orange4", color: "$orange11" };
    }
  };

  const messageStyles = getMessageStyles();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: AppColors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        backgroundColor="$orange1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center"
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack flex={1} justifyContent="center" padding="$4" space="$4" backgroundColor="$orange1">
          {/* Header */}
          <YStack alignItems="center" marginBottom="$2" space="$3">
            <YStack
              width={168}
              height={168}
              borderRadius={84}
              backgroundColor="$orange2"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              <Image
                source={loginImage}
                style={{
                  width: 150,
                  height: 150,
                  resizeMode: "contain",
                }}
              />
            </YStack>
            <YStack alignItems="center" space="$2">
              <Text fontSize="$9" fontWeight="800" color="$orange12" textAlign="center">
                Stock <Text fontSize="$9" fontWeight="800" color="$orange9">Management</Text>
              </Text>
              <YStack width={48} height={4} borderRadius={2} backgroundColor="$orange9" />
            </YStack>
          </YStack>

          {/* Login Card */}
          <Card
            size="$4"
            bordered
            backgroundColor="$orange1"
            borderColor="$orange4"
            borderWidth={1}
            borderRadius="$6"
          >
            <Card.Header padded>
              <Text fontSize="$7" fontWeight="800" color="$orange12" marginBottom="$1">
                Login
              </Text>
              <Text fontSize="$3" color="$orange11" marginBottom="$3">
                Sign in with your staff account
              </Text>

              {/* Message Display */}
              {message ? (
                <YStack
                  padding="$3"
                  borderRadius="$3"
                  marginBottom="$3"
                  backgroundColor={messageStyles.bg}
                  borderColor={messageStyles.borderColor}
                  borderWidth={1}
                >
                  <Text
                    textAlign="center"
                    fontSize="$3"
                    color={messageStyles.color}
                  >
                    {message}
                  </Text>
                </YStack>
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
                  <YStack space="$3">
                    {/* Email Input */}
                    <YStack space="$2">
                      <Text fontSize="$3" fontWeight="600" color="$orange11">
                        Email
                      </Text>
                      <Input
                        placeholder="Enter your email"
                        value={values.email}
                        onChangeText={handleChange("email")}
                        onBlur={handleBlur("email")}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        borderColor={errors.email && touched.email ? "$red8" : "$orange4"}
                        focusStyle={{ borderColor: errors.email && touched.email ? "$red8" : "$orange9" }}
                        backgroundColor="$orange1"
                        color="$orange12"
                        borderRadius="$4"
                        size="$4"
                        placeholderTextColor="$orange11"
                      />
                      {errors.email && touched.email ? (
                        <Text fontSize="$2" color="$red10" marginLeft="$2">
                          {errors.email}
                        </Text>
                      ) : null}
                    </YStack>

                    {/* Password Input */}
                    <YStack space="$2">
                      <Text fontSize="$3" fontWeight="600" color="$orange11">
                        Password
                      </Text>
                      <Input
                        placeholder="Enter your password"
                        value={values.password}
                        onChangeText={handleChange("password")}
                        onBlur={handleBlur("password")}
                        secureTextEntry
                        autoCapitalize="none"
                        borderColor={errors.password && touched.password ? "$red8" : "$orange4"}
                        focusStyle={{ borderColor: errors.password && touched.password ? "$red8" : "$orange9" }}
                        backgroundColor="$orange1"
                        color="$orange12"
                        borderRadius="$4"
                        size="$4"
                        placeholderTextColor="$orange11"
                      />
                      {errors.password && touched.password ? (
                        <Text fontSize="$2" color="$red10" marginLeft="$2">
                          {errors.password}
                        </Text>
                      ) : null}
                    </YStack>

                    {/* Forgot Password */}
                    <XStack justifyContent="flex-end" marginTop="$1">
                      <Button
                        unstyled
                        onPress={handleForgotPassword}
                        pressStyle={{ opacity: 0.7 }}
                      >
                        <Text color="$orange9" fontSize="$3" fontWeight="600">
                          Forgot Password?
                        </Text>
                      </Button>
                    </XStack>

                    {/* Login Button */}
                    <Button
                      onPress={() => handleSubmit()}
                      disabled={!isValid || !dirty || isLoading}
                      opacity={(!isValid || !dirty || isLoading) ? 0.6 : 1}
                      backgroundColor="$orange9"
                      borderColor="$orange9"
                      borderRadius="$4"
                      pressStyle={{ backgroundColor: "$orange10", borderColor: "$orange10" }}
                      size="$4"
                      marginTop="$2"
                      icon={isLoading ? () => <Spinner size="small" color="white" /> : undefined}
                    >
                      {isLoading ? (
                        <Text color="white" fontWeight="600">
                          Signing in...
                        </Text>
                      ) : (
                        <Text color="white" fontWeight="700">
                          Login
                        </Text>
                      )}
                    </Button>
                  </YStack>
                )}
              </Formik>
            </Card.Header>
          </Card>

          {/* Footer */}
          <YStack alignItems="center" marginTop="$4">
            <Text color="$orange11" fontSize="$2">
              Stock Management System
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
