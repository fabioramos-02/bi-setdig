import unittest
from run import run_matomo_10_mais_acessados_ano, run_matomo_10_mais_acessados_no_mes

class TestMaisAcessadosAno(unittest.TestCase):
    def test_run_matomo_10_mais_acessados_ano(self):
        resultado = run_matomo_10_mais_acessados_ano()
        self.assertLessEqual(len(resultado),10)


class TesteMaisAcessadosMes(unittest.TestCase):
    def test_run_matomo_10_mais_acessados_mes(self):
        resultado = run_matomo_10_mais_acessados_no_mes()
        for i in resultado:
            print(i)
        self.assertLessEqual(len(resultado),10)


if __name__ == '__main__':
    unittest.main()