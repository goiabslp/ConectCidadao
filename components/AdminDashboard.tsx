import React, { useState, useMemo, useEffect } from 'react';
import { Report, ReportStatus, User, UserRole, Sector, ServiceOption, ReportFormData, AIAnalysisResult } from '../types';
import { SectorGrid, ServiceList, SuccessScreen } from './CitizenComponents';
import { ServiceForm } from './ServiceForm';
import { AVAILABLE_AVATARS } from '../constants';
import { 
  LayoutDashboard, Filter, MapPin, Clock, CheckCircle2, AlertCircle, 
  XCircle, ChevronDown, ChevronUp, User as UserIcon, 
  Users, Shield, LogOut, Plus, Trash2, Pencil, Save, Briefcase, Eye, Calendar,
  ArrowLeft, Menu, X, PlusCircle, BadgeCheck, ExternalLink, FileDown, CheckSquare,
  Settings, ToggleLeft, ToggleRight, Box, Layers, UserCog, ChevronRight, MousePointerClick, LockKeyhole, EyeOff, History, MessageSquare, RotateCcw,
  Ban, UserX
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { jsPDF } from "jspdf";

// Helper functions for masking
const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length > 10) {
    // Format: (00) 0 0000-0000
    return v.replace(/^(\d{2})(\d{1})(\d{4})(\d{4}).*/, '($1) $2 $3-$4');
  } else if (v.length > 5) {
    // Format: (00) 0000-0000
    return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (v.length > 2) {
    return v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
  }
  return v;
};

