import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Landing from './pages/Landing';
import Arsenal from './pages/Arsenal';
import IdentityLab from './pages/IdentityLab';
import Cart from './pages/Cart';
import NexusControl from './pages/NexusControl';
import JerseyEditor from './pages/JerseyEditor';
import DesignLab from './pages/DesignLab';
import Header from './components/Header';
import Footer from './components/Footer';
import OverlayScrollbar from './components/OverlayScrollbar';
import { CartProvider } from '@/lib/CartContext';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <div className="min-h-screen bg-void">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/arsenal" element={<Arsenal />} />
        <Route path="/lab/:jerseyId" element={<IdentityLab />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/nexus-control" element={<NexusControl />} />
        <Route path="/nexus-control/editor" element={<JerseyEditor />} />
        <Route path="/nexus-control/editor/:jerseyId" element={<JerseyEditor />} />
        <Route path="/design-lab" element={<DesignLab />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <Footer />
      <OverlayScrollbar />
    </div>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <CartProvider>
            <AuthenticatedApp />
          </CartProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App