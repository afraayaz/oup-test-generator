'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function Home() {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [userType, setUserType] = useState<'individual' | 'school'>('individual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    schoolName: '',
    email: '',
    contact: '',
    region: '',
    city: '',
    query: ''
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Using Formspree for email handling
      const formspreeEndpoint = 'https://formspree.io/f/xjgenoyv'; // Replace with your Formspree form ID
      
      const formDataToSend = new FormData();
      formDataToSend.append('userType', userType === 'individual' ? '👤 Individual' : '🏫 School');
      formDataToSend.append('name', userType === 'individual' ? formData.name : formData.schoolName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('contact', formData.contact);
      formDataToSend.append('region', formData.region);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('query', formData.query);
      formDataToSend.append('_replyto', formData.email);
      formDataToSend.append('_subject', `New ${userType} registration inquiry`);

      const response = await fetch(formspreeEndpoint, {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', schoolName: '', email: '', contact: '', region: '', city: '', query: '' });
        setTimeout(() => {
          setShowRegisterModal(false);
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-[#002147] hover:bg-[#1e3a8a] text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-md"
            >
              <i className="ri-login-circle-line mr-2"></i>
              Sign In to Continue
            </Link>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center justify-center bg-white hover:bg-[#002147] text-[#002147] hover:text-white font-medium py-3 px-6 rounded-lg transition-all shadow-md border-2 border-[#002147]"
            >
              <i className="ri-user-add-line mr-2"></i>
              Register Interest
            </button>
          </div>
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

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="sticky top-0 bg-[#002147] text-white p-3 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <i className="ri-user-add-line text-lg"></i>
                Register Your Interest
              </h2>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="hover:bg-white/20 rounded-lg p-1.5 transition"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-2">
              {/* User Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#002147] mb-1">I am:</label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as 'individual' | 'school')}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition text-sm text-gray-800 font-medium"
                >
                  <option value="individual">👤 Individual</option>
                  <option value="school">🏫 School</option>
                </select>
              </div>

              {/* Conditional Name Field */}
              {userType === 'individual' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#002147] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#002147] mb-1">
                      Contact Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition text-sm"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#002147] mb-1">
                      School Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="schoolName"
                      value={formData.schoolName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition text-sm"
                      placeholder="Enter school name"
                    />
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[#002147] mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition text-sm"
                  placeholder="your@email.com"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-semibold text-[#002147] mb-1">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  required
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition text-sm"
                  placeholder="+92 300 1234567"
                />
              </div>

              {/* Region & City */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#002147] mb-1">
                    Region <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    required
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition text-sm"
                    placeholder="Punjab"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#002147] mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition text-sm"
                    placeholder="Lahore"
                  />
                </div>
              </div>

              {/* Query/Message */}
              <div>
                <label className="block text-xs font-semibold text-[#002147] mb-1">
                  Your Query/Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="query"
                  value={formData.query}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:border-[#002147] focus:outline-none transition resize-none text-sm"
                  placeholder="Please describe your requirements..."
                />
              </div>

              {/* Submit Status */}
              {submitStatus === 'success' && (
                <div className="bg-green-50 border-2 border-green-500 text-green-700 px-3 py-2 rounded-lg flex items-center gap-2">
                  <i className="ri-check-line text-lg"></i>
                  <span className="font-semibold text-xs">Submitted successfully! We'll contact you soon.</span>
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="bg-red-50 border-2 border-red-500 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2">
                  <i className="ri-error-warning-line text-lg"></i>
                  <span className="font-semibold text-xs">Failed to submit. Please try again later.</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-[#002147] hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-sm"></i>
                    <span className="text-sm">Submitting...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-fill text-sm"></i>
                    <span className="text-sm">Submit Registration</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
