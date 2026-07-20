"use client";
import { useState } from "react";

export default function StealthLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Credentials provided by the user
    const users = {
      veeku: "suki16",
      suki: "veeku05"
    };

    if (users[username] && users[username] === password) {
      setError("");
      onLogin(username);
    } else {
      // Intentionally generic error for stealth
      setError("Invalid file path or document ID.");
    }
  };

  return (
    <div className="stealth-container">
      <div className="stealth-form">
        <div className="stealth-header">
          <h1>Document Viewer 1.0</h1>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
            Please enter the document credentials to proceed.
          </p>
        </div>
        
        <form onSubmit={handleLogin}>
          <input
            type="text"
            className="stealth-input"
            placeholder="Document ID"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
          
          <input
            type="password"
            className="stealth-input"
            placeholder="Access Key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />
          
          {error && <span className="error-text">{error}</span>}
          
          <button type="submit" className="stealth-button">
            View Document
          </button>
        </form>
      </div>
    </div>
  );
}
