
import React, { useState, useEffect } from 'react';
import { ServiceOption, ReportFormData, AIAnalysisResult } from '../types';
import { MapPin, Camera, Send, Loader2, AlertTriangle, X, BrainCircuit, Lock, Navigation, Map, RefreshCcw, ArrowLeft } from 'lucide-react';
import { analyzeReport } from '../services/geminiService';

interface ServiceFormProps {
  service: ServiceOption;
  onBack: () => void;
  onSubmit: (data: ReportFormData, aiResult: AIAnalysisResult | null) => void;
  initialData?: Partial<ReportFormData>; // Prop para preenchimento automático
  readOnlyUserFields?: boolean; // Bloqueia edição de nome/telefone (para funcionários)
}

export const ServiceForm: React.FC<ServiceFormProps> = ({ service, onBack, onSubmit, initialData, readOnlyUserFields = false }) => {
  const [formData, setFormData] = useState<ReportFormData>({
    name: '',
    phone: '',
    description: '',
    location: { lat: null, lng: null, address: '' },
    files: []
  });

  // Novo estado para controlar o tipo de entrada de localização
  const [locationType, setLocationType] = useState<'GPS' | 'MANUAL' | null>(null);
  
  // Estado para campos manuais
  const [manualAddress, setManualAddress] = useState({
    rua: '',
    bairro: '',
    referencia: ''
  });

  const [isLocating, setIsLocating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  // Aplica dados iniciais quando fornecidos
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        location: initialData.location ? { ...prev.location, ...initialData.location } : prev.location
      }));
      
      // Se já vier com lat/lng, assume GPS, senão assume null (para forçar escolha) ou manual se tiver endereço
      if (initialData.location?.lat) {
        setLocationType('GPS');
      } else if (initialData.location?.address) {
        // Se tem endereço mas não lat/lng, assumimos manual mas não preenchemos os campos quebrados
        // pois o initialData vem como string única
        setLocationType('MANUAL');
      }
    }
  }, [initialData]);

  // Atualiza o formData.address quando os campos manuais mudam
  useEffect(() => {
    if (locationType === 'MANUAL') {
      const fullAddress = `${manualAddress.rua ? manualAddress.rua : 'Rua não inf.'}, ${manualAddress.bairro ? manualAddress.bairro : 'Bairro não inf.'} - Ref: ${manualAddress.referencia}`;
      
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          lat: null, // Limpa GPS se mudar para manual
          lng: null,
          address: (manualAddress.rua || manualAddress.bairro) ? fullAddress : ''
        }
      }));
    }
  }, [manualAddress, locationType]);

  const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length > 10) {
      return v.replace(/^(\d{2})(\d{1})(\d{4})(\d{4}).*/, '($1) $2 $3-$4');
    } else if (v.length > 5) {
      return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (v.length > 2) {
      return v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    }
    return v;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let finalValue = value;
    if (name === 'phone') {
      finalValue = formatPhone(value);
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (name === 'description' && aiResult) setAiResult(null);
  };

  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setManualAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const fetchAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      // Utiliza Nominatim (OpenStreetMap) para geocodificação reversa
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'User-Agent': 'CidadaoConectadoApp/1.0'
        }
      });
      
      if (!response.ok) throw new Error('Erro na API de mapas');
      
      const data = await response.json();
      
      if (data && data.address) {
        const street = data.address.road || '';
        const neighborhood = data.address.suburb || data.address.neighbourhood || '';
        const city = data.address.city || data.address.town || data.address.village || '';
        const number = data.address.house_number ? `, ${data.address.house_number}` : '';
        
        let formattedAddress = '';
        if (street) formattedAddress += street;
        if (number) formattedAddress += number;
        if (street && neighborhood) formattedAddress += ' - ';
        if (neighborhood) formattedAddress += neighborhood;
        if (city) formattedAddress += ` (${city})`;

        return formattedAddress || `Localização Detectada: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
    }
    return `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Endereço não identificado)`;
  };

  const getLocation = () => {
    setIsLocating(true);
    
    if (!("geolocation" in navigator)) {
      alert("Geolocalização não suportada neste navegador.");
      setIsLocating(false);
      return;
    }

    // Configuração para alta precisão (GPS/Wi-Fi/Rede)
    const options = {
      enableHighAccuracy: true,
      timeout: 20000, // Aumentado para 20s para permitir melhor triangulação
      maximumAge: 0
    };

    setFormData(prev => ({
      ...prev,
      location: { ...prev.location, address: 'Aguardando sinal de GPS de alta precisão...' }
    }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setFormData(prev => ({
          ...prev,
          location: { lat, lng, address: 'Identificando endereço...' }
        }));

        // Busca o endereço legível
        const address = await fetchAddressFromCoordinates(lat, lng);

        setFormData(prev => ({
          ...prev,
          location: {
            lat: lat,
            lng: lng,
            address: address
          }
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Não foi possível obter sua localização.";
        switch(error.code) {
          case 1: errorMessage = "Permissão de localização negada."; break;
          case 2: errorMessage = "Sinal de GPS indisponível. Tente ir para uma área aberta."; break;
          case 3: errorMessage = "O tempo para obter o GPS expirou. Tente novamente."; break;
        }
        
        setFormData(prev => ({
            ...prev,
            location: { ...prev.location, address: '' }
        }));
        
        alert(errorMessage);
        setIsLocating(false);
      },
      options
    );
  };

  const handleAnalyze = async () => {
    if (formData.description.length < 10) {
      alert("Por favor, digite uma descrição mais detalhada antes de analisar.");
      return;
    }
    setIsAnalyzing(true);
    const result = await analyzeReport(formData.description, service.name);
    setAiResult(result);
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      alert("Preencha nome e descrição.");
      return;
    }
    
    // Validação de Endereço
    if (locationType === 'MANUAL') {
      if (!manualAddress.rua || !manualAddress.bairro) {
        alert("Preencha Rua e Bairro.");
        return;
      }
    } else if (locationType === 'GPS' && !formData.location.lat) {
       alert("Por favor, clique no botão para capturar sua localização GPS.");
       return;
    }

    onSubmit(formData, aiResult);
  };

  const resetLocationMode = () => {
    setLocationType(null);
    setFormData(prev => ({ ...prev, location: { lat: null, lng: null, address: '' } }));
    setManualAddress({ rua: '', bairro: '', referencia: '' });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 animate-fade-in">
      <button 
        onClick={onBack} 
        className="group flex items-center gap-2 px-5 py-2.5 mb-6 text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 hover:text-blue-600 transition-all duration-200 font-medium"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Voltar
      </button>
      
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-blue-50 p-6 border-b border-blue-100">
          <h2 className="text-2xl font-bold text-gray-800">{service.name}</h2>
          <p className="text-gray-600 mt-1">{service.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu Nome *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  required
                  readOnly={readOnlyUserFields}
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg outline-none transition 
                    ${readOnlyUserFields 
                      ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed pr-10' 
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                  placeholder="Ex: João da Silva"
                />
                {readOnlyUserFields && (
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                )}
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone/WhatsApp
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  readOnly={readOnlyUserFields}
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg outline-none transition 
                    ${readOnlyUserFields 
                      ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed pr-10' 
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                  placeholder="(00) 0 0000-0000"
                />
                {readOnlyUserFields && (
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                )}
              </div>
            </div>
          </div>

          {/* Location Section Revised */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Localização da Ocorrência *</label>
              {locationType && (
                <button 
                  type="button" 
                  onClick={resetLocationMode}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCcw size={12} /> Alterar modo
                </button>
              )}
            </div>

            {!locationType ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div 
                   onClick={() => setLocationType('GPS')}
                   className="border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-6 cursor-pointer transition-all group flex flex-col items-center text-center"
                 >
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <MapPin size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">Estou no local</h3>
                    <p className="text-xs text-gray-500">Usar GPS (Alta Precisão) para registrar endereço exato.</p>
                 </div>

                 <div 
                   onClick={() => setLocationType('MANUAL')}
                   className="border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 rounded-xl p-6 cursor-pointer transition-all group flex flex-col items-center text-center"
                 >
                    <div className="bg-orange-100 text-orange-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <Map size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">Outro Local</h3>
                    <p className="text-xs text-gray-500">Digitar o endereço (Bairro, Rua) manualmente.</p>
                 </div>
              </div>
            ) : locationType === 'GPS' ? (
              <div className="animate-fade-in bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    readOnly
                    value={formData.location.address || ''}
                    placeholder="Clique para capturar endereço e coordenadas"
                    className="flex-1 px-4 py-2 bg-white border border-blue-200 rounded-lg text-gray-600 focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={isLocating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-md"
                  >
                    {isLocating ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />}
                    <span className="hidden sm:inline">Capturar GPS</span>
                  </button>
                </div>
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <MapPin size={12} />
                  Sistema integra GPS, Wi-Fi e Rede para máxima precisão.
                </p>
              </div>
            ) : (
              <div className="animate-fade-in bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro *</label>
                      <input
                        type="text"
                        name="bairro"
                        value={manualAddress.bairro}
                        onChange={handleManualAddressChange}
                        className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900"
                        placeholder="Nome do Bairro"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua / Avenida *</label>
                      <input
                        type="text"
                        name="rua"
                        value={manualAddress.rua}
                        onChange={handleManualAddressChange}
                        className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900"
                        placeholder="Nome da Rua"
                      />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ponto de Referência</label>
                    <input
                      type="text"
                      name="referencia"
                      value={manualAddress.referencia}
                      onChange={handleManualAddressChange}
                      className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900"
                      placeholder="Ex: Próximo ao mercado..."
                    />
                 </div>
              </div>
            )}
          </div>

          {/* Description & AI */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-gray-700">Descrição do Problema *</label>
              {!aiResult && formData.description.length > 10 && (
                <button 
                  type="button" 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="text-xs font-semibold text-purple-600 flex items-center gap-1 hover:bg-purple-50 px-2 py-1 rounded transition"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={12} /> : <BrainCircuit size={14} />}
                  Analisar com IA
                </button>
              )}
            </div>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
              placeholder="Descreva detalhadamente a situação..."
            ></textarea>
            
            {/* AI Feedback */}
            {aiResult && (
              <div className={`mt-3 p-4 rounded-lg border ${aiResult.isClear ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <BrainCircuit size={16} className="text-purple-600" />
                  Análise Inteligente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Resumo Sugerido</span>
                    <span className="font-medium text-gray-800">{aiResult.summary}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Nível de Urgência Estimado</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-1
                      ${aiResult.urgency === 'Alta' ? 'bg-red-100 text-red-700' : 
                        aiResult.urgency === 'Média' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'}`}>
                      {aiResult.urgency.toUpperCase()}
                    </span>
                  </div>
                </div>
                {!aiResult.isClear && (
                   <p className="text-amber-700 text-xs mt-2 flex items-center gap-1">
                     <AlertTriangle size={12} /> A descrição parece confusa. Considere adicionar mais detalhes.
                   </p>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fotos ou Documentos</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/*,.pdf"
              />
              <div className="flex flex-col items-center pointer-events-none">
                <Camera className="text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-600 font-medium">Toque para adicionar fotos</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG (Max 5MB)</p>
              </div>
            </div>
            
            {formData.files.length > 0 && (
              <div className="mt-4 space-y-2">
                {formData.files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                    <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-red-500 hover:bg-red-100 p-1 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Send size={20} />
            Enviar Solicitação
          </button>
        </form>
      </div>
    </div>
  );
};
