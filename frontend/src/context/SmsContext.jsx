// src/context/SmsContext.jsx
import React, { createContext, useState, useEffect } from "react";

export const SmsContext = createContext();

export const SmsProvider = ({ children }) => {
  const [numbersInput, setNumbersInput] = useState(() => {
    return localStorage.getItem("numbersInput") || "";
  });
  const [message, setMessage] = useState(() => {
    return localStorage.getItem("message") || "";
  });

  // Save to localStorage whenever values change
  useEffect(() => {
    localStorage.setItem("numbersInput", numbersInput);
  }, [numbersInput]);

  useEffect(() => {
    localStorage.setItem("message", message);
  }, [message]);

  return (
    <SmsContext.Provider
      value={{
        numbersInput,
        setNumbersInput,
        message,
        setMessage
      }}
    >
      {children}
    </SmsContext.Provider>
  );
};
