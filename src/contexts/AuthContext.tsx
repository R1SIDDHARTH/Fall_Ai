// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import { auth } from "../lib/firebase"; // Ensure this path is correct

// Define types for user and context
interface UserData {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
  phone: string | null;
  dob: string | null;
}

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (
    email: string,
    password: string,
    name?: string,
    photoURL?: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (userData: Partial<Pick<UserData, "name" | "photo">>) => Promise<void>;
}

// Create authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register new user
  const register = async (email: string, password: string, name?: string, photoURL?: string) => {
    try {
      setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Update profile if name or photoURL is provided
      if (name || photoURL) {
        await updateProfile(newUser, {
          displayName: name || null,
          photoURL: photoURL || null,
        });
        await newUser.reload();
      }

      setUser({
        id: newUser.uid,
        name: newUser.displayName,
        email: newUser.email,
        photo: newUser.photoURL,
        phone: null,
        dob: null,
      });
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login existing user
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      setUser({
        id: loggedInUser.uid,
        name: loggedInUser.displayName,
        email: loggedInUser.email,
        photo: loggedInUser.photoURL,
        phone: null,
        dob: null,
      });
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (
    userData: Partial<Pick<UserData, "name" | "photo">>
  ) => {
    try {
      if (!auth.currentUser) {
        throw new Error("No authenticated user");
      }

      await updateProfile(auth.currentUser, {
        displayName: userData.name || auth.currentUser.displayName,
        photoURL: userData.photo || auth.currentUser.photoURL,
      });

      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: userData.name || prev.name,
              photo: userData.photo || prev.photo,
            }
          : null
      );
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          photo: firebaseUser.photoURL,
          phone: null,
          dob: null,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Context value
  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    register,
    login,
    logout,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;