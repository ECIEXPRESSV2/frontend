import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { ChatProvider } from './context/ChatContext';
import AutoRefreshIndicator from './components/common/AutoRefreshIndicator';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <ChatProvider>
            <WalletProvider>
              <AppRoutes />
              <AutoRefreshIndicator />
              <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} />
            </WalletProvider>
          </ChatProvider>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
