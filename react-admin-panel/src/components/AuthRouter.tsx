import React from 'react';
import { useSearchParams } from 'react-router-dom';
import SupabaseAuth from './SupabaseAuth';

export default function AuthRouter() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'signin';

  // Validate mode parameter
  const validModes = ['signin', 'signup', 'forgot-password', 'reset-password'];
  const currentMode = validModes.includes(mode) ? mode : 'signin';

  return <SupabaseAuth mode={currentMode} />;
}


