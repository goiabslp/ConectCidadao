
import React, { useState } from 'react';
import { Header } from './components/Header';
import { ServiceForm } from './components/ServiceForm';
import { AdminDashboard } from './components/AdminDashboard';
import { SectorGrid, ServiceList, SuccessScreen } from './components/CitizenComponents';
import { Sector, ServiceOption, ReportFormData, Report, ReportStatus, AIAnalysisResult, User } from './types';
import { SECTORS as INITIAL_SECTORS, SERVICES as INITIAL_SERVICES, AVAILABLE_AVATARS } from './constants';

// Initial Mock Data for Admin Visualization
const MOCK_REPORTS: Report[] = [
  {
    id: 'PREF-1234',
    serviceName: 'Buraco na Via',
    sectorId: 'obras',
    name: 'Maria Aparecida',
    phone: '(31) 9 9999-8888',
    description: 'Buraco enorme na frente da padaria do Zé, quase caí de moto ontem a noite.',
    location: { lat: -19.93, lng: -43.93, address: 'Rua Principal, 100' },
    files: [],
    status: 'PENDING',
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    aiAnalysis: {
      summary: 'Buraco perigoso em via pública',
      urgency: 'Alta',
      category: 'Manutenção Asfáltica',
      isClear: true
    },
    history: [{ date: new Date(Date.now() - 86400000), action: 'Criado' }]
  },
  {
    id: 'PREF-6789',
    serviceName: 'Lâmpada Queimada',
    sectorId: 'iluminacao',
    name: 'Carlos Drumond',
    phone: '(31) 9 8888-7777',
    description: 'Poste em frente a escola está apagado há uma semana.',
    location: { lat: -19.94, lng: -43.94, address: 'Av. Escola, 500' },
    files: [],
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    adminResponse: 'Equipe agendada para hoje à noite.',
    aiAnalysis: {
      summary: 'Iluminação pública defeituosa',
      urgency: 'Média',
      category: 'Reparo Elétrico',
      isClear: true
    },
    history: [
      { date: new Date(Date.now() - 172800000), action: 'Criado' },
      { 
        date: new Date(Date.now() - 86400000), 
        action: 'Atendimento Iniciado', 
        adminName: 'João da Obra', 
        adminJobTitle: 'Coordenador',
        responseNote: 'Equipe agendada para hoje à noite.'
      }
    ]
  },
  {
    id: 'PREF-9901',
    serviceName: 'Poda de Árvore',
    sectorId: 'meio_ambiente',
    name: 'João da Obra',
    phone: '(31) 9 8888-5678',
    description: 'Árvore com risco iminente na praça central, galhos tocando a fiação.',
    location: { lat: -19.935, lng: -43.935, address: 'Praça Central' },
    files: [],
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    isInternal: true,
    authorJobTitle: 'Coordenador de Vias',
    aiAnalysis: {
      summary: 'Risco de queda de árvore em fiação',
      urgency: 'Alta',
      category: 'Manutenção Arbórea',
      isClear: true
    },
    history: [{ date: new Date(Date.now() - 3600000), action: 'Criado' }]
  }
];

// Initial Mock Users
const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Secretário Administrativo',
    nickname: 'Secretário',
    jobTitle: 'Secretário Municipal',
    phone: '(31) 9 9999-1234',
    cpf: '08670868660', 
    password: '123456',
    role: 'SUPER_ADMIN',
    permittedSectors: [], // Super Admin acessa tudo independente do array
    avatar: AVAILABLE_AVATARS[0],
    active: true
  },
  {
    id: 'u2',
    name: 'João das Obras',
    nickname: 'João da Obra',
    jobTitle: 'Coordenador de Vias',
    phone: '(31) 9 8888-5678',
    cpf: '11122233344',
    password: 'obras',
    role: 'ADMIN',
    permittedSectors: ['obras', 'iluminacao'],
    avatar: AVAILABLE_AVATARS[1],
    active: true
  }
];

