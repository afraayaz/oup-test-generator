'use client';

import { useState, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/firebase/firebase';
import gsap from 'gsap';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

const auth = getAuth(app);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    const cardRef = useRef(null);
    const iconRef = useRef(null);

    useLayoutEffect(() => {
        gsap.from(cardRef.current, {
            opacity: 1,
            scale: 0.95,
            duration: 0.6,
            ease: 'power3.out',
        });

        gsap.from(iconRef.current, {
            scale: 0,
            duration: 0.6,
            delay: 0.2,
            ease: 'back.out(1.7)',
        });
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log('🔐 Login attempt:', email);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('✓ Firebase sign in successful:', user.email, user.uid);

            let role = null;

            // First, try to get role from Firebase custom claims
            console.log('🔍 Checking custom claims...');
            const idTokenResult = await user.getIdTokenResult(true);
            role = idTokenResult.claims.role as string;
            console.log('Custom claims role:', role);

            // If no custom claim, try to check Firestore via API
            if (!role) {
                console.log('📡 No custom claim found, checking Firestore via API...');
                try {
                    const response = await fetch('/api/auth/check-role', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.uid, email: user.email }),
                    });
                    console.log('API check-role response status:', response.status);
                    
                    if (response.ok) {
                        const data = await response.json();
                        role = data.role;
                        console.log('✓ Role from API:', role);
                    } else {
                        console.error('API error response:', await response.text());
                    }
                } catch (error) {
                    console.error('Error checking role via API:', error);
                }
            }

            console.log('📍 Final role determined:', role);

            // Redirect user based on their role
            const roleMap: { [key: string]: string } = {
                'admin': '/admin/dashboard',
                'Admin': '/admin/dashboard',
                'school_admin': '/school-admin/dashboard',
                'School Admin': '/school-admin/dashboard',
                'teacher': '/teacher/dashboard',
                'Teacher': '/teacher/dashboard',
                'student': '/student/dashboard',
                'Student': '/student/dashboard',
                'moderator': '/moderator/dashboard',
                'Moderator': '/moderator/dashboard',
                'content_creator': '/content-creator/dashboard',
                'Content Creator': '/content-creator/dashboard',
                'content_manager': '/moderator/dashboard',
                'Content Manager': '/moderator/dashboard',
                'oup_admin': '/admin/dashboard',
                'OUP Admin': '/admin/dashboard',
            };

            // If we found a role, redirect accordingly
            if (role) {
                const redirectPath = roleMap[role];
                console.log('🔀 Redirecting to:', redirectPath);
                setIsLoading(true); // Keep loading true during redirect
                router.replace(redirectPath);
                console.log('✓ Router replace called');
                return; // Exit early after redirect
            } else {
                console.warn('⚠️ No role found, defaulting to admin dashboard');
                // No role found - default to admin dashboard
                // The dashboard layout will check permissions and redirect if needed
                setIsLoading(true); // Keep loading true during redirect
                router.replace('/admin/dashboard');
                console.log('✓ Router replace to admin dashboard called');
                return; // Exit early after redirect
            }
        } catch (error: any) {
            console.error('❌ Login error:', error);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            setError(error.message || 'Failed to log in. Please check your credentials.');
            setIsLoading(false);
        }
    };

    return (
        <>
            <Head>
                <link rel="preload" href="/icon.png" as="image" />
                <link href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css" rel="stylesheet" />
            </Head>

            {/* Navbar */}
            <nav className="w-full bg-[#002147] text-white shadow-md fixed top-0 left-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo only */}
                        <div className="flex items-center">
                            <Link href="/" className="flex-shrink-0">
                                <Image 
                                    src="/logo.png" 
                                    alt="Logo" 
                                    width={200}
                                    height={48}
                                    priority={true}
                                    className="h-12 object-contain cursor-pointer hover:opacity-80 transition"
                                />
                            </Link>
                        </div>

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link href="/" className="hover:text-gray-300 transition px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                                <Link href="#features" className="hover:text-gray-300 transition px-3 py-2 rounded-md text-sm font-medium">Features</Link>
                                <Link href="/login" className="hover:text-gray-300 transition px-3 py-2 rounded-md text-sm font-medium">Login</Link>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="-mr-2 flex md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="bg-[#002147] inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-[#1e3a8a] focus:outline-none">
                                <span className="sr-only">Open main menu</span>
                                <i className={isMenuOpen ? "ri-close-line text-2xl" : "ri-menu-line text-2xl"}></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#1e3a8a] transition">Home</Link>
                        <Link href="#features" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#1e3a8a] transition">Features</Link>
                        <Link href="/login" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#1e3a8a] transition">Login</Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 pt-24 overflow-x-hidden">

                {/* Login Card */}
                <div className="w-full max-w-sm" ref={cardRef}>
                    <div
                        className="bg-white rounded-xl shadow-xl p-8 border border-slate-200"
                        style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
                    >
                        <div className="text-center mb-6">
                            <div ref={iconRef} className="flex justify-center mb-4">
                                <Image 
                                    src="/icon.png" 
                                    alt="Logo" 
                                    width={40}
                                    height={40}
                                    priority={true}
                                    className="w-10 h-10 object-contain"
                                />
                            </div>
                            <h1 className="text-2xl font-semibold text-[#002147]">Welcome Back</h1>
                            <p className="text-sm text-[#4b5563]">Log in to access your dashboard</p>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm text-center mb-4">{error}</div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm text-[#002147] mb-2 font-medium">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#002147] focus:outline-none transition text-sm"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm text-[#002147] mb-2 font-medium">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#002147] focus:outline-none transition text-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#002147] hover:bg-[#1e3a8a] text-white py-2.5 rounded-md transition flex items-center justify-center shadow-md font-semibold text-sm"
                            >
                                {isLoading ? (
                                    <>
                                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                                        Logging in...
                                    </>
                                ) : (
                                    <>
                                        <i className="ri-login-circle-line mr-2"></i>
                                        Login
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )};