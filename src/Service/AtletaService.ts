export default class AtletaService {
    async listarAtletas() {
        return [];
    }

    async cadastrarAtleta(nome: string, equipe: string) {
        return {
            nome,
            equipe
        };
    }
}
