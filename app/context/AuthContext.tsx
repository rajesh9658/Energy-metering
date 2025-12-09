import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (name, password) => {
    setUser({ name });
  };

  const signup = (name, email, password) => {
    setUser({ name, email });
  };

  const forgotPassword = (email) => {
    console.log("Reset link sent to:", email);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider
      value={{ user, login, signup, forgotPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
