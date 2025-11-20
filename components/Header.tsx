import React, { useState } from 'react';
import { Landmark, LockKeyhole } from 'lucide-react';

interface HeaderProps {
  onGoHome: () => void;
  onAdminClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome, onAdminClick }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <header className="bg-gradient-to-r from-green-600 via-blue-600 to-yellow-500 shadow-lg sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div 
          className="flex items-center space-x-4 cursor-pointer group" 
          onClick={onGoHome}
        >
          {/* Logo da Prefeitura - São José do Goiabal */}
          {/* To use local image locally: import Logo from '../images/logo.png' and src={Logo} */}
          {!imgError ? (
            <img 
              src="https://drive.google.com/uc?export=view&id=1pqmRSZ3g_FFEdumoO3jChkpGqlmW9Wq3" 
              alt="Brasão de São José do Goiabal" 
              className="w-16 h-16 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Landmark size={28} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-white leading-none tracking-tight drop-shadow-sm">SÃO JOSÉ DO GOIABAL</h1>
            <p className="text-xs text-white/90 font-medium mt-1">Cidadão Conectado</p>
          </div>
        </div>

        <button 
          onClick={onAdminClick}
          className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
          title="Acesso Administrativo"
        >
          <LockKeyhole size={20} />
        </button>
      </div>
    </header>
  );
};