"use client";
import { useState, useEffect } from "react";
import StealthLogin from "./components/StealthLogin";
import PrivateApp from "./components/PrivateApp";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check session storage on mount
    const authUser = sessionStorage.getItem("doc_auth");
    if (authUser) {
      setUser(authUser);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (username) => {
    sessionStorage.setItem("doc_auth", username);
    setUser(username);
    setIsAuthenticated(true);
  };
  
  if (!isAuthenticated) {
    return <StealthLogin onLogin={handleLogin} />;
  }

  return <PrivateApp user={user} />;
}
