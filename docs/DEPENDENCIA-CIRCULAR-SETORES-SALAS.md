# Dependência circular entre setores e salas

Durante a migração para NestJS, a aplicação passou a falhar na inicialização por causa de um
ciclo de dependências entre `SectionsService` e `RoomsService`. Os testes passavam.

Este documento registra o diagnóstico e a correção, porque o erro tem uma característica que
o torna fácil de reintroduzir: ele não aparece de forma consistente, e a solução mais óbvia
oferecida pelo próprio framework esconde o problema em vez de resolvê-lo.

---

## O ciclo

Ele não nasceu de um descuido. Nasceu de duas regras de negócio legítimas que apontam em
sentidos opostos:

- Ao **criar uma sala**, é preciso validar que o setor informado existe e está ativo. Logo,
  `RoomsService` precisava de setores.
- Ao **excluir um setor** (soft delete), é preciso cascatear a inativação para as salas
  daquele setor. Logo, `SectionsService` precisava de salas.

Na primeira versão, cada serviço injetava o **serviço** do outro:

```
RoomsService ──▶ SectionsService ──▶ RoomsService
```

Um ciclo fechado.

---

## Por que isso quebra

O NestJS descobre o que injetar lendo os tipos declarados no construtor. Esses tipos não
existem em tempo de execução no TypeScript, então o compilador os grava como metadados
(`design:paramtypes`) no momento em que o módulo é avaliado.

Com uma importação circular, um dos dois arquivos inevitavelmente é avaliado antes de o outro
terminar de carregar. Nesse instante, a classe do outro ainda vale `undefined`, e o metadado é
gravado apontando para nada.

O sintoma foi este, ao subir a aplicação:

```
Nest can't resolve dependencies of the RoomsService (?, SectionsService)
```

O `?` na primeira posição é justamente o `undefined` que ficou gravado no metadado.

---

## Por que os testes não pegaram

Se o ciclo explode ou não depende de duas coisas: a ordem em que os módulos são avaliados e a
forma como cada ferramenta emite os metadados de decorator.

A suíte roda sob Vitest com SWC, e ali a ordem calhou de resolver. O servidor de
desenvolvimento rodava sob `tsx`/esbuild, e ali não.

Esse é o ponto mais importante do documento: um ciclo assim **não é "às vezes um bug"**. Ele é
sempre um defeito latente, que apenas espera uma mudança na ordem de avaliação para se
manifestar. Trocar de bundler, reordenar um import ou acrescentar um módulo novo pode acordá-lo
— e um verde na CI não é evidência de que ele não existe.

---

## A saída fácil que não foi usada

O NestJS oferece `forwardRef()`, que adia a resolução da dependência para depois de tudo estar
carregado. Funciona, e teria feito a aplicação subir.

Mas trata o sintoma. O ciclo continuaria no desenho, e o sistema ficaria com dois serviços
capazes de se chamar mutuamente em cadeia — com o risco de recursão indireta entre regras de
negócio que isso implica.

---

## A correção

A pergunta que destravou o problema foi: *o que cada serviço realmente precisa do outro?* Nos
dois casos a resposta era **acesso a dados**, não regra de negócio:

- `RoomsService` só quer saber "existe um setor ativo com este id?" — uma consulta.
- `SectionsService` só quer "inative as salas deste setor" — uma escrita.

Nenhum dos dois precisava da lógica de negócio do outro. Então cada serviço passou a depender
do **repositório** do outro, e não do serviço:

```ts
// src/rooms/rooms.service.ts
constructor(
  private readonly repository: RoomsRepository,
  private readonly sections: SectionsRepository,
) {}
```

```ts
// src/sections/sections.service.ts
constructor(
  private readonly repository: SectionsRepository,
  private readonly rooms: RoomsRepository,
) {}
```

Isso desfaz o ciclo porque **repositórios não dependem uns dos outros**: todos dependem apenas
da conexão com o Mongo. O grafo deixa de ter volta:

```
SectionsService ─┐
                 ├─▶ SectionsRepository ─┐
RoomsService ────┤                       ├─▶ MongoDB
                 └─▶ RoomsRepository ────┘
```

Além de resolver o carregamento, o desenho ficou melhor: cada serviço permanece o dono
exclusivo das suas regras, e não há como uma regra de negócio disparar outra sem querer.

---

## Sobre o `forwardRef` que permaneceu

Os dois `@Module` ainda usam `forwardRef`, e isso está **correto**:

```ts
@Module({
  imports: [forwardRef(() => SectionsModule)],
  // ...
})
export class RoomsModule {}
```

Os módulos de fato se referenciam, porque cada um precisa enxergar o repositório exportado pelo
outro. Nesse nível, `forwardRef` é a ferramenta apropriada, e não um remendo.

O que foi eliminado foi o ciclo no **nível da injeção**, que era a causa real do `undefined`.
São dois problemas distintos que se parecem, e vale não confundi-los: ciclo entre módulos é
normal e resolvido com `forwardRef`; ciclo entre providers é um sinal de que as
responsabilidades estão no lugar errado.

---

## Regra prática

Antes de alcançar o `forwardRef` para resolver um erro de dependência, pergunte se o que o
serviço precisa do outro é **regra de negócio** ou **dado**.

Se for dado — e costuma ser —, dependa do repositório. O ciclo desaparece em vez de ser adiado.
