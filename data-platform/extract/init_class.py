from typing import Dict
from typing import TypedDict
class CartaAcessoPy(TypedDict):
    slug: str
    orgaoSigla: str
    urlExterno: str
    meses: Dict[str, int]
    total_de_cliques: int

class AcessosServicoMensalPy(TypedDict):
    ano: int
    geradoEm: str
    cartas: list[CartaAcessoPy]
    