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
    <div className="min-h-screen bg-[#F9FAFB] flex justify-center items-center font-sans relative overflow-hidden p-4 md:p-6">
      
      {/* Premium Motion Mesh Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-100/40 mix-blend-multiply blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-red-50/40 mix-blend-multiply blur-[100px] delay-700"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-gray-100/50 mix-blend-multiply blur-[140px]"></div>
      </div>

      {/* Container - Glassmorphism Card */}
      <div className="flex flex-col md:flex-row w-full max-w-4xl min-h-[600px] bg-white/80 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] rounded-[2.5rem] overflow-hidden z-10 border border-white/40">
        
        {/* Left Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center relative bg-white/40">
          
          <div className="mb-10 text-center">
            {/* Logo placeholder - Red CCMS courthouse style */}
            <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-100">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13H5.5L12 6.5z"/></svg> 
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Sign in to access the CCMS Citizen Command Dashboard and Live Matrix.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                required
                className="w-full px-4 py-3.5 rounded-xl bg-white/60 text-gray-800 border-2 border-transparent focus:border-red-600 focus:bg-white outline-none text-sm transition-all shadow-sm ring-1 ring-gray-200/50"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="w-full px-4 py-3.5 rounded-xl bg-white/60 text-gray-800 border-2 border-transparent focus:border-red-600 focus:bg-white outline-none text-sm transition-all shadow-sm ring-1 ring-gray-200/50"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between text-xs py-2">
              <label className="flex items-center text-gray-600 cursor-pointer group">
                <input type="checkbox" className="form-checkbox text-red-600 border-gray-300 h-4 w-4 rounded-md mr-2 transition-all group-hover:scale-110" />
                Remember me
              </label>
              <a href="#" className="text-red-600 hover:text-red-700 font-bold tracking-wide">Forgot password?</a>
            </div>

            {error && <p className="text-red-600 font-bold text-[10px] uppercase tracking-widest text-center border border-red-100 bg-red-50/50 py-2.5 rounded-lg my-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-black text-white font-black tracking-widest py-4 rounded-xl transition-all duration-300 shadow-lg shadow-red-200 text-xs sm:text-sm mt-4 uppercase flex items-center justify-center gap-2 group"
            >
              {loading ? 'Authenticating...' : 'Log in to Terminal'}
              {!loading && <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
            </button>
          </form>

          {/* Optional bottom text */}
          <div className="absolute bottom-6 left-0 w-full text-center">
             <span className="text-gray-400 text-xs">Access restricted to authorized personnel.</span>
          </div>
        </div>

        {/* Right Side: Image/Illustration */}
        <div className="w-full md:w-1/2 relative bg-gray-900 border-l border-white/10 flex items-center justify-center p-8 sm:p-12 overflow-hidden group">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
               <Image 
                 src="/login-hero.png" 
                 alt="CCMS Visual" 
                 fill 
                 className="object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100"
               />
               <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent"></div>
            </div>

            <div className="text-center relative z-10">
              <div className="inline-block px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6 shadow-xl shadow-red-600/30">
                Authorized Personnel Only
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-4 flex items-baseline justify-center gap-1">
                CCMS<span className="text-red-600">.</span>
              </h2>
              <h3 className="text-lg sm:text-xl font-medium text-gray-300 tracking-tight mb-6">Citizen Command Center</h3>
              <p className="text-gray-400 leading-relaxed text-sm max-w-xs mx-auto font-medium">
                Real-time incident management, municipality broad-oversight, and synchronized WhatsApp infrastructure.
              </p>
            </div>
        </div>

      </div>
    </div>
  );
}
