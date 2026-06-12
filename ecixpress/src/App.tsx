import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
