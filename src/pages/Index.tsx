
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login page
    navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-white">IoT_Stellar</h1>
        <p className="text-xl text-blue-300">Redirecting to login...</p>
      </div>
    </div>
  );
};

export default Index;
