import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, EnterpriseInquiry } from './types';
import { Navbar } from './site/components/Navbar';
import { Footer } from './site/components/Footer';
import { SearchModal } from './site/components/SearchModal';
import { ApplyModal } from './site/components/ApplyModal';
import { EnterpriseContactModal } from './site/components/EnterpriseContactModal';
import { ProgressBar } from './ui/ProgressBar';
import { BackToTop } from './ui/BackToTop';
import { ToastContainer, ToastMessage } from './ui/Toast';
import { HomePage } from './site/pages/HomePage';
import { AboutPage } from './site/pages/AboutPage';
import { ProgramsPage } from './site/pages/ProgramsPage';
import { ResearchPage } from './site/pages/ResearchPage';
import { ContactPage } from './site/pages/ContactPage';
import { AdminPageFullSkeleton } from './ui/Skeleton';

// Loaded on demand so public visitors don't download the admin console.
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

function getInitialPage(): Page {
  // Check pathname first (e.g. /home, /programs, /about, /contact, /admin)
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (['home', 'programs', 'about', 'research', 'contact', 'admin'].includes(path)) {
    return path as Page;
  }
  if (path === '') {
    return 'home';
  }

  // Graceful fallback for legacy hash URLs (e.g. #home, #programs, #admin)
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (['home', 'about', 'programs', 'research', 'contact', 'admin'].includes(hash)) {
    return hash as Page;
  }

  // Check URL search param (e.g. ?page=admin)
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get('page')?.toLowerCase();
  if (pageParam && ['home', 'about', 'programs', 'research', 'contact', 'admin'].includes(pageParam)) {
    return pageParam as Page;
  }

  return 'home';
}

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isEnterpriseOpen, setIsEnterpriseOpen] = useState(false);
  const [applyCourseId, setApplyCourseId] = useState<string | undefined>();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync browser URL pathname with state and support browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
      if (['home', 'programs', 'about', 'research', 'contact', 'admin'].includes(path)) {
        setCurrentPage(path as Page);
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update document title and clean URL path when page changes
  useEffect(() => {
    const pageTitles: Record<Page, string> = {
      home: 'Institute Of AI | Applied AI Education & Workflows',
      programs: 'Programs & Syllabus | Institute Of AI',
      about: 'About & Mentorship | Institute Of AI',
      research: 'Applied AI Insights | Institute Of AI',
      contact: 'Admissions & Contact | Institute Of AI',
      admin: 'Admin Console | Institute Of AI',
    };
    document.title = pageTitles[currentPage] || 'Institute Of AI';

    const targetPath = `/${currentPage}`;
    if (window.location.pathname !== targetPath && !(currentPage === 'home' && window.location.pathname === '/')) {
      window.history.pushState(null, '', targetPath);
    }
  }, [currentPage]);

  const addToast = (title: string, description: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, description, type, duration: 6000 }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    const targetPath = `/${page}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenApplyWithCourse = (courseId: string) => {
    if (courseId === 'enterprise-custom') {
      setIsEnterpriseOpen(true);
      return;
    }
    setApplyCourseId(courseId);
    setIsApplyOpen(true);
  };

  const handleApplicationSuccess = (info: { courseTitle: string; email: string }) => {
    addToast(
      'Application Received',
      `Your application for "${info.courseTitle}" was received. Our admissions team will contact you at ${info.email}.`,
      'success'
    );
  };

  const handleEnterpriseSuccess = (inquiry: EnterpriseInquiry) => {
    addToast(
      'Enterprise Scope Received',
      `Proposal request for ${inquiry.companyName || 'your organization'} received! Our Lead Solutions Architect will contact ${inquiry.workEmail} within 24 hours.`,
      'success'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#031427] text-[#d3e4fe] font-sans selection:bg-[#41e4c0] selection:text-[#031427]">
      {/* Global Reading Progress Bar */}
      <ProgressBar />

      {/* Top Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenApply={() => {
          setApplyCourseId(undefined);
          setIsApplyOpen(true);
        }}
      />

      {/* Main Screen Page Router with Premium Fade Transition */}
      <main className="flex-1 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {currentPage === 'home' && (
              <HomePage
                onNavigate={handleNavigate}
                onOpenApply={() => setIsApplyOpen(true)}
              />
            )}
            {currentPage === 'about' && (
              <AboutPage
                onNavigate={handleNavigate}
                onOpenApply={() => setIsApplyOpen(true)}
              />
            )}
            {currentPage === 'programs' && (
              <ProgramsPage
                onNavigate={handleNavigate}
                onOpenApplyWithCourse={handleOpenApplyWithCourse}
                onOpenEnterpriseContact={() => setIsEnterpriseOpen(true)}
              />
            )}
            {currentPage === 'research' && <ResearchPage />}
            {currentPage === 'contact' && <ContactPage />}
            {currentPage === 'admin' && (
              <Suspense fallback={<AdminPageFullSkeleton />}>
                <AdminPage onAddToast={addToast} />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      <ApplyModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        selectedCourseId={applyCourseId}
        onApplicationSuccess={handleApplicationSuccess}
      />

      <EnterpriseContactModal
        isOpen={isEnterpriseOpen}
        onClose={() => setIsEnterpriseOpen(false)}
        onSuccess={handleEnterpriseSuccess}
      />

      {/* Floating Back to Top Button */}
      <BackToTop threshold={350} />

      {/* Toast Notification Overlay */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
