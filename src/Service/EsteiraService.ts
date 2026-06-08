import { EsteiraDB, EsteiraRepository } from '../Repository/EsteiraRepository';

export class EsteiraService {

  private esteiraRepository = new EsteiraRepository();

  async listar(): Promise<EsteiraDB[]> {
    return this.esteiraRepository.listar();
  }

  async buscarPorModelo(modelo: string): Promise<EsteiraDB | null> {
    return this.esteiraRepository.buscarPorModelo(modelo);
  }
}
