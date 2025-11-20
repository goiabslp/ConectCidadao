
import React from 'react';
import { Sector, ServiceOption } from '../types';
import * as LucideIcons from 'lucide-react';

// Component for Sector Grid (Dashboard)
export const SectorGrid = ({ 
  sectors,
  onSelect 
}: { 
  sectors: Sector[];
  onSelect: (sector: Sector) => void 
}) => (
  <div className="max-w-3xl mx-auto p-4 animate-fade-in">
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-800">Olá, Cidadão!</h2>
      <p className="text-gray-600">Selecione o setor para iniciar sua solicitação.</p>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {sectors.map((sector) => {
        // Dynamically get icon component
        const iconName = sector.iconName as keyof typeof LucideIcons;
        const IconComponent = (LucideIcons[iconName] || LucideIcons.HelpCircle) as React.ElementType;
        
        return (
          <button
            key={sector.id}
            onClick={() => onSelect(sector)}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200 group relative overflow-hidden"
          >
            <div className={`w-14 h-14 ${sector.color} rounded-full flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform duration-300`}>
              <IconComponent size={28} />
            </div>
            <span className="text-sm font-semibold text-gray-800 text-center group-hover:text-blue-700 z-10">
              {sector.name}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

// Component for Service List
export const ServiceList = ({ 
  sector, 
  services,
  onSelect, 
  onBack 
}: { 
  sector: Sector;
  services: ServiceOption[]; 
  onSelect: (service: ServiceOption) => void; 
  onBack: () => void;
}) => {
  // Filter services passed via props (Must be active)
  const filteredServices = services.filter(s => s.sectorId === sector.id && s.active !== false);

  return (
    <div className="max-w-3xl mx-auto p-4 animate-fade-in">
      <button 
        onClick={onBack} 
        className="group flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow hover:border-blue-300 hover:text-blue-600 transition-all duration-200"
      >
        <div className="bg-gray-100 p-1 rounded-full group-hover:bg-blue-50 transition-colors">
          <LucideIcons.ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        </div>
        Voltar
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{sector.name}</h2>
        {sector.managerName && (
           <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Responsável: {sector.managerName}</p>
        )}
        <p className="text-gray-600 mt-2">Qual tipo de serviço você precisa?</p>
      </div>
      
      <div className="space-y-3">
        {filteredServices.length > 0 ? (
          filteredServices.map(service => (
            <button
              key={service.id}
              onClick={() => onSelect(service)}
              className="w-full text-left p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition flex items-center justify-between group"
            >
              <div>
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-700">{service.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{service.description}</p>
              </div>
              <LucideIcons.ChevronRight className="text-gray-400 group-hover:text-blue-600" size={20} />
            </button>
          ))
        ) : (
          <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
            Nenhum serviço disponível para este setor no momento.
          </div>
        )}
      </div>
    </div>
  );
};

// Component for Success Screen
export const SuccessScreen = ({ onHome, protocolId }: { onHome: () => void; protocolId: string }) => (
  <div className="max-w-md mx-auto p-8 mt-10 text-center animate-fade-in">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <LucideIcons.CheckCircle2 size={40} className="text-green-600" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitação Enviada!</h2>
    <p className="text-gray-600 mb-8">
      Sua demanda foi registrada com sucesso. Você receberá atualizações pelo telefone informado.
    </p>
    <div className="bg-gray-100 p-4 rounded-lg mb-8 text-sm text-gray-700">
      Protocolo: <span className="font-mono font-bold text-lg">{protocolId}</span>
    </div>
    <button
      onClick={onHome}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md"
    >
      Voltar ao Início
    </button>
  </div>
);
