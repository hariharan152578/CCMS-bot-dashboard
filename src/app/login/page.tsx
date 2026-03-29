'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const adminsRef = ref(db, 'admins');
      const snap = await get(adminsRef);
      let isValid = false;

      if (snap.exists()) {
        const admins = snap.val();
        Object.keys(admins).forEach(key => {
          if (admins[key].email === email && admins[key].password === password) {
            isValid = true;
          }
        });
      }

      if (isValid) {
        document.cookie = 'admin-auth=true; path=/';
        router.push('/admin');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center font-sans relative overflow-hidden">
      
      {/* Decorative Red Blob */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-red-100 opacity-60 mix-blend-multiply blur-3xl z-0 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-red-50 opacity-60 mix-blend-multiply blur-3xl z-0 pointer-events-none"></div>

      {/* Container */}
      <div className="flex w-[1000px] h-[650px] bg-white shadow-2xl rounded-2xl overflow-hidden z-10 border border-gray-100">
        
        {/* Left Side: Login Form */}
        <div className="w-1/2 p-12 flex flex-col justify-center relative bg-white">
          
          <div className="mb-10 text-center">
            {/* Logo placeholder - Red CCMS courthouse style */}
            <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-100">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13H5.5L12 6.5z"/></svg> 
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
            <p className="text-gray-500 text-sm">
              Sign in to access the CCMS Citizen Command,<br/> Dashboard and Live Matrix.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-50 text-gray-800 border-2 border-transparent focus:border-red-500 focus:bg-white outline-none text-sm transition-all shadow-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-50 text-gray-800 border-2 border-transparent focus:border-red-500 focus:bg-white outline-none text-sm transition-all shadow-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between text-xs mt-2 mb-6">
              <label className="flex items-center text-gray-600 cursor-pointer">
                <input type="checkbox" className="form-checkbox text-red-600 border-gray-300 h-4 w-4 rounded mr-2" />
                Remember me
              </label>
              <a href="#" className="text-red-500 hover:text-red-600 font-medium tracking-wide">Forgot password?</a>
            </div>

            {error && <p className="text-red-600 font-medium text-xs text-center border border-red-200 bg-red-50 py-2 rounded mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-wide py-3 rounded-lg transition duration-200 shadow-md shadow-red-200 text-sm mt-4 uppercase"
            >
              Log in to Terminal
            </button>
          </form>

          {/* Optional bottom text */}
          <div className="absolute bottom-6 left-0 w-full text-center">
             <span className="text-gray-400 text-xs">Access restricted to authorized personnel.</span>
          </div>
        </div>

        {/* Right Side: Image/Illustration */}
        <div className="w-1/2 relative bg-gray-50 border-l border-gray-100 flex items-center justify-center p-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-red-700 tracking-tighter mb-4">CCMS</h2>
              <h3 className="text-xl font-bold text-gray-800 tracking-tight">Citizen Command</h3>
              <p className="mt-4 text-gray-500 leading-relaxed text-sm max-w-sm mx-auto">
                Securely manage citizen complaints, monitor city metrics in real-time natively synchronized with WhatsApp infrastructure.
              </p>
            </div>
        </div>

      </div>
    </div>
  );
}
