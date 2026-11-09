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
    description: 'Identifique uma entidade ou coletivo que trabalhe com públicos em vulnerabilidade social, faça contato e inicie uma relação real. A Papelito e a Capital, por si só, não comprovam esse requisito.',
    proof: 'Declaração de Responsabilidade para a entidade e registro do contato real',
  },
  {
    title: 'Ação educativa com troca de saberes',
    description: 'Construa o Projeto de Ação Comunitária em comum acordo com as lideranças da entidade. A ação pode incluir oficina, formação ou educação ambiental, desde que responda à necessidade identificada.',
    proof: 'Projeto de Ação Comunitária, Carta de Aceite, material da ação e comprovação de participação',
  },
  {
    title: 'Validação do benefício',
    description: 'Compare as necessidades identificadas com a experiência após a ação, registrando feedback real para o Relatório Final e o depoimento reflexivo do estudante.',
    proof: 'Relatório Final, lista de frequência e depoimento pessoal escrito, em áudio ou vídeo',
  },
];

const deliveries = [
  ['Declaração de responsabilidade', 'Documento da atividade, conforme modelo acadêmico'],
  ['Projeto e carta de aceite', 'Aceite da instituição/parceiro e escopo validado'],
  ['Lista de frequência', 'Presença na ação comunitária, conforme modelo acadêmico'],
  ['Relatório final', 'Diagnóstico, ação realizada, resultados e limitações'],
  ['Depoimento pessoal', 'Texto, vídeo ou áudio com reflexões autênticas do estudante'],
];

export default function ExtensionPage() {
  return (
    <div className="pc-extension">
      <PageHeader eyebrow="Projeto acadêmico" title="Extensão & impacto" description="Critérios da disciplina Extensão: Cooperação, Humanismo Solidário e Redes e Comunidades (UCB). As entregas exigem ações reais, aceite e comprovações." />
      <div className="pc-extension-intro">
        <span className="pc-eyebrow" style={{color:'#fcd930'}}>PAPELITO CIRCULAR · EXTENSÃO UNIVERSITÁRIA</span>
        <h2 className="mt-3">A tecnologia é o meio.<br/>A comunidade é parte do propósito.</h2>
        <p>Um aplicativo para melhorar o processo industrial não comprova, sozinho, a atividade comunitária exigida pela disciplina. É necessário contato real com entidade ou coletivo que atenda públicos em vulnerabilidade social, projeto construído com suas lideranças e execução documentada.</p>
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
          <p>O plano de ensino exige a busca de uma entidade ou coletivo que atue em projetos voltados a pessoas em situação de vulnerabilidade social. Uma cooperativa ou associação de catadores interessada é uma possibilidade, não uma parceria já confirmada.</p>
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
          <p>O plano exige comunidade vulnerável e documentos específicos. Confirme no AVA os modelos e prazos: a disciplina informa que trabalhos fora do prazo não são considerados.</p></div>
      </div>
    </div>
  );
}
