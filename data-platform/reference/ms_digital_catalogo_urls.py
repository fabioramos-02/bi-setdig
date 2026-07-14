"""URL real por serviço do app MS Digital — referência estática pra enriquecer
o catálogo publicado (`build_catalogo.py`), que só tem categoria/serviço/tipo/
ativo (sem URL — a planilha `Total de serviços do app.xlsx` não tem essa
coluna).

Portado (cópia, não link vivo) de
C:\\Users\\framos\\Documents\\SETDIG\\2026\\Projetos\\bench-carta\\src\\ms_digital_catalog.py
em 2026-07-14 — repo irmão (pesquisa/bench), catálogo próprio transcrito da
relação oficial de categorias/serviços do app + validado contra dump do GA4.
Cópia proposital: mudança num repo não afeta o outro (bench-carta não é
pipeline mantido, é ferramenta de estudo pontual).

`ga4` = rótulo exato do GA4 quando difere do `nome` (ajuda o match quando o
nome na planilha do bi-setdig também diverge de ambos).
"""
from __future__ import annotations


def _n(nome: str, ga4: str | None = None) -> dict:
    """Serviço nativo (tela do app, sem URL)."""
    return {"nome": nome, "tipo": "nativo", "url": None, "ga4": ga4}


def _r(nome: str, url: str, ga4: str | None = None) -> dict:
    """Serviço redirecionado (abre navegador, tem URL)."""
    return {"nome": nome, "tipo": "redirect", "url": url, "ga4": ga4}


