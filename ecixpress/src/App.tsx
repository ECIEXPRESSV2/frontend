import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalletProvider>
          <AppRoutes />
          <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} />
        </WalletProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
