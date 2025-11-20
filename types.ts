
export interface Sector {
  id: string;
  name: string;
  iconName: string; // Lucide icon name mapping
  color: string;
  active: boolean; // Controla se o card aparece para o cidadão
  managerName?: string; // Nome do responsável pelo setor
}

export interface ServiceOption {
  id: string;
  name: string;
  sectorId: string;
  description: string;
  active?: boolean; // Controla se o serviço aparece na lista (Soft Delete/Hide)
}

export interface AIAnalysisResult {
  summary: string;
  urgency: 'Baixa' | 'Média' | 'Alta';
  category: string;
  isClear: boolean;
}

export interface ReportFormData {
  name: string;
  phone: string;
  description: string;
  location: {
    lat: number | null;
    lng: number | null;
    address?: string;
  };
  files: File[];
}

export type ReportStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface ReportHistoryItem {
  date: Date;
  action: string;
  adminName?: string; // Nome do servidor que realizou a ação
  adminJobTitle?: string; // Cargo do servidor
  responseNote?: string; // Texto/Resposta enviado na ação
}

export interface Report extends ReportFormData {
  id: string;
  serviceName: string;
  sectorId: string;
  status: ReportStatus;
  createdAt: Date;
  aiAnalysis?: AIAnalysisResult;
  adminResponse?: string; // Mantido para retrocompatibilidade ou exibição do último status
  history: ReportHistoryItem[];
  // Campos para solicitações internas (Funcionários)
  isInternal?: boolean; 
  authorJobTitle?: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EXECUTIVE';

export interface User {
  id: string;
  name: string;
  nickname: string; // Apelido para exibição no cabeçalho
  jobTitle: string; // Cargo do servidor
  phone: string; // Telefone para contato e preenchimento automático
  cpf: string;
  password: string; // In a real app, this would be hashed/handled by auth provider
  role: UserRole;
  permittedSectors: string[]; // Array of sector IDs allowed for this user
  avatar: string; // URL ou identificador do avatar
  active?: boolean; // Status do usuário (Ativo/Inativo)
}