CATALOGO: dict[str, dict] = {
    "MS.gov": {
        "icon": "public",
        "ga4": "MS.gov",
        "servicos": [_r("MS.gov", "https://www.ms.gov.br/", ga4="MS.gov")],
    },
    "Agronegócio": {
        "icon": "agriculture",
        "ga4": "Agronegócio",
        "servicos": [
            _r("Agrotóxico", "https://www.servicos.iagro.ms.gov.br/agrotoxico"),
            _r("Animal Identificado", "https://www.servicos.iagro.ms.gov.br/animalIdentificado"),
            _r("Cadastro de Plantio", "https://www.servicos.iagro.ms.gov.br/plantio"),
            _r("Cadastro de Produtor", "https://www.servicos.iagro.ms.gov.br/cadastroFicha"),
            _r("Documento de Trânsito", "https://www.servicos.iagro.ms.gov.br/gta"),
            _r("e-CIS-E", "https://www.servicos.iagro.ms.gov.br/ecise"),
            _r("Estabelecimentos", "https://www.servicos.iagro.ms.gov.br/estabelecimento"),
            _r("Eventos", "https://www.servicos.iagro.ms.gov.br/eventos"),
            _r("Ferrugem de Soja", "https://www.servicos.iagro.ms.gov.br/ferrugemSoja", ga4="Ferrugem da Soja"),
            _r("Ficha Sanitária", "https://www.servicos.iagro.ms.gov.br/ficha"),
            _r("Laboratório", "https://www.servicos.iagro.ms.gov.br/laboratorio"),
            _r("Laudo Exame", "https://www.servicos.iagro.ms.gov.br/exame"),
            _r("MANUCÃ", "https://manuca.semagro.ms.gov.br/"),
            _r("Mapa das Notificações de Ferrugem", "https://www.servicos.iagro.ms.gov.br/mapaFerrugemSoja"),
            _r("Núcleo", "https://www.servicos.iagro.ms.gov.br/nucleo"),
            _r("Produto", "https://www.servicos.iagro.ms.gov.br/vacinas"),
            _r("Profissional", "https://www.servicos.iagro.ms.gov.br/colaboradores"),
            _r("PTV", "https://www.servicos.iagro.ms.gov.br/ptv"),
        ],
    },
    "Trânsito": {
        "icon": "directions_car",
        "ga4": "Trânsito",
        "servicos": [
            _n("Consultar Pontuação", ga4="Pontuaçao CNH"),
            _n("Multas"),
            _n("Débito de Veículos"),
            _r("Baixar CRLV", "https://www.meudetran.ms.gov.br/principal-portal/principal-portal.php?opcao_menu_ssn=BAIXAR_CRLV"),
            _r("Exames", "https://www2.detran.ms.gov.br/detranet/pserv/habilitacao/consExames/index.asp"),
            _r("IPVA", "https://www.autoatendimento.ms.gov.br/suporte-tecnico-ipva/"),
            _r("Licenciamento e Multas", "https://www.meudetran.ms.gov.br/"),
            _r("B.O. Sem Vítimas", "https://boat.sigo.ms.gov.br/#/"),
            _r("Agendamento", "https://www.meudetran.ms.gov.br/"),
            _r("Educação", "https://www.meudetran.ms.gov.br/"),
            _r("Outros", "https://www.meudetran.ms.gov.br/"),
        ],
    },
    "Procon - MS": {
        "icon": "gavel",
        "ga4": "Procon - MS",
        "servicos": [
            _r("Reclamação On-line", "https://portalservicos.procon.ms.gov.br/reclamacao"),
            _r("Denúncia", "https://portalservicos.procon.ms.gov.br/denuncia"),
            _r("Consulta de Processos", "https://portalservicos.procon.ms.gov.br/consulta"),
            _r("Boletins", "https://www.procon.ms.gov.br/informativos/boletins/"),
            _r("Fale Conosco", "https://portalservicos.procon.ms.gov.br/duvidas"),
            _r("Procons Municipais", "https://www.procon.ms.gov.br/fale-conosco/unidades/unidades-regionais/"),
        ],
    },
    "Transparência": {
        "icon": "visibility",
        "ga4": "Transparência",
        "servicos": [
            _n("Servidores"),
            _n("Diárias"),
            _n("Passagens"),
            _n("Simplificada"),
            _n("Consolidada"),
            _n("Pesquisa da Receita", ga4="Pesquisa de Receita"),
            _n("Despesa"),
            _n("Detran - Destinação de Multas"),
            _r("Carta de Serviço", "https://www.ms.gov.br/"),
            _r("LGPD", "https://www.lgpd.ms.gov.br/"),
        ],
    },
    "Segurança": {
        "icon": "security",
        "ga4": "Segurança",
        "servicos": [
            _n("Delegacias e Endereços"),
            _r("Antecedentes Criminais", "https://antecedentes.sejusp.ms.gov.br/"),
            _r("Agendamento de RG", "https://antecedentes.sejusp.ms.gov.br/"),
            _r("B.O. Online", "https://servicos.sejusp.ms.gov.br/"),
            _r("Delegacia Virtual", "https://devir.pc.ms.gov.br/#/"),
            _r("Certificado de Vistoria", "https://sistemas.bombeiros.ms.gov.br/"),
            _r("Sistema Previnir", "https://prevenir.bombeiros.ms.gov.br/welcome", ga4="Sistema Prevenir"),
            _r("Legislação de Prevenção", "https://sistemas.bombeiros.ms.gov.br/arquivos/index.xhtml", ga4="Legislações de Prevenção"),
            _r("Regularização", "https://prevenir.bombeiros.ms.gov.br/"),
            _r("Profissionais e Empresas", "https://sistemas.bombeiros.ms.gov.br/profissionais-cadastrados.xhtml"),
            _r("PSCIP", "https://sistemas.bombeiros.ms.gov.br/"),
            _r("Certidão de Ocorrência", "https://www.bombeiros.ms.gov.br/certidao/"),
            _r("Outros Assuntos", "https://www.bombeiros.ms.gov.br/"),
        ],
    },
    "Servidor Público": {
        "icon": "badge",
        "ga4": "Servidor Público",
        "servicos": [
            _n("Portal do Servidor"),
            _n("Contracheque"),
            _n("Carteira Funcional"),
            _n("Informe de Rendimentos"),
            _n("Clube de Benefícios"),
            _n("Servidores"),
            _r("Lista de Eventos", "https://www.ms.gov.br/", ga4="Lista de Eventos"),
            _n("Relatório de Diárias"),
        ],
    },
    "Meio Ambiente": {
        "icon": "eco",
        "ga4": "Meio Ambiente",
        "servicos": [
            _n("Registrar Notificação"),
            _n("Notificações Pendentes"),
            _n("Licenciamento Ambiental"),
            _n("Previsão Semanal"),
            _n("Autorização de Pesca Digital (Carteira)"),
            _r("Autorização de Pesca (Solicitação)", "https://www.pescaamadora.imasul.ms.gov.br/#/login"),
        ],
    },
    "Mulher MS": {
        "icon": "woman",
        "ga4": "Mulher MS",
        "servicos": [
            _n("Delegacia da Mulher", ga4="Delegacias da Mulher"),
            _n("Combate à Violência"),
            _r("Não se Cale", "https://www.naosecale.ms.gov.br/"),
            _r("Denúncias Online", "https://devir.pc.ms.gov.br/#/denuncia"),
            _r("Protetivas Online", "https://sistemas.tjms.jus.br/medidaProtetiva/"),
        ],
    },
    "Saúde": {
        "icon": "local_hospital",
        "ga4": "Saúde",
        "servicos": [
            _n("Cartão de Vacinação"),
            _n("Cartão SUS Online"),
            _n("Cartão do Doador de Sangue"),
            _n("Resultado de Exames Hemosul"),
            _n("Estabelecimentos de Saúde"),
            _n("Medicamentos"),
            _r("Exames LACEN", "https://lacendigital.saude.ms.gov.br/"),
            _r("Painel de Brucelose de MS", "https://paineispublicos.saude.ms.gov.br/extensions/brucelose/brucelose.html"),
            _r("Estoque de Sangue - Hemosul", "https://paineispublicos.saude.ms.gov.br/extensions/EstoqueHemosul/EstoqueHemosul.html"),
            _r("Estoque de Medicamentos Especializado", "https://bi.saude.ms.gov.br/public/dashboard/82f5760c-6b6b-42fc-a212-1c3570ad330a", ga4="Estoque de Medicamento Especializado"),
            _r("Emissão de Certificados de Eventos da SES", "https://servicos.saude.ms.gov.br/certificados"),
        ],
    },
    "AGEMS": {
        "icon": "bolt",
        "ga4": "AGEMS",
        "servicos": [
            _r("WhatsApp", "https://www.agems.ms.gov.br/"),
            _r("e-Ouvidoria", "https://ouvidoria.agepan.ms.gov.br/"),
            _r("Horários e Tarifas", "https://www.sgltar.ms.gov.br/publica/consulta/pesquisaviagens"),
        ],
    },
    "Diário Oficial": {
        "icon": "newspaper",
        "ga4": "Diário Oficial",
        "servicos": [_r("Diário Oficial", "https://www.diariooficial.ms.gov.br/", ga4="Diário Oficial")],
    },
    "Turismo": {
        "icon": "travel_explore",
        "ga4": "Turismo",
        "servicos": [
            _r("VisitMS", "https://www.visitms.com.br/"),
            _r("Observatório de Turismo", "https://www.turismo.ms.gov.br/"),
            _r("Turismo", "https://www.turismo.ms.gov.br/"),
        ],
    },
    "Entretenimento": {
        "icon": "live_tv",
        "ga4": "Entretenimento",
        "servicos": [
            _n("TV Educativa MS - Canal 4.1"),
            _n("Rádio Educativa MS - FM 104.7"),
        ],
    },
    "Educação": {
        "icon": "school",
        "ga4": "Educação",
        "servicos": [
            _n("Consultar CDIEMS"),
            _n("Solicitar CDIEMS"),
            _r("Painel do Aluno", "https://www.sed.ms.gov.br/"),
            _r("Caminho Certo", "https://www.caminhocerto.ms.gov.br/"),
        ],
    },
    "Nota MS Premiada": {
        "icon": "confirmation_number",
        "ga4": "Nota MS Premiada",
        "servicos": [_r("Nota MS Premiada", "https://www.notamspremiada.ms.gov.br/", ga4="Nota MS Premiada")],
    },
    "Habitação": {
        "icon": "home",
        "ga4": "Habitação",
        "servicos": [
            _r("Boleto habitacional", "https://habix.agehab.ms.gov.br/administracao/BoletoOnline", ga4="Boleto habitacional"),
        ],
    },
    "Cultura e Esporte": {
        "icon": "sports_soccer",
        "ga4": "Cultura e Esporte",
        "servicos": [
            _n("Carteira de Identificação Desportiva"),
            _n("LeiaMS"),
        ],
    },
    "Assistência Social": {
        "icon": "groups",
        "ga4": "Assistência Social",
        "servicos": [
            _n("Passe Livre Intermunicipal"),
            _n("Endereço dos CRAS", ga4="Endereços dos CRAS"),
            _r("MS Supera", "https://www.mssupera.ms.gov.br/"),
            _r("CIPTEA", "https://ciptea.ms.gov.br/"),
        ],
    },
    "Trabalho e Qualificação": {
        "icon": "work",
        "ga4": "Trabalho e Qualificação",
        "servicos": [_r("MS Qualifica", "https://www.msqualifica.ms.gov.br/")],
    },
}
