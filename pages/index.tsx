import React, { useState } from 'react';
import AuthGate from '../auth/AuthGate';
import HallList from '../auth/HallList';

export default function Home() {
  const [seeded, setSeeded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);



  return (
    <AuthGate>
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 p-8">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-4xl font-extrabold text-center text-purple-700 mb-6 drop-shadow">Munch Club</h1>
          <HallList />
        </div>
      </main>
    </AuthGate>
  );
} 