function App() {
  const [view, setView] = useState<'SECTORS' | 'SERVICES' | 'FORM' | 'SUCCESS' | 'ADMIN'>('SECTORS');
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  
  // Centralized State
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [sectors, setSectors] = useState<Sector[]>(INITIAL_SECTORS);
  const [services, setServices] = useState<ServiceOption[]>(INITIAL_SERVICES);

  // Tracks the ID of the most recently created report for display on SuccessScreen
  const [lastProtocol, setLastProtocol] = useState<string>('');

  const handleSectorSelect = (sector: Sector) => {
    setSelectedSector(sector);
    setView('SERVICES');
  };

  const handleServiceSelect = (service: ServiceOption) => {
    setSelectedService(service);
    setView('FORM');
  };

  const handleFormSubmit = (data: ReportFormData, aiResult: AIAnalysisResult | null) => {
    const protocolId = `PREF-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: Report = {
      ...data,
      id: protocolId,
      serviceName: selectedService?.name || 'Serviço Geral',
      sectorId: selectedSector?.id || 'geral',
      status: 'PENDING',
      createdAt: new Date(),
      aiAnalysis: aiResult || undefined,
      history: [{ date: new Date(), action: 'Criado' }]
    };

    setLastProtocol(protocolId);
    setReports(prev => [newReport, ...prev]);
    setView('SUCCESS');
  };

  // Admin Actions
  const handleAdminReportSubmit = (data: ReportFormData, aiResult: AIAnalysisResult | null, serviceName: string, sectorId: string, user?: User, customId?: string) => {
    const newReport: Report = {
      ...data,
      id: customId || `PREF-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceName: serviceName,
      sectorId: sectorId,
      status: 'PENDING',
      createdAt: new Date(),
      aiAnalysis: aiResult || undefined,
      isInternal: true,
      authorJobTitle: user?.jobTitle,
      history: [{ date: new Date(), action: 'Criado' }]
    };
    setReports(prev => [newReport, ...prev]);
  };

  const handleUpdateReport = (id: string, status: ReportStatus, adminResponse: string, user: User) => {
    setReports(prev => prev.map(report => {
      if (report.id === id) {
        // Determinar o nome da ação baseado na mudança de status
        let actionLabel = 'Atualização';
        
        if (report.status !== status) {
          if (status === 'IN_PROGRESS') {
             // Se estava finalizado e voltou para em andamento, é uma reabertura
             if (report.status === 'RESOLVED' || report.status === 'REJECTED') {
               actionLabel = 'Reaberto';
             } else {
               actionLabel = 'Atendimento Iniciado';
             }
          }
          else if (status === 'RESOLVED') actionLabel = 'Concluído';
          else if (status === 'REJECTED') actionLabel = 'Rejeitado';
          else if (status === 'PENDING') actionLabel = 'Pendente'; // Caso raro de rollback
        }

        return {
          ...report,
          status,
          adminResponse: adminResponse || report.adminResponse, // Mantém a última resposta visível no campo simples
          history: [
            ...report.history, 
            { 
              date: new Date(), 
              action: actionLabel,
              adminName: user.name,
              adminJobTitle: user.jobTitle,
              responseNote: adminResponse
            }
          ]
        };
      }
      return report;
    }));
  };

  // User Management Handlers
  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleEditUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Sector Management Handlers
  const handleAddSector = (newSector: Sector) => {
    setSectors(prev => [...prev, newSector]);
  };

  const handleEditSector = (updatedSector: Sector) => {
    setSectors(prev => prev.map(s => s.id === updatedSector.id ? updatedSector : s));
  };

  const handleDeleteSector = (sectorId: string) => {
    // Check if there are reports associated with this sector before deleting (optional, for now hard delete)
    setSectors(prev => prev.filter(s => s.id !== sectorId));
  };

  // Service Management Handlers
  const handleAddService = (newService: ServiceOption) => {
    setServices(prev => [...prev, newService]);
  };

  const handleEditService = (updatedService: ServiceOption) => {
    setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
  };

  const handleDeleteService = (serviceId: string) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const handleToggleServiceStatus = (serviceId: string) => {
    setServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        // Se undefined, assume true, então inverte para false
        const currentActive = s.active !== false;
        return { ...s, active: !currentActive };
      }
      return s;
    }));
  };

  const goHome = () => {
    setSelectedSector(null);
    setSelectedService(null);
    setView('SECTORS');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {view !== 'ADMIN' && (
        <Header onGoHome={goHome} onAdminClick={() => setView('ADMIN')} />
      )}
      
      <main className="flex-grow py-6">
        {view === 'SECTORS' && (
          <SectorGrid 
            sectors={sectors.filter(s => s.active)} 
            onSelect={handleSectorSelect} 
          />
        )}
        
        {view === 'SERVICES' && selectedSector && (
          <ServiceList 
            sector={selectedSector}
            services={services}
            onSelect={handleServiceSelect} 
            onBack={() => setView('SECTORS')}
            />
        )}

        {view === 'FORM' && selectedService && (
          <ServiceForm 
            service={selectedService} 
            onBack={() => setView('SERVICES')}
            onSubmit={handleFormSubmit}
          />
        )}

        {view === 'SUCCESS' && <SuccessScreen onHome={goHome} protocolId={lastProtocol} />}

        {view === 'ADMIN' && (
          <AdminDashboard 
            reports={reports} 
            users={users}
            sectors={sectors}
            services={services}
            onUpdateReport={handleUpdateReport} 
            onAddReport={handleAdminReportSubmit}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onAddSector={handleAddSector}
            onEditSector={handleEditSector}
            onDeleteSector={handleDeleteSector}
            onAddService={handleAddService}
            onEditService={handleEditService}
            onDeleteService={handleDeleteService}
            onToggleServiceStatus={handleToggleServiceStatus}
            onExit={goHome} 
          />
        )}
      </main>

      {view !== 'ADMIN' && (
        <footer className="bg-white border-t py-6 mt-auto">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Prefeitura Municipal - Todos os direitos reservados.</p>
            <p className="text-xs text-gray-400 mt-2">Desenvolvido para atender melhor o cidadão.</p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
