import { ArrowRight, ClipboardCheck, FileCheck2, Handshake, School, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import './real.css';

const checklist = [
  {
    title: 'Diagnóstico de necessidade real',
    description: 'Converse com quem utiliza ou será beneficiado pela solução. Registre o problema, a situação atual, quem é afetado e quais resultados são úteis.',
    proof: 'Registro de escuta, formulário ou reunião com data e autorização',
  },
  {
    title: 'Comunidade externa elegível',
    description: 'Confirme com a faculdade uma entidade ou coletivo que realmente atenda públicos em vulnerabilidade. A Papelito e a Capital, por si só, não comprovam esse requisito.',
    proof: 'Confirmação do professor e identificação autorizada do parceiro',
  },
  {
    title: 'Ação educativa com troca de saberes',
    description: 'Planeje oficina, formação digital ou educação ambiental com participação ativa da comunidade; faça escuta inicial e incorpore sugestões.',
    proof: 'Plano da atividade, registro de execução, material didático e devolutiva',
  },
  {
    title: 'Validação do benefício',
    description: 'Compare as necessidades identificadas com a experiência depois da ação. Registre melhorias, limitações e feedback real dos participantes.',
    proof: 'Questionário pós-atividade, relato de participantes e ajustes realizados',
  },
];

const deliveries = [
  ['Declaração de responsabilidade', 'Documento da atividade, conforme modelo acadêmico'],
  ['Projeto e carta de aceite', 'Aceite da instituição/parceiro e escopo validado'],
  ['Registro de participação', 'Frequência ou comprovantes com autorização de uso'],
  ['Relatório final', 'Diagnóstico, ação realizada, resultados e limitações'],
  ['Depoimento pessoal', 'Aprendizado, envolvimento com a comunidade e reflexão crítica'],
];

export default function ExtensionPage() {
  return (
    <div className="pc-extension">
      <PageHeader eyebrow="Projeto acadêmico" title="Extensão & impacto" description="Organize as exigências acadêmicas e registre, fora do sistema até haver autorização, apenas evidências reais das ações realizadas." />
      <div className="pc-extension-intro">
        <span className="pc-eyebrow" style={{color:'#fcd930'}}>PAPELITO CIRCULAR · EXTENSÃO UNIVERSITÁRIA</span>
        <h2 className="mt-3">A tecnologia é o meio.<br/>A comunidade é parte do propósito.</h2>
        <p>Um aplicativo para melhorar o processo industrial não comprova, sozinho, extensão universitária. É preciso demonstrar uma necessidade real, participação ativa, troca de conhecimentos e contribuição verificável à comunidade externa.</p>
      </div>

      <div className="pc-home-columns">
        <section className="pc-home-panel">
          <span className="pc-eyebrow">FRENTE 01 · INDUSTRIAL</span>
          <h2>Necessidade operacional</h2>
          <p>O sistema pode apoiar a Papelito na rastreabilidade de aparas previstas e perdas evitáveis por máquina, conferência de estoque reciclável e registros de coleta. O impacto real deve ser medido em piloto autorizado pela Elisa.</p>
          <div className="pc-check-step"><span><ClipboardCheck size={17}/></span><div><strong>Diagnóstico com a indústria</strong><small>Aguardando registros efetivos de necessidades e critérios de aceite</small></div></div>
          <div className="pc-check-step"><span><FileCheck2 size={17}/></span><div><strong>Piloto com dados reais</strong><small>Selecionar máquina, material, responsável e período</small></div></div>
          <Link to="/app/cadastros" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline">Ir aos cadastros <ArrowRight size={16}/></Link>
        </section>
        <section className="pc-home-panel">
          <span className="pc-eyebrow">FRENTE 02 · COMUNIDADE</span>
          <h2>Necessidade social</h2>
          <p>Se a disciplina exige atendimento a públicos vulneráveis, será indispensável um parceiro social real e uma atividade útil aos participantes. Uma cooperativa ou associação de catadores interessada é uma possibilidade, não uma parceria já confirmada.</p>
          <div className="pc-check-step"><span><Users size={17}/></span><div><strong>Público e parceiro elegíveis</strong><small>Precisam ser identificados e aceitos pela faculdade</small></div></div>
          <div className="pc-check-step"><span><Handshake size={17}/></span><div><strong>Ação participativa de formação</strong><small>Oficina, escuta, devolutiva e documentação mediante consentimento</small></div></div>
        </section>
      </div>

      <div className="pc-home-headline"><h2>Comprovação da necessidade e da execução</h2><span className="pc-status is-inactive">Planejamento — nada declarado concluído</span></div>
      <div className="pc-extension-grid">
        {checklist.map((item, index) => <article key={item.title} className="pc-extension-item">
          <span className="pc-eyebrow">CRITÉRIO {String(index+1).padStart(2,'0')}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <small><strong>Evidência sugerida:</strong> {item.proof}</small>
        </article>)}
      </div>
      <div className="pc-home-headline"><h2>Documentos de entrega</h2><span className="text-xs text-neutral-600">Confirmar modelos e prazo no AVA</span></div>
      <section className="pc-master-panel">
        {deliveries.map(([title,description],i)=><div className="pc-master-item" key={title}>
          <div className="pc-master-identity">
            <span className="pc-step-number">{String(i+1).padStart(2,'0')}</span>
            <div><strong>{title}</strong><small>{description}</small></div>
          </div>
          <span className="pc-status is-inactive">Não verificado</span>
          <span className="text-xs text-neutral-500">Requer evidência real</span>
        </div>)}
      </section>
      <div className="pc-next-actions mt-6">
        <School size={22}/><div><strong>Antes de declarar a atividade como extensão válida</strong>
          <p>Confirme por escrito com o professor os critérios específicos de público, prazo, horas, documentos e participação comunitária.</p></div>
      </div>
    </div>
  );
}
