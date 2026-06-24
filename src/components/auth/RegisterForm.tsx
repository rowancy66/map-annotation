'use client';

import { redirect } from 'next/navigation';

export default function RegisterForm() {
  redirect('/auth/login');
}