'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Home() {
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    gsap.from(leftRef.current, {
      x: -50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
    });

    gsap.from(rightRef.current, {
      x: 50,
      opacity: 0,
      duration: 1,
      delay: 0.2,
      ease: 'power3.out',
    });
  }, []);

  return (
    <>
      {/* Navbar */}
      <nav className="w-full bg-[#002147] text-white shadow-md fixed top-0 left-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo only */}
          <div className="flex items-center">
            <Link href="/">
              <img src="/logo.png" alt="Logo" className="w-25 h-12 object-contain cursor-pointer hover:opacity-80 transition" />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="space-x-6 text-sm font-medium hidden md:flex">
            <Link href="/" className="hover:text-gray-300 transition">Home</Link>
            <Link href="#features" className="hover:text-gray-300 transition">Features</Link>
            <Link href="/login" className="hover:text-gray-300 transition">Login</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative min-h-screen bg-white flex flex-col md:flex-row items-center justify-center p-6 pt-24 overflow-hidden">
        {/* Background Illustration */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 to-slate-100 opacity-50 animate-fadeIn"></div>

        {/* Decorative Wave */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden -z-10">
          <svg viewBox="0 0 1440 320" className="w-full h-24">
            <path
              fill="#002147"
              fillOpacity="0.1"
              d="M0,160L48,165.3C96,171,192,181,288,165.3C384,149,480,107,576,96C672,85,768,107,864,117.3C960,128,1056,128,1152,122.7C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>

        {/* Left Panel */}
        <div
          ref={leftRef}
          className="md:w-1/2 w-full text-center md:text-left px-4 md:px-8 mb-10 md:mb-0"
        >
          <div className="mb-6">
  <img src="/icon.png" alt="Logo" className="w-10 h-15 object-contain" />
</div>

          <h1 className="text-4xl font-bold text-[#002147] mb-4">Welcome to Test Generator</h1>
          <p className="text-lg text-[#4b5563] mb-6">
            A modern educational platform for creating, managing, and analyzing quizzes with role-based access for administrators, teachers, and students.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center bg-[#002147] hover:bg-[#1e3a8a] text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-md"
          >
            <i className="ri-login-circle-line mr-2"></i>
            Sign In to Continue
          </Link>
        </div>

        {/* Right Panel */}
        <div
          ref={rightRef}
          className="md:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 md:px-8"
        >
          {[
            { icon: 'ri-admin-line', title: 'Admin Panel', desc: 'Manage users, organizations, content monitoring, and system oversight.' },
            { icon: 'ri-user-line', title: 'Teacher Panel', desc: 'Create questions, manage books, and generate customized quizzes.' },
            { icon: 'ri-user-voice-line', title: 'Student Portal', desc: 'Take quizzes, track performance, and review feedback from teachers.' },
            { icon: 'ri-bar-chart-line', title: 'Analytics', desc: 'Visualize quiz performance, identify trends, and improve learning outcomes.' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition"
            >
              <div className="w-12 h-12 bg-[#e6ecf2] rounded-lg flex items-center justify-center mb-4 shadow-sm">
                <i className={`${item.icon} text-xl text-[#002147]`}></i>
              </div>
              <h3 className="font-semibold text-[#002147] mb-2">{item.title}</h3>
              <p className="text-sm text-[#4b5563]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
