package br.ufs.coffee_rep_gds_backend.integration.support;

/**
 * CPFs válidos e exclusivos por cenário de integração.
 * <p>
 * Os testes de integração compartilham um único PostgreSQL (Testcontainers estático);
 * reutilizar o mesmo CPF entre classes faz o create retornar 400 (CPF já cadastrado).
 */
public final class IntegrationTestCpfs {

    public static final String REQUESTER_CRUD = "90640279007";

    public static final String RESERVATION_FLOW = "39053344705";

    public static final String ABSENCE_BLOCKS_RESERVATION = "11144477735";

    public static final String ABSENCE_CRUD = "52998224725";

    private IntegrationTestCpfs() {
    }
}
