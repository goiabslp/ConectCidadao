import React, { useState } from 'react';
import { Landmark, LockKeyhole } from 'lucide-react';

interface HeaderProps {
  onGoHome: () => void;
  onAdminClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome, onAdminClick }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div 
          className="flex items-center space-x-4 cursor-pointer group" 
          onClick={onGoHome}
        >
          {/* Logo da Prefeitura - São José do Goiabal */}
          {!imgError ? (
            <img 
              src="https://drive.google.com/uc?export=view&id=1pqmRSZ3g_FFEdumoO3jChkpGqlmW9Wq3" 
              alt="Brasão de São José do Goiabal" 
              className="w-16 h-16 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <Landmark size={28} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 leading-none tracking-tight">SÃO JOSÉ DO GOIABAL</h1>
            <p className="text-xs text-gray-500 font-medium mt-1">Cidadão Conectado</p>
          </div>
        </div>

        <button 
          onClick={onAdminClick}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Acesso Administrativo"
        >
          <LockKeyhole size={20} />
        </button>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-green-400"></div>
    </header>
  );
};