interface AdminDashboardProps {
  reports: Report[];
  users: User[];
  sectors: Sector[];
  services: ServiceOption[];
  onUpdateReport: (id: string, status: ReportStatus, adminResponse: string, user: User) => void;
  onAddReport: (data: ReportFormData, aiResult: AIAnalysisResult | null, serviceName: string, sectorId: string, user?: User, id?: string) => void;
  onAddUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onAddSector: (sector: Sector) => void;
  onEditSector: (sector: Sector) => void;
  onDeleteSector: (sectorId: string) => void;
  onAddService: (service: ServiceOption) => void;
  onEditService: (service: ServiceOption) => void;
  onDeleteService: (serviceId: string) => void;
  onToggleServiceStatus: (serviceId: string) => void;
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  reports, 
  users,
  sectors,
  services,
  onUpdateReport, 
  onAddReport,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onAddSector,
  onEditSector,
  onDeleteSector,
  onAddService,
  onEditService,
  onDeleteService,
  onToggleServiceStatus,
  onExit 
}) => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginCpf, setLoginCpf] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard State
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'USERS' | 'NEW_REQUEST' | 'SETTINGS' | 'PROFILE'>('REPORTS');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State for Report Filtering
  const [selectedSectorView, setSelectedSectorView] = useState<string | null>(null);

  // State for Internal Request Flow
  const [internalRequestStep, setInternalRequestStep] = useState<'SECTORS' | 'SERVICES' | 'FORM' | 'SUCCESS'>('SECTORS');
  const [internalSelectedSector, setInternalSelectedSector] = useState<Sector | null>(null);
  const [internalSelectedService, setInternalSelectedService] = useState<ServiceOption | null>(null);
  const [internalProtocol, setInternalProtocol] = useState<string>('');

  // User Management Form State (Super Admin)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  
  const [newUser, setNewUser] = useState<{
    name: string, 
    nickname: string, 
    jobTitle: string, 
    phone: string, 
    cpf: string, 
    password: string, 
    role: UserRole,
    permittedSectors: string[],
    avatar: string,
    active: boolean
  }>({
    name: '', nickname: '', jobTitle: '', phone: '', cpf: '', password: '', 
    role: 'ADMIN', 
    permittedSectors: [],
    avatar: AVAILABLE_AVATARS[0],
    active: true
  });
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // User Profile Self-Management State
  const [profileForm, setProfileForm] = useState<Partial<User>>({});
  const [profileSuccess, setProfileSuccess] = useState(false);

  // --- SETTINGS MANAGEMENT STATE ---
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [isSectorFormOpen, setIsSectorFormOpen] = useState(false);
  const [manageServicesForSector, setManageServicesForSector] = useState<Sector | null>(null);
  const [editingService, setEditingService] = useState<ServiceOption | null>(null);
  
  const [newSectorForm, setNewSectorForm] = useState<Partial<Sector>>({
    name: '', iconName: 'HelpCircle', color: 'bg-blue-600', active: true, managerName: ''
  });
  
  const [newServiceForm, setNewServiceForm] = useState<Partial<ServiceOption>>({
    name: '', description: ''
  });

  // Reset history expansion when selecting a new report
  useEffect(() => {
    if (selectedReportId) {
      setIsHistoryExpanded(false);
    }
  }, [selectedReportId]);

  // --- PDF GENERATION ---
  const loadLogo = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Erro ao carregar logo para PDF", e);
      return null;
    }
  };

  const generateIndividualPDF = async (report: Report) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Header
    const logoUrl = "https://drive.google.com/uc?export=view&id=1pqmRSZ3g_FFEdumoO3jChkpGqlmW9Wq3";
    const logoData = await loadLogo(logoUrl);
    
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, y, 20, 20);
      y += 5;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Prefeitura Municipal de São José do Goiabal", pageWidth / 2, y + 5, { align: "center" });
    
    y += 25;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Title
    doc.setFontSize(14);
    doc.text(`Relatório de Solicitação: #${report.id}`, margin, y);
    y += 10;

    // Status & Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Data de Abertura: ${new Date(report.createdAt).toLocaleString('pt-BR')}`, margin, y);
    doc.text(`Status Atual: ${getStatusLabel(report.status)}`, pageWidth - margin, y, { align: "right" });
    y += 15;

    // Section: Cidadão
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO SOLICITANTE", margin + 2, y + 5.5);
    y += 15;

    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${report.name} ${report.isInternal ? '(Funcionário/Interno)' : ''}`, margin, y);
    y += 6;
    if (report.authorJobTitle) {
      doc.text(`Cargo: ${report.authorJobTitle}`, margin, y);
      y += 6;
    }
    doc.text(`Telefone: ${report.phone}`, margin, y);
    y += 10;

    // Section: Localização
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("LOCALIZAÇÃO", margin + 2, y + 5.5);
    y += 15;
    
    doc.setFont("helvetica", "normal");
    doc.text(`Endereço/Referência:`, margin, y);
    y += 6;
    const addressLines = doc.splitTextToSize(report.location.address || 'Não informado', pageWidth - (margin * 2));
    doc.text(addressLines, margin, y);
    y += (addressLines.length * 6) + 4;

    if (report.location.lat && report.location.lng) {
      doc.text(`Coordenadas GPS: ${report.location.lat}, ${report.location.lng}`, margin, y);
      y += 10;
    }

    // Section: Detalhes
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("DETALHES DO SERVIÇO", margin + 2, y + 5.5);
    y += 15;

    doc.text(`Serviço: ${report.serviceName}`, margin, y);
    y += 6;
    
    doc.text("Descrição:", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(report.description, pageWidth - (margin * 2));
    doc.text(descLines, margin, y);
    y += (descLines.length * 6) + 10;

    // Section: AI Analysis
    if (report.aiAnalysis) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
      doc.setFont("helvetica", "bold");
      doc.text("ANÁLISE TÉCNICA (IA)", margin + 2, y + 5.5);
      y += 15;

      doc.setFont("helvetica", "normal");
      doc.text(`Resumo: ${report.aiAnalysis.summary}`, margin, y);
      y += 6;
      doc.text(`Categoria: ${report.aiAnalysis.category}`, margin, y);
      y += 6;
      doc.text(`Prioridade: ${report.aiAnalysis.urgency}`, margin, y);
      y += 15;
    }

    // Section: Histórico/Resposta
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("HISTÓRICO DE ATENDIMENTO", margin + 2, y + 5.5);
    y += 15;

    report.history.forEach((item) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${new Date(item.date).toLocaleString('pt-BR')} - ${item.action}`, margin, y);
      y += 5;
      
      if (item.adminName) {
         doc.setFont("helvetica", "normal");
         doc.setFontSize(8);
         doc.text(`Responsável: ${item.adminName} (${item.adminJobTitle || 'N/A'})`, margin, y);
         y += 5;
      }

      if (item.responseNote) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        const noteLines = doc.splitTextToSize(`Msg: "${item.responseNote}"`, pageWidth - (margin * 2));
        doc.text(noteLines, margin, y);
        y += (noteLines.length * 5);
      }
      
      y += 5;
      // Page break check
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.setFontSize(8);
    doc.text("Documento gerado pelo sistema Cidadão Conectado.", pageWidth / 2, 280, { align: "center" });
    doc.save(`solicitacao_${report.id}.pdf`);
  };

  const generateSectorPDF = async (sectorId: string, sectorReports: Report[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    const sector = sectors.find(s => s.id === sectorId);
    const sectorName = sector ? sector.name : "Geral";

    const total = sectorReports.length;
    const active = sectorReports.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;
    const pending = sectorReports.filter(r => r.status === 'PENDING').length;
    const inProgress = sectorReports.filter(r => r.status === 'IN_PROGRESS').length;
    const resolved = sectorReports.filter(r => r.status === 'RESOLVED').length;

    const logoUrl = "https://drive.google.com/uc?export=view&id=1pqmRSZ3g_FFEdumoO3jChkpGqlmW9Wq3";
    const logoData = await loadLogo(logoUrl);
    
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, y, 15, 15);
      y += 2; 
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Gerencial de Setor", pageWidth / 2, y + 5, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Departamento: ${sectorName}`, pageWidth / 2, y + 12, { align: "center" });
    
    y += 25;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Total de Solicitações: ${total}`, margin, y);
    doc.text(`Concluídas: ${resolved}`, margin + 60, y);
    y += 6;
    doc.text(`Em Andamento: ${inProgress}`, margin, y);
    doc.text(`Pendentes: ${pending}`, margin + 60, y);
    y += 15;

    doc.setFillColor(50, 50, 50);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    
    doc.text("Data", margin + 2, y + 5.5);
    doc.text("Status", margin + 25, y + 5.5);
    doc.text("Solicitante", margin + 55, y + 5.5);
    doc.text("Resumo/Descrição", margin + 100, y + 5.5);
    
    y += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    sectorReports.forEach((report) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFillColor(50, 50, 50);
        doc.setTextColor(255, 255, 255);
        doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
        doc.text("Data", margin + 2, y + 5.5);
        doc.text("Status", margin + 25, y + 5.5);
        doc.text("Solicitante", margin + 55, y + 5.5);
        doc.text("Resumo/Descrição", margin + 100, y + 5.5);
        y += 10;
        doc.setTextColor(0, 0, 0);
      }

      const dateStr = new Date(report.createdAt).toLocaleDateString('pt-BR');
      const statusStr = getStatusLabel(report.status);
      const nameStr = report.name.split(' ')[0] + (report.isInternal ? ' (Func)' : '');
      
      let descText = report.aiAnalysis?.summary || report.description;
      if (descText.length > 50) descText = descText.substring(0, 47) + "...";

      doc.text(dateStr, margin + 2, y);
      doc.text(statusStr, margin + 25, y);
      doc.text(nameStr, margin + 55, y);
      doc.text(descText, margin + 100, y);

      y += 8;
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y - 5, pageWidth - margin, y - 5);
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em ${new Date().toLocaleString()}`, margin, 285);
    doc.save(`relatorio_setor_${sectorId}.pdf`);
  };

  // --- AUTH HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.cpf.replace(/\D/g, '') === loginCpf.replace(/\D/g, '') && u.password === loginPass);
    
    if (user) {
      if (user.active === false) {
        setLoginError('Usuário desabilitado. Contate o administrador.');
        return;
      }
      setCurrentUser(user);
      setLoginError('');
      setLoginCpf('');
      setLoginPass('');
      // Inicializa form de perfil com dados do usuário logado
      setProfileForm({ ...user });
    } else {
      setLoginError('CPF ou senha incorretos. Tente novamente.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('REPORTS');
    setSelectedSectorView(null);
  };

  // --- DATA CALCULATIONS & FILTERING ---
  const accessibleSectors = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'EXECUTIVE') return sectors;
    return sectors.filter(s => currentUser.permittedSectors.includes(s.id));
  }, [currentUser, sectors]);

  const sectorStats = useMemo(() => {
    return accessibleSectors.map(sector => {
      const sectorReports = reports.filter(r => r.sectorId === sector.id);
      const total = sectorReports.length;
      const activeCount = sectorReports.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;
      const resolved = sectorReports.filter(r => r.status === 'RESOLVED').length;
      return { ...sector, total, activeCount, resolved };
    });
  }, [accessibleSectors, reports]);

  const filteredReports = useMemo(() => {
    if (!currentUser || !selectedSectorView) return [];

    let visibleReports = reports.filter(r => r.sectorId === selectedSectorView);

    if (statusFilter !== 'ALL') {
      visibleReports = visibleReports.filter(r => r.status === statusFilter);
    }

    // Sort by ID (Increasing order)
    return visibleReports.sort((a, b) => {
      // Extract numeric part of ID for correct numerical sorting
      const idA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const idB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return idA - idB;
    });
  }, [reports, currentUser, selectedSectorView, statusFilter]);

  // --- ACTIONS ---
  const handleUpdateStatus = (id: string, newStatus: ReportStatus) => {
    if (!currentUser) return;
    onUpdateReport(id, newStatus, adminResponse, currentUser);
    setAdminResponse(''); 
    if (newStatus === 'RESOLVED' || newStatus === 'REJECTED') {
      setSelectedReportId(null);
    }
  };

  const handleNoteOnly = (id: string, currentStatus: ReportStatus) => {
    if (!currentUser || !adminResponse.trim()) return;
    onUpdateReport(id, currentStatus, adminResponse, currentUser);
    setAdminResponse('');
  };

  const handleSectorToggle = (sectorId: string) => {
    setNewUser(prev => {
      const currentSectors = prev.permittedSectors;
      if (currentSectors.includes(sectorId)) {
        return { ...prev, permittedSectors: currentSectors.filter(id => id !== sectorId) };
      } else {
        return { ...prev, permittedSectors: [...currentSectors, sectorId] };
      }
    });
  };

  // --- USER MANAGEMENT (SUPER ADMIN) ---
  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.nickname || !newUser.jobTitle || !newUser.cpf || !newUser.password) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (newUser.role === 'ADMIN' && newUser.permittedSectors.length === 0) {
      alert("Para gestores de setor, selecione pelo menos um setor de atuação.");
      return;
    }

    const updatedUserData: User = {
      id: editingId || `user_${Date.now()}`,
      name: newUser.name,
      nickname: newUser.nickname,
      jobTitle: newUser.jobTitle,
      phone: newUser.phone || '',
      cpf: newUser.cpf,
      password: newUser.password,
      role: newUser.role,
      permittedSectors: newUser.role === 'ADMIN' ? newUser.permittedSectors : [],
      avatar: newUser.avatar || AVAILABLE_AVATARS[0],
      active: newUser.active ?? true
    };

    if (editingId) {
      onEditUser(updatedUserData);
      if (currentUser?.id === editingId) {
        setCurrentUser(updatedUserData);
        setProfileForm(updatedUserData);
      }
      alert("Dados atualizados.");
    } else {
      onAddUser(updatedUserData);
      alert("Usuário cadastrado.");
    }
    resetUserForm();
  };

  const handleEditClick = (user: User) => {
    setEditingId(user.id);
    setIsUserFormOpen(true);
    setNewUser({
      name: user.name, 
      nickname: user.nickname || '', 
      jobTitle: user.jobTitle, 
      phone: user.phone || '',
      cpf: user.cpf, 
      password: user.password, 
      role: user.role,
      permittedSectors: user.permittedSectors,
      avatar: user.avatar || AVAILABLE_AVATARS[0],
      active: user.active ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleUserStatus = (user: User) => {
    const updatedUser = { ...user, active: !user.active };
    onEditUser(updatedUser);
  };

  const handleDeleteClick = (user: User) => setUserToDelete(user);
  const confirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };
  const resetUserForm = () => {
    setNewUser({ name: '', nickname: '', jobTitle: '', phone: '', cpf: '', password: '', role: 'ADMIN', permittedSectors: [], avatar: AVAILABLE_AVATARS[0], active: true });
    setEditingId(null);
    setIsUserFormOpen(false);
  };

  // --- USER PROFILE (SELF-MANAGEMENT) ---
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profileForm.nickname || !profileForm.password) {
      alert("Apelido e senha são obrigatórios.");
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      nickname: profileForm.nickname,
      phone: profileForm.phone || '',
      password: profileForm.password,
      avatar: profileForm.avatar || currentUser.avatar,
    };

    onEditUser(updatedUser);
    setCurrentUser(updatedUser);
    
    setProfileSuccess(true);
  };

  const handleNavClick = (tab: 'REPORTS' | 'USERS' | 'NEW_REQUEST' | 'SETTINGS' | 'PROFILE') => {
    setActiveTab(tab);
    setSelectedSectorView(null);
    setIsMobileMenuOpen(false);
    setManageServicesForSector(null);
    setProfileSuccess(false); // Reset success message when switching tabs
    
    if (tab === 'NEW_REQUEST') {
      setInternalRequestStep('SECTORS');
      setInternalSelectedSector(null);
      setInternalSelectedService(null);
    }

    if (tab === 'PROFILE' && currentUser) {
      setProfileForm({ ...currentUser });
    }
  };

  // --- SETTINGS HANDLERS (SECTORS & SERVICES) ---
  const handleSectorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorForm.name || !newSectorForm.iconName || !newSectorForm.color) {
      alert("Preencha nome, ícone e cor.");
      return;
    }

    const sectorData: Sector = {
      id: editingSector?.id || `sec_${Date.now()}`,
      name: newSectorForm.name,
      iconName: newSectorForm.iconName,
      color: newSectorForm.color,
      active: newSectorForm.active ?? true,
      managerName: newSectorForm.managerName
    };

    if (editingSector) {
      onEditSector(sectorData);
    } else {
      onAddSector(sectorData);
    }
    resetSectorForm();
  };

  const resetSectorForm = () => {
    setEditingSector(null);
    setIsSectorFormOpen(false);
    setNewSectorForm({ name: '', iconName: 'HelpCircle', color: 'bg-blue-600', active: true, managerName: '' });
  };

  const openEditSector = (sector: Sector) => {
    setEditingSector(sector);
    setNewSectorForm({ ...sector });
    setIsSectorFormOpen(true);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageServicesForSector) return;
    if (!newServiceForm.name || !newServiceForm.description) {
      alert("Preencha nome e descrição.");
      return;
    }

    const serviceData: ServiceOption = {
      id: editingService?.id || `svc_${Date.now()}`,
      name: newServiceForm.name,
      description: newServiceForm.description,
      sectorId: manageServicesForSector.id,
      active: editingService?.active !== undefined ? editingService.active : true 
    };

    if (editingService) {
      onEditService(serviceData);
    } else {
      onAddService(serviceData);
    }
    resetServiceForm();
  };

  const resetServiceForm = () => {
    setEditingService(null);
    setNewServiceForm({ name: '', description: '' });
  };

  // --- INTERNAL REPORT HANDLERS ---
  const handleInternalSectorSelect = (sector: Sector) => {
    setInternalSelectedSector(sector);
    setInternalRequestStep('SERVICES');
  };
  const handleInternalServiceSelect = (service: ServiceOption) => {
    setInternalSelectedService(service);
    setInternalRequestStep('FORM');
  };
  const handleInternalSubmit = (data: ReportFormData, aiResult: AIAnalysisResult | null) => {
    if (internalSelectedService && internalSelectedSector && currentUser) {
      // Generate protocol ID here to display in success screen
      const protocol = `PREF-${Math.floor(1000 + Math.random() * 9000)}`;
      onAddReport(data, aiResult, internalSelectedService.name, internalSelectedSector.id, currentUser, protocol);
      setInternalProtocol(protocol);
      setInternalRequestStep('SUCCESS');
    }
  };
  const resetInternalFlow = () => {
    setInternalRequestStep('SECTORS');
    setInternalSelectedSector(null);
    setInternalSelectedService(null);
    setInternalProtocol('');
  };

  // --- UI HELPERS ---
  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RESOLVED': return 'bg-green-50 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700';
    }
  };
  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'Alta': return 'text-red-600 font-bold';
      case 'Média': return 'text-yellow-600 font-semibold';
      case 'Baixa': return 'text-green-600 font-medium';
      default: return 'text-gray-500';
    }
  };
  const getStatusLabel = (status: ReportStatus) => {
    switch(status) {
      case 'PENDING': return 'Pendente';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'RESOLVED': return 'Concluído';
      case 'REJECTED': return 'Rejeitado';
      default: return status;
    }
  };

  const getHistoryActionColor = (action: string) => {
    if (action === 'Criado' || action === 'Concluído') return 'text-green-600 bg-green-50 border-green-200';
    if (action === 'Em andamento' || action === 'Atendimento Iniciado' || action === 'Atualização' || action === 'Reaberto') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (action === 'Rejeitado') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // --- VIEW: LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in bg-gradient-to-br from-green-600 via-blue-600 to-yellow-500">
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-md w-full border border-white/20">
          <div className="flex justify-center mb-6">
            <img 
              src="/images/logo1.png" 
              alt="Portal Administrativo" 
              className="w-auto h-24 object-contain drop-shadow-lg"
            />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Portal Administrativo</h2>
          <p className="text-center text-slate-500 mb-6 text-sm">Acesso restrito a servidores.</p>
          
          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 border border-red-100">
              <AlertCircle size={16} /> {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
              <input 
                type="text" 
                value={loginCpf}
                onChange={(e) => setLoginCpf(formatCPF(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
              <input 
                type="password" 
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform active:scale-[0.99]"
            >
              Entrar no Sistema
            </button>
          </form>
          <button 
            onClick={onExit} 
            className="w-full mt-4 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 py-2 hover:bg-slate-50 rounded-lg transition"
          >
            <ArrowLeft size={18} /> Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: DASHBOARD ---
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col shadow-xl 
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3 relative">
           <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
               <Shield className="text-white" size={20} />
             </div>
             <div>
               <h3 className="font-bold text-base leading-tight">Painel Admin</h3>
               <p className="text-[10px] text-slate-400 uppercase tracking-wider">Gestão Municipal</p>
             </div>
           </div>
           
           <button 
             onClick={() => setIsMobileMenuOpen(false)} 
             className="md:hidden text-slate-400 hover:text-white p-1"
           >
             <X size={24} />
           </button>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          <div className="mb-6">
             <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Módulos</p>
             
              <button 
                onClick={() => handleNavClick('NEW_REQUEST')}
                className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg transition text-sm font-medium text-left ${activeTab === 'NEW_REQUEST' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <PlusCircle size={18} className="shrink-0" />
                <span>Nova Solicitação</span>
              </button>

             <button 
                onClick={() => handleNavClick('REPORTS')}
                className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg transition text-sm font-medium text-left ${activeTab === 'REPORTS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <LayoutDashboard size={18} className="shrink-0" />
                <span>Solicitações</span>
              </button>
              
              {currentUser.role === 'SUPER_ADMIN' && (
                <>
                  <button 
                    onClick={() => handleNavClick('USERS')}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg transition text-sm font-medium text-left ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <Users size={18} className="shrink-0" />
                    <span>Gestão de Usuários</span>
                  </button>
                  
                  <button 
                    onClick={() => handleNavClick('SETTINGS')}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg transition text-sm font-medium text-left ${activeTab === 'SETTINGS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <Settings size={18} className="shrink-0" />
                    <span>Gestão de Funcionalidade</span>
                  </button>
                </>
              )}

              <button 
                onClick={() => handleNavClick('PROFILE')}
                className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg transition text-sm font-medium text-left ${activeTab === 'PROFILE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <UserCog size={18} className="shrink-0" />
                <span>Meu Perfil</span>
              </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition border border-transparent hover:border-red-900/30 text-sm font-medium"
          >
            <LogOut size={18} />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-100 relative">
        
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 relative">
           <div className="flex items-center gap-4 z-20">
             <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="md:hidden text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition"
             >
               <Menu size={24} /> 
             </button>
             
             <h2 className="text-lg font-bold text-slate-800 hidden md:block">
                {activeTab === 'REPORTS' 
                  ? (selectedSectorView ? `Setor: ${sectors.find(s => s.id === selectedSectorView)?.name}` : 'Visão Geral da Prefeitura') 
                  : activeTab === 'USERS' ? 'Controle de Acesso' 
                  : activeTab === 'SETTINGS' ? 'Gestão de Funcionalidade'
                  : activeTab === 'PROFILE' ? 'Gestão do Usuário'
                  : 'Registrar Nova Solicitação'}
             </h2>
           </div>

           <div className="absolute inset-x-0 top-0 h-full flex flex-col items-center justify-center pointer-events-none md:hidden z-10">
              <div className="pointer-events-auto flex flex-col items-center bg-white/80 backdrop-blur-[2px] py-1 px-3 rounded-lg">
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    Olá, {currentUser.nickname}
                  </p>
              </div>
           </div>

           <div className="flex items-center justify-end gap-4 pl-0 md:pl-6 flex-1 z-20">
              <div className="flex items-center gap-3 md:border-l border-gray-100 md:pl-6">
                  <div className="hidden md:flex flex-col items-end justify-center">
                     <p className="text-sm font-bold text-slate-900 leading-tight max-w-[140px] sm:max-w-none truncate text-right">
                       Olá, {currentUser.nickname}
                     </p>
                     <div className="mt-0.5">
                       <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wide truncate max-w-[140px] sm:max-w-[150px] block text-center">
                         {currentUser.jobTitle}
                       </span>
                     </div>
                  </div>
                  <div className="relative group cursor-pointer" onClick={() => handleNavClick('PROFILE')}>
                    {currentUser.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt="Avatar" 
                        className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-white transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm border-2 border-white transition-transform group-hover:scale-105
                         ${currentUser.role === 'SUPER_ADMIN' ? 'bg-purple-600' : currentUser.role === 'EXECUTIVE' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                         {currentUser.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
               </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* --- TAB: REPORTS (Existing) --- */}
          {activeTab === 'REPORTS' && (
            <div className="max-w-7xl mx-auto animate-fade-in pb-10">
              {!selectedSectorView ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-800">Solicitações</h1>
                      <p className="text-slate-500 text-sm mt-1">
                        Selecione um departamento para gerenciar as demandas.
                      </p>
                    </div>
                    <button 
                      onClick={() => handleNavClick('NEW_REQUEST')}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition shadow-sm"
                    >
                      <PlusCircle size={18} />
                      Nova Solicitação
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                     {sectorStats.map((sector) => {
                       const IconComponent = (LucideIcons[sector.iconName as keyof typeof LucideIcons] || LucideIcons.HelpCircle) as React.ElementType;
                       return (
                         <div 
                           key={sector.id} 
                           onClick={() => setSelectedSectorView(sector.id)}
                           className={`bg-white rounded-xl border relative overflow-hidden flex flex-col cursor-pointer group hover:shadow-md hover:border-blue-300 hover:ring-2 hover:ring-blue-50 transition-all duration-200 ${!sector.active ? 'opacity-60 border-dashed' : 'border-gray-200'}`}
                         >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100 to-transparent opacity-20 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                           <div className="relative z-10 p-6 pb-0">
                             <div className={`w-12 h-12 ${sector.color} rounded-lg flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                               <IconComponent size={24} />
                             </div>
                             
                             <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">
                               {sector.name}
                             </h3>
                             {sector.managerName && (
                               <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Resp: {sector.managerName}</p>
                             )}
                           </div>
                             
                           <div className="relative z-10 mt-6 grid grid-cols-3 gap-2 pt-4 pb-6 px-6 border-t border-gray-50">
                              <div className="text-center border-r border-gray-100">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
                                <p className="text-xl font-bold text-gray-700">{sector.total}</p>
                              </div>
                              <div className="text-center border-r border-gray-100">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Abertos</p>
                                <p className="text-xl font-bold text-amber-600">{sector.activeCount}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Feitos</p>
                                <p className="text-xl font-bold text-green-600">{sector.resolved}</p>
                              </div>
                           </div>
                         </div>
                       );
                     })}
                  </div>
                </>
              ) : (
                 <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                     <div className="flex items-center gap-3">
                        <button 
                          onClick={() => { setSelectedSectorView(null); setSelectedReportId(null); }}
                          className="p-2 hover:bg-white hover:shadow-sm rounded-full transition text-slate-500 group border border-transparent hover:border-gray-200"
                        >
                          <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                           <h2 className="text-xl font-bold text-slate-800">{sectors.find(s => s.id === selectedSectorView)?.name}</h2>
                           <div className="flex items-center gap-2 text-sm text-slate-500">
                             <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200 uppercase">
                               IA: Prioridade Automática
                             </span>
                          </div>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-3">
                       <button 
                          onClick={() => generateSectorPDF(selectedSectorView, filteredReports)}
                          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-2 rounded-lg text-xs font-bold uppercase transition shadow-sm"
                       >
                         <FileDown size={16} />
                         Baixar PDF
                       </button>
                     </div>
                  </div>

                  <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    <Filter size={16} className="text-gray-400 shrink-0" />
                    {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status as any)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all
                          ${statusFilter === status 
                            ? 'bg-slate-800 text-white shadow-md transform scale-105' 
                            : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'}`}
                      >
                        {status === 'ALL' ? 'Todas' : 
                         status === 'PENDING' ? 'Pendentes' : 
                         status === 'IN_PROGRESS' ? 'Em Andamento' : 'Concluídas'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {filteredReports.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                        <CheckCircle2 className="mx-auto text-gray-400 mb-4" size={32} />
                        <p className="text-gray-500 font-medium">Nenhuma solicitação encontrada neste filtro.</p>
                      </div>
                    ) : (
                      filteredReports.map((report) => {
                        const isSelected = selectedReportId === report.id;
                        return (
                          <div 
                            key={report.id} 
                            className={`group bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden hover:shadow-md
                              ${isSelected ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200 hover:border-blue-200'}`}
                          >
                            <div 
                              className="p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center cursor-pointer"
                              onClick={() => setSelectedReportId(isSelected ? null : report.id)}
                            >
                              <div className="min-w-0 space-y-2">
                                <div className="flex justify-between items-start mb-0.5">
                                   <div className="flex flex-wrap items-center gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-wide uppercase ${getStatusColor(report.status)}`}>
                                        {getStatusLabel(report.status)}
                                      </span>
                                      <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1 ml-1">
                                        <Calendar size={12} />
                                        {new Date(report.createdAt).toLocaleDateString()}
                                      </span>
                                   </div>
                                   <span className="text-[10px] font-mono font-bold text-gray-400">#{report.id}</span>
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-slate-800 truncate pr-4 leading-tight">
                                    {report.serviceName}
                                  </h3>
                                  <p className="text-sm text-gray-500 truncate pr-4 mt-1">
                                    {report.description}
                                  </p>
                                  {report.isInternal && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                                      <BadgeCheck size={14} className="text-indigo-600" />
                                      <span>Solicitado por: <strong>{report.name}</strong> {report.authorJobTitle ? `(${report.authorJobTitle})` : ''}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 md:gap-1 md:pl-6 md:border-l md:border-gray-100 md:min-w-[150px] md:h-full">
                                 {report.aiAnalysis && (
                                   <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border 
                                     ${report.aiAnalysis.urgency === 'Alta' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                     <span className="text-[10px] text-gray-400 font-bold uppercase">Prioridade</span>
                                     <span className={`text-xs ${getUrgencyColor(report.aiAnalysis.urgency)}`}>
                                       {report.aiAnalysis.urgency}
                                     </span>
                                   </div>
                                 )}
                                 <div className={`hidden md:flex p-2 rounded-full text-gray-300 transition-transform duration-300 group-hover:text-blue-500 ${isSelected ? 'rotate-180 text-blue-600 bg-blue-50' : ''}`}>
                                   <ChevronDown size={20} />
                                 </div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="bg-slate-50 p-6 border-t border-blue-100 animate-fade-in">
                                <div className="flex justify-end mb-4">
                                  <button 
                                    onClick={() => generateIndividualPDF(report)}
                                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 hover:border-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition shadow-sm"
                                  >
                                    <FileDown size={16} />
                                    Baixar PDF
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                      <UserIcon size={14} /> Dados do Cidadão
                                    </h4>
                                    <div className="space-y-3 text-sm">
                                       <div className="flex justify-between border-b border-gray-50 pb-2">
                                         <span className="text-gray-500">Nome:</span>
                                         <div className="text-right">
                                           <span className="font-semibold text-gray-800 block">{report.name}</span>
                                         </div>
                                       </div>
                                       <div className="flex justify-between border-b border-gray-50 pb-2">
                                         <span className="text-gray-500">Telefone:</span>
                                         <span className="font-semibold text-gray-800">{report.phone}</span>
                                       </div>
                                       <div className="pt-2">
                                          <span className="text-gray-500 block mb-1">Endereço:</span>
                                          {report.location.address || (report.location.lat && report.location.lng) ? (
                                            <a 
                                              href={`https://www.google.com/maps/search/?api=1&query=${
                                                report.location.lat && report.location.lng 
                                                  ? `${report.location.lat},${report.location.lng}` 
                                                  : encodeURIComponent(report.location.address || '')
                                              }`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex gap-2 items-start bg-gray-50 hover:bg-blue-50 p-2 rounded text-gray-700 hover:text-blue-700 transition-colors cursor-pointer group"
                                              title="Abrir localização no Mapa"
                                            >
                                              <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0 group-hover:text-blue-500" />
                                              <span className="text-sm flex-1 underline decoration-dotted decoration-gray-300 group-hover:decoration-blue-300">
                                                 {report.location.address || `Coordenadas: ${report.location.lat}, ${report.location.lng}`}
                                              </span>
                                              <ExternalLink size={14} className="text-gray-300 group-hover:text-blue-400 mt-0.5" />
                                            </a>
                                          ) : (
                                            <div className="flex gap-2 items-start bg-gray-50 p-2 rounded text-gray-700">
                                              <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                              <span className="text-sm">Localização não informada</span>
                                            </div>
                                          )}
                                       </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-4">
                                     {report.aiAnalysis && (
                                       <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-purple-500">
                                         <h4 className="text-xs font-bold text-purple-600 uppercase mb-2 flex items-center gap-2">
                                           <Shield size={14} /> Análise Inteligente
                                         </h4>
                                         <p className="text-sm font-medium text-gray-800 mb-1">{report.aiAnalysis.summary}</p>
                                         <div className="flex gap-3 mt-2">
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                              {report.aiAnalysis.category}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded font-bold
                                              ${report.aiAnalysis.urgency === 'Alta' ? 'bg-red-100 text-red-700' : 
                                                report.aiAnalysis.urgency === 'Média' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                              Urgência: {report.aiAnalysis.urgency}
                                            </span>
                                         </div>
                                       </div>
                                     )}

                                     <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Descrição Original</h4>
                                        <p className="text-sm text-gray-600 italic">"{report.description}"</p>
                                     </div>
                                  </div>
                                </div>

                                {/* HISTORY SECTION - Collapsible */}
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
                                   <div className="flex justify-between items-center mb-4">
                                       <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                         <History size={14} /> Histórico de Movimentações
                                       </h4>
                                       {report.history.length > 3 && (
                                         <button 
                                           onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                                           className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 transition"
                                         >
                                           {isHistoryExpanded ? 'Recolher' : 'Ver Tudo'}
                                           {isHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                         </button>
                                       )}
                                   </div>
                                   
                                   <div className={`relative transition-all duration-500 ease-in-out ${
                                       !isHistoryExpanded && report.history.length > 3 ? 'max-h-[200px] overflow-hidden' : ''
                                   }`}>
                                       <div className="space-y-0 relative before:absolute before:inset-0 before:ml-2.5 before:w-0.5 before:bg-gray-100">
                                          {report.history.map((item, index) => (
                                            <div key={index} className="relative pl-8 pb-6 last:pb-0 group">
                                               <div className="absolute left-0 top-0 w-5 h-5 bg-white border-2 border-blue-100 rounded-full flex items-center justify-center group-last:border-blue-500">
                                                 <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                               </div>
                                               <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
                                                 <div className="flex items-center gap-2">
                                                   <span className={`text-xs font-bold px-2 py-0.5 rounded border mb-1 sm:mb-0 inline-block w-fit ${getHistoryActionColor(item.action)}`}>
                                                     {item.action}
                                                   </span>
                                                   {(item.action === 'Criado' || item.action === 'Concluído') && (
                                                     <span className="text-[10px] text-gray-500 font-mono opacity-75">
                                                       #{report.id}
                                                     </span>
                                                   )}
                                                 </div>
                                                 <span className="text-xs text-gray-400 flex items-center gap-1">
                                                   <Clock size={10} />
                                                   {new Date(item.date).toLocaleString('pt-BR')}
                                                 </span>
                                               </div>
                                               {item.adminName && (
                                                 <div className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                                                   <UserIcon size={10} />
                                                   {item.adminName} <span className="text-gray-400 font-normal">({item.adminJobTitle || 'Cargo não inf.'})</span>
                                                 </div>
                                               )}
                                               {item.responseNote && (
                                                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm text-gray-600 italic">
                                                   <MessageSquare size={12} className="inline mr-1.5 text-gray-400" />
                                                   "{item.responseNote}"
                                                 </div>
                                               )}
                                            </div>
                                          ))}
                                       </div>

                                       {/* Gradient Overlay when collapsed */}
                                       {!isHistoryExpanded && report.history.length > 3 && (
                                         <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent pointer-events-none flex items-end justify-center pb-2">
                                         </div>
                                       )}
                                   </div>
                                </div>

                                {currentUser.role !== 'EXECUTIVE' ? (
                                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-800 mb-4">
                                      {report.status === 'PENDING' ? 'Ações Disponíveis' : 'Atualizar Solicitação'}
                                    </h4>
                                    
                                    {report.status !== 'PENDING' && report.status !== 'REJECTED' && (
                                      <textarea 
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-slate-500 outline-none mb-4 transition-colors bg-gray-50 text-gray-900"
                                        rows={2}
                                        value={adminResponse}
                                        onChange={(e) => setAdminResponse(e.target.value)}
                                        placeholder="Digite um detalhe sobre a atualização..."
                                      />
                                    )}

                                    <div className="flex flex-wrap gap-3 items-center">
                                       {/* PENDING STATE: Only 2 buttons allowed */}
                                       {report.status === 'PENDING' ? (
                                          <>
                                            <button onClick={() => handleUpdateStatus(report.id, 'IN_PROGRESS')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                                              <Clock size={16} /> Iniciar Atendimento
                                            </button>
                                            <div className="flex-1"></div>
                                            <button onClick={() => handleUpdateStatus(report.id, 'REJECTED')} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition border border-red-200">
                                              <XCircle size={16} /> Rejeitar Pedido
                                            </button>
                                          </>
                                       ) : (
                                          /* STANDARD FLOW for In Progress, Resolved, Rejected */
                                          <>
                                            {adminResponse.length > 0 && (report.status === 'IN_PROGRESS') && (
                                                <button onClick={() => handleNoteOnly(report.id, report.status)} className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                                                  <Save size={16} /> Salvar Nota
                                                </button>
                                            )}

                                            <div className="flex-1"></div>

                                            {report.status === 'IN_PROGRESS' && (
                                                <button onClick={() => handleUpdateStatus(report.id, 'RESOLVED')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                                                  <CheckCircle2 size={16} /> Concluir
                                                </button>
                                            )}

                                            {/* SUPER ADMIN REOPEN */}
                                            {(report.status === 'RESOLVED' || report.status === 'REJECTED') && currentUser.role === 'SUPER_ADMIN' && (
                                              <button onClick={() => handleUpdateStatus(report.id, 'IN_PROGRESS')} className="flex items-center gap-2 bg-orange-50 text-orange-700 hover:bg-orange-100 px-4 py-2 rounded-lg text-sm font-medium transition border border-orange-200">
                                                 <RotateCcw size={16} /> Reabrir Solicitação
                                              </button>
                                            )}
                                          </>
                                       )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-700 text-sm">
                                      <Eye size={20} />
                                      <span>Modo de Visualização: Apenas leitura.</span>
                                    </div>
                                    
                                    {/* EXECUTIVE REOPEN */}
                                    {(report.status === 'RESOLVED' || report.status === 'REJECTED') && (
                                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                         <span className="text-sm font-bold text-gray-700">Ação Executiva</span>
                                         <button 
                                           onClick={() => handleUpdateStatus(report.id, 'IN_PROGRESS')} 
                                           className="flex items-center gap-2 bg-orange-50 text-orange-700 hover:bg-orange-100 px-4 py-2 rounded-lg text-sm font-medium transition border border-orange-200"
                                         >
                                            <RotateCcw size={16} /> Reabrir Solicitação
                                         </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                 </>
              )}
            </div>
          )}

          {/* --- TAB: NEW REQUEST --- */}
          {activeTab === 'NEW_REQUEST' && (
             <div className="max-w-3xl mx-auto animate-fade-in">
              <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-blue-900">Nova Solicitação Interna</h2>
                  <p className="text-sm text-blue-700">
                    Registrando demanda como <strong>{currentUser.name}</strong>.
                  </p>
                </div>
              </div>

              {internalRequestStep === 'SECTORS' && (
                <SectorGrid sectors={sectors.filter(s => s.active)} onSelect={handleInternalSectorSelect} />
              )}

              {internalRequestStep === 'SERVICES' && internalSelectedSector && (
                <ServiceList 
                  sector={internalSelectedSector}
                  services={services} 
                  onSelect={handleInternalServiceSelect} 
                  onBack={() => setInternalRequestStep('SERVICES')}
                />
              )}

              {internalRequestStep === 'FORM' && internalSelectedService && (
                <ServiceForm 
                  service={internalSelectedService}
                  onBack={() => setInternalRequestStep('SERVICES')}
                  onSubmit={handleInternalSubmit}
                  readOnlyUserFields={true}
                  initialData={{
                    name: currentUser.name,
                    phone: currentUser.phone || ''
                  }}
                />
              )}

              {internalRequestStep === 'SUCCESS' && (
                <SuccessScreen onHome={resetInternalFlow} protocolId={internalProtocol} />
              )}
            </div>
          )}

          {/* --- TAB: USER MANAGEMENT (SUPER ADMIN ONLY) --- */}
          {activeTab === 'USERS' && currentUser.role === 'SUPER_ADMIN' && (
            <div className="max-w-5xl mx-auto animate-fade-in pb-10">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Gerenciar Equipe</h1>
              </div>
              
              <div className={`bg-white rounded-xl shadow-sm border mb-8 transition-all overflow-hidden ${editingId ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                 <div 
                   onClick={() => !editingId && setIsUserFormOpen(!isUserFormOpen)}
                   className={`p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${editingId ? 'cursor-default' : ''}`}
                 >
                    <h3 className={`font-bold flex items-center gap-2 ${editingId ? 'text-blue-600' : 'text-gray-700'}`}>
                      {editingId ? <Pencil size={20} /> : <Plus size={20} />} 
                      {editingId ? 'Editar Servidor' : 'Novo Servidor'}
                    </h3>
                    {!editingId && (
                      <div className={`text-gray-400 transition-transform duration-300 ${isUserFormOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown size={20} />
                      </div>
                    )}
                 </div>

                 {(isUserFormOpen || editingId) && (
                   <form onSubmit={handleUserSubmit} className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 mt-2 animate-fade-in">
                     <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1">Nome Completo</label>
                       <input type="text" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1">Apelido</label>
                       <input type="text" required value={newUser.nickname} onChange={e => setNewUser({...newUser, nickname: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1">Cargo / Função</label>
                       <input type="text" required value={newUser.jobTitle} onChange={e => setNewUser({...newUser, jobTitle: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1">Telefone / WhatsApp</label>
                       <input 
                         type="text" 
                         required 
                         value={newUser.phone} 
                         onChange={e => setNewUser({...newUser, phone: formatPhone(e.target.value)})} 
                         className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" 
                         placeholder="(00) 0 0000-0000"
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1">CPF</label>
                       <input 
                         type="text" 
                         required 
                         value={newUser.cpf} 
                         onChange={e => setNewUser({...newUser, cpf: formatCPF(e.target.value)})} 
                         className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" 
                         placeholder="000.000.000-00"
                         maxLength={14}
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 mb-1">Senha</label>
                       <input type="text" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
                     </div>
                     
                     <div className="md:col-span-2 mt-4 mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Permissões / Função</label>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              
                              {/* Option 1: Gestor de Setor */}
                              <div 
                                onClick={() => setNewUser({...newUser, role: 'ADMIN'})}
                                className={`cursor-pointer relative group flex flex-col p-4 rounded-xl border-2 transition-all duration-200 
                                  ${newUser.role === 'ADMIN' 
                                    ? 'border-blue-500 bg-white shadow-lg scale-[1.02]' 
                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'}`}
                              >
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors
                                   ${newUser.role === 'ADMIN' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                                    <UserCog size={20} />
                                 </div>
                                 <h4 className={`font-bold text-sm mb-1 ${newUser.role === 'ADMIN' ? 'text-blue-700' : 'text-gray-700'}`}>Gestor de Setor</h4>
                                 <p className="text-xs text-gray-500 leading-relaxed">Gerencia e responde demandas de departamentos específicos.</p>
                                 
                                 {newUser.role === 'ADMIN' && (
                                   <div className="absolute top-3 right-3 text-blue-500 animate-scale-in">
                                     <CheckCircle2 size={20} fill="currentColor" className="text-white" />
                                   </div>
                                 )}
                              </div>

                              {/* Option 2: Super Admin */}
                              <div 
                                onClick={() => setNewUser({...newUser, role: 'SUPER_ADMIN'})}
                                className={`cursor-pointer relative group flex flex-col p-4 rounded-xl border-2 transition-all duration-200 
                                  ${newUser.role === 'SUPER_ADMIN' 
                                    ? 'border-purple-500 bg-white shadow-lg scale-[1.02]' 
                                    : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'}`}
                              >
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors
                                   ${newUser.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500'}`}>
                                    <Shield size={20} />
                                 </div>
                                 <h4 className={`font-bold text-sm mb-1 ${newUser.role === 'SUPER_ADMIN' ? 'text-purple-700' : 'text-gray-700'}`}>Super Admin</h4>
                                 <p className="text-xs text-gray-500 leading-relaxed">Acesso total ao sistema, usuários e configurações.</p>
                                 
                                 {newUser.role === 'SUPER_ADMIN' && (
                                   <div className="absolute top-3 right-3 text-purple-500 animate-scale-in">
                                     <CheckCircle2 size={20} fill="currentColor" className="text-white" />
                                   </div>
                                 )}
                              </div>

                              {/* Option 3: Executive */}
                              <div 
                                onClick={() => setNewUser({...newUser, role: 'EXECUTIVE'})}
                                className={`cursor-pointer relative group flex flex-col p-4 rounded-xl border-2 transition-all duration-200 
                                  ${newUser.role === 'EXECUTIVE' 
                                    ? 'border-emerald-500 bg-white shadow-lg scale-[1.02]' 
                                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md'}`}
                              >
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors
                                   ${newUser.role === 'EXECUTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
                                    <Eye size={20} />
                                 </div>
                                 <h4 className={`font-bold text-sm mb-1 ${newUser.role === 'EXECUTIVE' ? 'text-emerald-700' : 'text-gray-700'}`}>Executivo</h4>
                                 <p className="text-xs text-gray-500 leading-relaxed">Apenas visualização de relatórios e estatísticas.</p>
                                 
                                 {newUser.role === 'EXECUTIVE' && (
                                   <div className="absolute top-3 right-3 text-emerald-500 animate-scale-in">
                                     <CheckCircle2 size={20} fill="currentColor" className="text-white" />
                                   </div>
                                 )}
                              </div>

                          </div>

                          {/* Sector Selection for Admin */}
                          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${newUser.role === 'ADMIN' ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                             <div className="border-t border-gray-200 pt-4">
                               <label className="block text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
                                 <Layers size={14} /> Selecione os setores de atuação
                               </label>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                 {sectors.map(s => (
                                   <div 
                                     key={s.id} 
                                     onClick={() => handleSectorToggle(s.id)}
                                     className={`px-3 py-2 text-sm cursor-pointer rounded-lg border flex items-center justify-between transition-all
                                        ${newUser.permittedSectors.includes(s.id) 
                                          ? 'bg-blue-50 border-blue-200 text-blue-800' 
                                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                   >
                                     <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${newUser.permittedSectors.includes(s.id) ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                        <span className="truncate">{s.name}</span>
                                     </div>
                                     <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${newUser.permittedSectors.includes(s.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                                        {newUser.permittedSectors.includes(s.id) && <LucideIcons.Check size={12} className="text-white" />}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                          </div>
                        </div>
                     </div>

                     <div className="md:col-span-2 flex flex-wrap justify-end gap-3 mt-4">
                       {editingId && (
                         <>
                          <button 
                            type="button"
                            onClick={resetUserForm}
                            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold transition"
                          >
                            Cancelar
                          </button>
                         </>
                       )}
                       <button 
                         type="submit"
                         className="px-8 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition shadow-md"
                       >
                         {editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                       </button>
                     </div>
                   </form>
                 )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map(user => (
                  <div 
                    key={user.id} 
                    onClick={() => handleEditClick(user)}
                    className={`p-4 rounded-xl shadow-sm border flex items-center gap-4 transition-all cursor-pointer group/card
                      ${user.active === false ? 'bg-gray-50 border-gray-200 opacity-75 grayscale-[0.5]' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}`}
                  >
                     {user.avatar ? (
                       <div className="relative">
                         <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full bg-gray-100 object-cover" />
                         {user.active === false && (
                            <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center backdrop-blur-[1px]">
                               <Ban size={20} className="text-white" />
                            </div>
                         )}
                       </div>
                     ) : (
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${user.active === false ? 'bg-gray-400 text-white' : 'bg-slate-800 text-white'}`}>
                         {user.name.charAt(0)}
                       </div>
                     )}
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start mb-0.5">
                         <h4 className={`font-bold truncate pr-2 ${user.active === false ? 'text-gray-500 line-through' : 'text-gray-800 group-hover/card:text-blue-700 transition-colors'}`}>{user.name}</h4>
                         {user.active === false && (
                             <span className="text-[10px] px-2 py-0.5 rounded font-bold border uppercase bg-gray-100 text-gray-500 border-gray-200">
                               Inativo
                             </span>
                         )}
                       </div>
                       <span className={`text-[10px] px-2 py-0.5 rounded font-bold border uppercase inline-block mb-1
                           ${user.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                             user.role === 'EXECUTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                             'bg-blue-50 text-blue-700 border-blue-100'}`}>
                           {user.role === 'SUPER_ADMIN' ? 'Admin Geral' : user.role === 'EXECUTIVE' ? 'Executivo' : 'Gestor'}
                       </span>
                       <p className="text-sm text-gray-500 truncate">{user.jobTitle}</p>
                     </div>
                     
                     {/* Action Buttons directly on card */}
                     <div className="flex flex-col gap-1 border-l pl-2 border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleEditClick(user); }}
                           className="p-1.5 text-blue-400 hover:bg-blue-50 hover:text-blue-600 rounded transition"
                           title="Editar Usuário"
                         >
                           <Pencil size={16} />
                         </button>
                         
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleToggleUserStatus(user); }}
                           className={`p-1.5 rounded transition ${user.active === false ? 'text-green-500 hover:bg-green-50 hover:text-green-700' : 'text-orange-400 hover:bg-orange-50 hover:text-orange-600'}`}
                           title={user.active === false ? "Habilitar Usuário" : "Desabilitar Usuário"}
                         >
                           {user.active === false ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                         </button>

                         <button 
                           onClick={(e) => { e.stopPropagation(); handleDeleteClick(user); }}
                           className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition"
                           title="Excluir Usuário"
                         >
                           <Trash2 size={16} />
                         </button>
                     </div>
                  </div>
                ))}
              </div>

              {/* Delete Confirmation Modal */}
              {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in">
                     <div className="text-center">
                       <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                         <AlertCircle size={32} className="text-red-600" />
                       </div>
                       <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Usuário?</h3>
                       <p className="text-gray-500 text-sm mb-6">
                         Tem certeza que deseja remover <strong>{userToDelete.name}</strong>? Esta ação não pode ser desfeita.
                       </p>
                       <div className="flex gap-3">
                         <button 
                           onClick={() => setUserToDelete(null)}
                           className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition"
                         >
                           Cancelar
                         </button>
                         <button 
                           onClick={confirmDelete}
                           className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition"
                         >
                           Sim, Excluir
                         </button>
                       </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- TAB: SETTINGS (SECTORS & SERVICES) --- */}
          {activeTab === 'SETTINGS' && currentUser.role === 'SUPER_ADMIN' && (
               <div className="max-w-5xl mx-auto animate-fade-in pb-10">
               {!manageServicesForSector ? (
                 <>
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                      <div>
                        <h1 className="text-2xl font-bold text-slate-800">Gestão de Setores</h1>
                        <p className="text-slate-500 text-sm mt-1">Adicione ou edite departamentos e seus serviços.</p>
                      </div>
                      <button 
                        onClick={() => { resetSectorForm(); setIsSectorFormOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-md transition"
                      >
                        <Plus size={20} />
                        Novo Setor
                      </button>
                   </div>

                   {/* New Sector Form Modal */}
                   {isSectorFormOpen && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                       <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-scale-in">
                         <div className="flex justify-between items-center mb-6 border-b pb-4">
                           <h3 className="text-xl font-bold text-gray-800">
                             {editingSector ? 'Editar Setor' : 'Novo Departamento'}
                           </h3>
                           <button onClick={resetSectorForm} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                         </div>
                         <form onSubmit={handleSectorSubmit} className="space-y-4">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Setor</label>
                              <input 
                                type="text" 
                                required 
                                value={newSectorForm.name}
                                onChange={e => setNewSectorForm({...newSectorForm, name: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Obras e Infraestrutura"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Ícone (Lucide)</label>
                                <input 
                                  type="text" 
                                  required 
                                  value={newSectorForm.iconName}
                                  onChange={e => setNewSectorForm({...newSectorForm, iconName: e.target.value})}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="Ex: Hammer"
                                />
                                <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                  Ver ícones <ExternalLink size={10} />
                                </a>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Cor (Tailwind)</label>
                                <input 
                                  type="text" 
                                  required 
                                  value={newSectorForm.color}
                                  onChange={e => setNewSectorForm({...newSectorForm, color: e.target.value})}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="Ex: bg-blue-600"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Responsável (Opcional)</label>
                              <input 
                                type="text" 
                                value={newSectorForm.managerName}
                                onChange={e => setNewSectorForm({...newSectorForm, managerName: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Eng. Carlos"
                              />
                            </div>
                            
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <button 
                                type="button"
                                onClick={() => setNewSectorForm({...newSectorForm, active: !newSectorForm.active})}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${newSectorForm.active ? 'bg-blue-600' : 'bg-gray-200'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${newSectorForm.active ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                              <span className="text-sm font-medium text-gray-700">Setor Ativo no App</span>
                            </div>

                            <div className="flex justify-end pt-4">
                              <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-bold transition shadow-lg">
                                {editingSector ? 'Salvar Alterações' : 'Criar Setor'}
                              </button>
                            </div>
                         </form>
                       </div>
                     </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectors.map((sector) => {
                         const IconComponent = (LucideIcons[sector.iconName as keyof typeof LucideIcons] || LucideIcons.HelpCircle) as React.ElementType;
                         return (
                           <div 
                             key={sector.id} 
                             onClick={() => setManageServicesForSector(sector)}
                             className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer group transition-all relative"
                           >
                             <div className="flex items-start justify-between mb-4">
                                <div className={`w-10 h-10 ${sector.color} rounded-lg flex items-center justify-center text-white shadow-sm`}>
                                  <IconComponent size={20} />
                                </div>
                                {!sector.active && (
                                  <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-gray-200">
                                    Inativo
                                  </span>
                                )}
                             </div>
                             
                             <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">{sector.name}</h3>
                             <p className="text-xs text-gray-500 mb-4">
                               {sector.managerName ? `Resp: ${sector.managerName}` : 'Sem responsável definido'}
                             </p>
                             
                             <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                   <Layers size={14} />
                                   <span>{services.filter(s => s.sectorId === sector.id).length} Serviços</span>
                                </div>
                                
                                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); openEditSector(sector); }}
                                     className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded transition"
                                     title="Editar"
                                   >
                                     <Pencil size={16} />
                                   </button>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); onDeleteSector(sector.id); }}
                                     className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded transition"
                                     title="Excluir"
                                   >
                                     <Trash2 size={16} />
                                   </button>
                                </div>
                             </div>
                           </div>
                         );
                      })}
                   </div>
                 </>
               ) : (
                 // --- SUB-VIEW: MANAGE SERVICES ---
                 <div className="animate-fade-in">
                    <button 
                      onClick={() => setManageServicesForSector(null)} 
                      className="group flex items-center gap-2 px-5 py-2.5 mb-6 text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 hover:text-blue-600 transition-all duration-200 font-medium"
                    >
                      <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
                      Voltar para Setores
                    </button>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                       <div className={`p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50`}>
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 ${manageServicesForSector.color} rounded-xl flex items-center justify-center text-white shadow-md`}>
                               {React.createElement((LucideIcons[manageServicesForSector.iconName as keyof typeof LucideIcons] || LucideIcons.HelpCircle) as React.ElementType, { size: 24 })}
                             </div>
                             <div>
                               <h2 className="text-xl font-bold text-gray-800">{manageServicesForSector.name}</h2>
                               <p className="text-sm text-gray-500">Gerenciamento de catálogo de serviços</p>
                             </div>
                          </div>
                       </div>

                       <div className="p-6 bg-slate-50 border-b border-gray-200">
                          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                             {editingService ? 'Editar Serviço' : 'Adicionar Novo Serviço'}
                          </h3>
                          <form onSubmit={handleServiceSubmit} className="flex flex-col md:flex-row gap-4 items-start">
                             <div className="flex-1 w-full">
                               <input 
                                  type="text" 
                                  placeholder="Nome do Serviço (Ex: Buraco na Via)"
                                  required
                                  value={newServiceForm.name}
                                  onChange={e => setNewServiceForm({...newServiceForm, name: e.target.value})}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                             </div>
                             <div className="flex-[2] w-full">
                               <input 
                                  type="text" 
                                  placeholder="Descrição curta para o cidadão"
                                  required
                                  value={newServiceForm.description}
                                  onChange={e => setNewServiceForm({...newServiceForm, description: e.target.value})}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                             </div>
                             <div className="flex gap-2 shrink-0">
                               {editingService && (
                                 <button 
                                   type="button" 
                                   onClick={resetServiceForm}
                                   className="px-4 py-2.5 bg-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-300 transition text-sm"
                                 >
                                   Cancelar
                                 </button>
                               )}
                               <button 
                                 type="submit"
                                 className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center gap-2 text-sm"
                               >
                                 {editingService ? <Save size={16} /> : <Plus size={16} />}
                                 {editingService ? 'Salvar' : 'Adicionar'}
                               </button>
                             </div>
                          </form>
                       </div>

                       <div className="divide-y divide-gray-100">
                          {services.filter(s => s.sectorId === manageServicesForSector.id).length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                              <p>Nenhum serviço cadastrado neste setor.</p>
                            </div>
                          ) : (
                            services.filter(s => s.sectorId === manageServicesForSector.id).map(service => (
                              <div 
                                key={service.id} 
                                className={`p-4 flex items-center justify-between transition group ${service.active === false ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'}`}
                              >
                                 <div className="flex items-center gap-3">
                                   {service.active === false && (
                                     <EyeOff size={16} className="text-red-400" />
                                   )}
                                   <div>
                                     <h4 className={`font-bold ${service.active === false ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-800'}`}>
                                       {service.name}
                                     </h4>
                                     <p className="text-sm text-gray-500">{service.description}</p>
                                   </div>
                                 </div>
                                 <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                   <button 
                                     onClick={() => onToggleServiceStatus(service.id)}
                                     className={`p-2 rounded transition ${service.active === false ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                     title={service.active === false ? "Ativar serviço" : "Ocultar serviço"}
                                   >
                                     {service.active === false ? <EyeOff size={16} /> : <Eye size={16} />}
                                   </button>
                                   <button 
                                     onClick={() => { setEditingService(service); setNewServiceForm({ name: service.name, description: service.description }); }}
                                     className="p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded transition"
                                   >
                                     <Pencil size={16} />
                                   </button>
                                   <button 
                                     onClick={() => onDeleteService(service.id)}
                                     className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded transition"
                                   >
                                     <Trash2 size={16} />
                                   </button>
                                 </div>
                              </div>
                            ))
                          )}
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* --- TAB: PROFILE --- */}
          {activeTab === 'PROFILE' && (
             <div className="max-w-2xl mx-auto animate-fade-in pb-10 relative">
              
              {/* Success Modal */}
              {profileSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                  <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in flex flex-col items-center text-center border border-gray-100">
                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <CheckCircle2 size={32} className="text-green-600" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Atualização Concluída!</h3>
                     <p className="text-gray-500 text-sm mb-6">
                       Os dados do seu perfil foram alterados com sucesso.
                     </p>
                     <button 
                       onClick={() => setProfileSuccess(false)}
                       className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition shadow-lg transform active:scale-[0.98]"
                     >
                       Fechar
                     </button>
                  </div>
                </div>
              )}

              <h1 className="text-2xl font-bold text-slate-800 mb-2">Meu Perfil</h1>
              <p className="text-slate-500 text-sm mb-8">Gerencie seus dados de acesso.</p>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="bg-slate-900 p-6 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-700 mb-4 overflow-hidden shadow-lg">
                       {currentUser.avatar ? (
                          <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                            {currentUser.name.charAt(0)}
                          </div>
                       )}
                    </div>
                    <h2 className="text-xl font-bold text-white">{currentUser.name}</h2>
                    <span className="text-slate-400 text-sm">{currentUser.jobTitle}</span>
                 </div>

                 <form onSubmit={handleProfileUpdate} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apelido (Display)</label>
                         <input 
                           type="text" 
                           value={profileForm.nickname || ''}
                           onChange={e => setProfileForm({...profileForm, nickname: e.target.value})}
                           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         />
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                         <input 
                           type="text" 
                           value={profileForm.phone || ''}
                           onChange={e => setProfileForm({...profileForm, phone: formatPhone(e.target.value)})}
                           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="(00) 0 0000-0000"
                         />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha de Acesso</label>
                       <div className="relative">
                         <input 
                           type="text" 
                           value={profileForm.password || ''}
                           onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         />
                         <LockKeyhole className="absolute right-3 top-2.5 text-gray-400" size={16} />
                       </div>
                       <p className="text-xs text-gray-400 mt-1">Altere apenas se desejar mudar sua senha atual.</p>
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Escolha um Avatar</label>
                       <div className="flex flex-wrap gap-3">
                         {AVAILABLE_AVATARS.map((avatarUrl, idx) => (
                            <img 
                              key={idx}
                              src={avatarUrl}
                              alt={`Avatar ${idx}`}
                              onClick={() => setProfileForm({...profileForm, avatar: avatarUrl})}
                              className={`w-10 h-10 rounded-full cursor-pointer hover:scale-110 transition border-2 
                                ${profileForm.avatar === avatarUrl ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}
                            />
                         ))}
                       </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                       <button 
                         type="submit"
                         className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition flex items-center gap-2"
                       >
                         <Save size={18} /> Salvar Perfil
                       </button>
                    </div>
                 </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Global Styles for Animations */}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-scale-in { animation: scaleIn 0.2s ease-out; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};