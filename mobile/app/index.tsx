import { useEffect } from "react";
import { Redirect } from "expo-router";
import { getToken } from "../lib/api";
import { useState } from "react";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    getToken().then((token) => {
      setIsLoggedIn(!!token);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return isLoggedIn ? (
    <Redirect href="/(tabs)/" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}
