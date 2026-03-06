'use client';

import { useState, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/firebase/firebase';
import { retryWithBackoff, getNetworkErrorMessage, isNetworkConnected } from '@/lib/networkHelper';
import gsap from 'gsap';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

const auth = getAuth(app);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
            // Check network connectivity first
            const hasNetwork = await isNetworkConnected();
            if (!hasNetwork) {
                throw new Error('No internet connection. Please check your network and try again.');
            }
            
            // Use retry mechanism for login
            const userCredential = await retryWithBackoff(
              () => signInWithEmailAndPassword(auth, email, password),
              3,
              1000
            );
            
            const user = userCredential.user;

            let role = null;

            // First, try to get role from Firebase custom claims
            const idTokenResult = await user.getIdTokenResult(true);
            role = idTokenResult.claims.role as string;

            // If no custom claim, try to check Firestore via API
            if (!role) {
                try {
                    console.log('🔍 No custom claims found, checking Firestore for role...');
                    const response = await fetch('/api/auth/check-role', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.uid, email: user.email }),
                    });
                    
                    console.log('📡 API Response status:', response.status, response.ok);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('📦 API Response data:', data);
                        role = data.role;
                        console.log('✅ Role from API:', role);
                    } else if (response.status === 503) {
                        // Both databases have quota exceeded
                        const errorData = await response.json();
                        console.error('⚠️ Service unavailable:', errorData);
                        if (errorData.quotaExceeded) {
                            throw new Error('Our database is temporarily at capacity. Please try again in a few hours or contact support@oup.com.pk');
                        }
                    } else {
                        const errorData = await response.json();
                        console.error('❌ API returned error:', errorData);
                    }
                } catch (error) {
                    console.error('❌ Error calling check-role API:', error);
                    // Silent fail - will try default fallback
                }
            }

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
                setIsLoading(true); // Keep loading true during redirect
                router.replace(redirectPath);
                return; // Exit early after redirect
            } else {
                // No role found - show error instead of defaulting to admin
                setError('❌ Unable to verify your account role. Please contact your administrator.');
                setIsLoading(false);
                return;
            }
        } catch (error: any) {
            
            // Use helper function to get appropriate error message
            let userMessage = getNetworkErrorMessage(error);
            
            // Handle specific Firebase auth errors that aren't network-related
            if (error.code === 'auth/user-not-found') {
              userMessage = '❌ User not found. Please check your email address.';
            } else if (error.code === 'auth/wrong-password') {
              userMessage = '❌ Incorrect password. Please try again.';
            } else if (error.code === 'auth/invalid-email') {
              userMessage = '❌ Invalid email format. Please check your email.';
            } else if (error.code === 'auth/user-disabled') {
              userMessage = '❌ This account has been disabled. Contact support.';
            } else if (error.code === 'auth/too-many-requests') {
              userMessage = '❌ Too many failed login attempts. Please try again later.';
            } else if (error.code === 'auth/invalid-credential') {
              userMessage = '❌ Invalid email or password. Please try again.';
            } else if (error.message === 'No internet connection. Please check your network and try again.') {
              userMessage = error.message;
            } else if (error.message?.includes('quota')) {
              userMessage = '⚠️ Primary service temporarily unavailable. Using backup service...';
            }
            
            setError(userMessage);
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
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-12 sm:h-14">
                        {/* Logo only */}
                        <div className="flex items-center">
                            <Link href="/" className="flex-shrink-0">
                                <Image 
                                    src="/logo.png" 
                                    alt="Logo" 
                                    width={200}
                                    height={48}
                                    priority={true}
                                    className="h-8 sm:h-10 w-auto object-contain cursor-pointer hover:opacity-80 transition"
                                />
                            </Link>
                        </div>

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link href="/" className="hover:text-gray-300 transition px-3 py-2 rounded-md text-sm font-medium font-open-sans">Home</Link>
                                <Link href="#features" className="hover:text-gray-300 transition px-3 py-2 rounded-md text-sm font-medium font-open-sans">Features</Link>
                                <Link href="/login" className="hover:text-gray-300 transition px-3 py-2 rounded-md text-sm font-medium font-open-sans">Login</Link>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="-mr-2 flex md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="bg-[#002147] inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-[#1e3a8a] focus:outline-none">
                                <span className="sr-only">Open main menu</span>
                                <i className={isMenuOpen ? "ri-close-line text-lg sm:text-xl" : "ri-menu-line text-lg sm:text-xl"}></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link href="/" className="block px-3 py-2 rounded-md text-sm sm:text-base font-medium hover:bg-[#1e3a8a] transition font-open-sans">Home</Link>
                        <Link href="#features" className="block px-3 py-2 rounded-md text-sm sm:text-base font-medium hover:bg-[#1e3a8a] transition font-open-sans">Features</Link>
                        <Link href="/login" className="block px-3 py-2 rounded-md text-sm sm:text-base font-medium hover:bg-[#1e3a8a] transition font-open-sans">Login</Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 pt-14 pb-4 overflow-hidden">

                {/* Login Card */}
                <div className="w-full max-w-sm" ref={cardRef}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100"
                        style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
                    >
                        {/* Top Accent Bar */}
                        <div className="w-20 h-1 bg-gradient-to-r from-[#002147] to-[#1e3a8a] rounded-full mx-auto mb-6"></div>
                        
                        <div className="text-center mb-6 sm:mb-7">
                            <h1 className="text-2xl sm:text-3xl font-bold text-[#002147] font-gibson mb-2">Welcome Back</h1>
                            <p className="text-sm text-[#6b7280] font-open-sans">Log in to access your dashboard</p>
                        </div>

                        {error && (
                            <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-lg p-3 mb-4 shadow-sm">
                                <div className="flex items-start">
                                    <i className="ri-error-warning-fill text-red-600 mr-2 mt-0.5 text-base"></i>
                                    <div>
                                        <p className="text-red-800 text-xs font-medium">{error}</p>
                                        {error.includes('too many requests') && (
                                            <p className="text-red-600 text-xs mt-1">Please wait a few minutes before trying again.</p>
                                        )}
                                        {(error.includes('not found') || error.includes('Incorrect')) && (
                                            <p className="text-red-600 text-xs mt-1">Check your email and password are correct.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6 pb-6">
                            <div>
                                <label htmlFor="email" className="flex items-center text-sm text-[#002147] mb-2 font-semibold font-open-sans">
                                    <i className="ri-mail-line mr-2 text-[#002147]"></i>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#002147] focus:border-[#002147] focus:outline-none transition-all text-sm bg-slate-50 hover:bg-white"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="flex items-center text-sm text-[#002147] mb-2 font-semibold font-open-sans">
                                    <i className="ri-lock-line mr-2 text-[#002147]"></i>
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-[#002147] focus:border-[#002147] focus:outline-none transition-all text-sm bg-slate-50 hover:bg-white"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#002147] transition-colors focus:outline-none"
                                    >
                                        <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-xl`}></i>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#002147] hover:bg-[#1e3a8a] text-white py-3 rounded-lg transition-colors flex items-center justify-center shadow-md font-medium font-open-sans"
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
