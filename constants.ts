
import { Sector, ServiceOption } from './types';

export const AVAILABLE_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Precious",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mittens",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Trouble",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Boo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Abby",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bandit",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Coco",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Annie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bubba",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=George"
];

export const SECTORS: Sector[] = [
  { id: 'obras', name: 'Obras e Infraestrutura', iconName: 'Hammer', color: 'bg-blue-600', active: true, managerName: 'Eng. Carlos' },
  { id: 'saude', name: 'Saúde', iconName: 'HeartPulse', color: 'bg-red-500', active: true, managerName: 'Dra. Ana' },
  { id: 'iluminacao', name: 'Iluminação Pública', iconName: 'Lightbulb', color: 'bg-yellow-500', active: true, managerName: 'Téc. Roberto' },
  { id: 'transito', name: 'Trânsito e Transporte', iconName: 'TrafficCone', color: 'bg-orange-500', active: true, managerName: 'Agente Silva' },
  { id: 'meio_ambiente', name: 'Meio Ambiente', iconName: 'Leaf', color: 'bg-green-600', active: true, managerName: 'Biol. Fernanda' },
  { id: 'fiscalizacao', name: 'Fiscalização', iconName: 'ShieldAlert', color: 'bg-slate-700', active: true, managerName: 'Inspetor Marcos' },
];

export const SERVICES: ServiceOption[] = [
  // Obras
  { id: 'obr_buraco', name: 'Buraco na Via', sectorId: 'obras', description: 'Informar buracos em ruas pavimentadas.' },
  { id: 'obr_ponte', name: 'Manutenção de Ponte', sectorId: 'obras', description: 'Ponte quebrada ou estrutura comprometida.' },
  { id: 'obr_escoria', name: 'Solicitar Escória/Cascalho', sectorId: 'obras', description: 'Melhoria em estradas de terra.' },
  
  // Saude
  { id: 'sau_dengue', name: 'Foco de Dengue', sectorId: 'saude', description: 'Denunciar água parada ou foco de mosquito.' },
  { id: 'sau_medicamento', name: 'Falta de Medicamento', sectorId: 'saude', description: 'Informar falta de remédio no posto.' },

  // Iluminacao
  { id: 'lum_queimada', name: 'Lâmpada Queimada', sectorId: 'iluminacao', description: 'Poste com luz apagada à noite.' },
  { id: 'lum_acesa', name: 'Lâmpada Acesa de Dia', sectorId: 'iluminacao', description: 'Desperdício de energia.' },

  // Transito
  { id: 'tra_sinalizacao', name: 'Placa Danificada', sectorId: 'transito', description: 'Placas de pare ou sinalização caídas.' },
  { id: 'tra_estacionamento', name: 'Estacionamento Irregular', sectorId: 'transito', description: 'Veículo bloqueando passagem.' },

  // Meio Ambiente
  { id: 'amb_arvore', name: 'Poda de Árvore', sectorId: 'meio_ambiente', description: 'Árvore em risco de queda ou atrapalhando a fiação.' },
  { id: 'amb_lixo', name: 'Descarte Irregular de Lixo', sectorId: 'meio_ambiente', description: 'Lixo jogado em terreno baldio.' },

  // Fiscalizacao
  { id: 'fis_obra', name: 'Obra Irregular', sectorId: 'fiscalizacao', description: 'Construção sem alvará ou invadindo calçada.' },
  { id: 'fis_som', name: 'Poluição Sonora', sectorId: 'fiscalizacao', description: 'Barulho excessivo fora do horário permitido.' },
];