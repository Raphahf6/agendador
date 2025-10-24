// frontend/src/pages/painel/VisaoGeral.jsx
import React from 'react';
import { Card } from '@/ui/card'; // Reutilizando o componente Card do shadcn/ui

function VisaoGeral() {
  // Por enquanto, esta página é apenas um placeholder.
  // No futuro, podemos adicionar estatísticas (total de agendamentos, etc.)
  return (
    <div>
      {/* Título da Página (o PainelLayout já tem um título, 
          mas podemos adicionar um sub-título aqui se quisermos) */}
      
      <Card className="p-6 bg-white shadow border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Visão Geral
        </h2>
        <p className="text-gray-600">
          Bem-vindo ao seu painel Horalis! Esta é a sua página de Visão Geral.
        </p>
        <p className="text-gray-600 mt-2">
          No futuro, esta tela mostrará estatísticas rápidas, como:
        </p>
        <ul className="list-disc list-inside text-gray-600 mt-2 pl-4">
          <li>Total de agendamentos hoje</li>
          <li>Próximos horários</li>
          <li>Serviços mais procurados</li>
        </ul>
      </Card>
    </div>
  );
}

export default VisaoGeral;