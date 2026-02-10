import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Start with false for mock

  console.log('🔍 MockAuthProvider: Component rendered, loading:', loading, 'user:', user);

  // Mock sign in - accepts any credentials
  const signIn = async (email: string, password: string) => {
    console.log('🔍 MockAuth: Signing in with:', email);
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful login
    const mockUser = {
      id: 'mock-user-id',
      email: email,
      role: 'admin'
    };
    
    setUser(mockUser);
    setLoading(false);
    
    console.log('✅ MockAuth: Sign in successful');
    return { user: mockUser };
  };

  const signOut = async () => {
    console.log('🔍 MockAuth: Signing out...');
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUser(null);
    setLoading(false);
    
    console.log('✅ MockAuth: Sign out successful');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
